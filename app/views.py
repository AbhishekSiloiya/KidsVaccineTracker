from flask import Blueprint, render_template, request, redirect, url_for, Response, session, flash
from datetime import date, datetime, timedelta, timezone
from .models import Child, Vaccination, Parent
from . import db
from .schedule_data import build_schedule_for_child, get_reference_url, get_countries

# Specify the template_folder because the project currently uses 'template' (singular)
# If you later rename the folder to 'templates', you can remove the parameter.
views = Blueprint('views', __name__, template_folder='template')

@views.app_context_processor
def inject_reference_defaults():
    default_country = 'India'
    return {
        'reference_url': get_reference_url(default_country),
        'reference_label': 'Official schedule',
    'current_country': default_country,
    'available_countries': get_countries(),
    }

@views.app_template_filter('friendly_date')
def friendly_date(value):
    """Format a date as 'Weekday, DD/MM/YYYY'. Returns empty string if value falsy."""
    if not value:
        return ''
    # Ensure we have a date object
    if isinstance(value, datetime):
        value = value.date()
    try:
        return value.strftime('%A, %d/%m/%Y')
    except Exception:
        return str(value)

@views.app_template_filter('short_date')
def short_date(value):
    """Format a date as 'DD/MM/YYYY' (no weekday)."""
    if not value:
        return ''
    if isinstance(value, datetime):
        value = value.date()
    try:
        return value.strftime('%d/%m/%Y')
    except Exception:
        return str(value)

@views.app_template_filter('age_text')
def age_text(value):
    """Return human-friendly age text based on DOB: weeks (<1 month), months (<1 year), then years."""
    if not value:
        return ''
    # Normalize to date
    if isinstance(value, datetime):
        value = value.date()
    if not isinstance(value, date):
        return ''
    today = date.today()
    # Guard future dates
    if value > today:
        days_until = (value - today).days
        return f"{days_until} days to due date"

    days = (today - value).days
    # Less than a month -> show weeks (min 1 week to avoid 0)
    if days < 30:
        weeks = max(1, days // 7)
        return f"{weeks} {'week' if weeks == 1 else 'weeks'} old"

    # Less than a year -> show months
    months = (today.year - value.year) * 12 + (today.month - value.month)
    if today.day < value.day:
        months -= 1
    if months < 12:
        months = max(1, months)
        return f"{months} {'month' if months == 1 else 'months'} old"

    # Otherwise show years
    years = today.year - value.year
    if (today.month, today.day) < (value.month, value.day):
        years -= 1
    years = max(0, years)
    return f"{years} {'year' if years == 1 else 'years'} old"

@views.route('/')
def home():
    # Redirect to add_child as the default landing page
    return redirect(url_for('views.add_child'))

def base_template():  # Optional helper
    return render_template('base.html')

def _validate_child_form(name: str, dob_str: str, country: str | None = None):
    errors = []
    if not name or len(name.strip()) < 2:
        errors.append('Child name must be at least 2 characters.')
    if not dob_str:
        errors.append('Date of birth is required.')
    else:
        try:
            dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
            if dob > date.today():
                errors.append('Date of birth cannot be in the future.')
        except ValueError:
            errors.append('Invalid date format.')
    if country and country not in get_countries():
        errors.append('Invalid country selection.')
    return errors

@views.route('/add-child', methods=['GET', 'POST'])
def add_child():
    parent_id = session.get('parent_id')
    form_errors = []
    form_success = None
    form_data = {}
    if request.method == 'POST':
        name = request.form.get('child_name', '').strip()
        dob = request.form.get('dob', '')
        country = request.form.get('country', 'India')
        form_data = {'child_name': name, 'dob': dob, 'country': country}
        form_errors = _validate_child_form(name, dob, country)
        if not form_errors:
            if parent_id:
                # Persist child in DB for logged-in parent
                child = Child(name=name, dob=datetime.strptime(dob, '%Y-%m-%d').date(), parent_id=parent_id, country=country)
                db.session.add(child)
                db.session.commit()
                form_success = 'Child added successfully.'
            else:
                # Guest flow: allow only one child in session; block adding a second
                if session.get('guest_child'):
                    flash('Adding more than one child requires an account. Please register or log in.', 'error')
                    return redirect(url_for('auth.register'))
                session['guest_child'] = {'name': name, 'dob': dob, 'country': country}
                # Redirect to guest child view so they can manage schedule
                return redirect(url_for('views.guest_child_view'))
    else:
        # GET: if guest child exists, prefill and show preview
        if not parent_id and session.get('guest_child'):
            gc = session['guest_child']
            form_data = {'child_name': gc.get('name') or '', 'dob': gc.get('dob') or '', 'country': gc.get('country') or 'India'}
    # Header context
    current_country = form_data.get('country') if form_data else 'India'
    return render_template('add_child.html', form_errors=form_errors, form_success=form_success, form_data=form_data, reference_url=get_reference_url(current_country), reference_label='Official schedule', current_country=current_country)


@views.route('/guest-child')
def guest_child_view():
    guest = session.get('guest_child')
    if not guest:
        flash('Add a temporary child first.', 'info')
        return redirect(url_for('views.add_child'))
    name = guest.get('name') or ''
    dob_str = guest.get('dob') or ''
    try:
        dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
    except Exception:
        flash('Invalid temporary child data. Please add again.', 'error')
        return redirect(url_for('views.add_child'))

    # Build schedule and overlay guest completion state
    entries = build_schedule_for_child(dob, child=None, country=guest.get('country') or 'India')
    completed_map = session.get('guest_child_completed', {}) or {}
    today = date.today()
    due_soon_window = today + timedelta(days=30)
    completed_count = overdue = due_soon = 0
    total_vaccines = 0
    for e in entries:
        total_vaccines += len(e['vaccines'])
        comp_date_str = completed_map.get(e['age'])
        if comp_date_str:
            try:
                comp_date = datetime.strptime(comp_date_str, '%Y-%m-%d').date()
            except Exception:
                comp_date = today
            e['group_completed'] = True
            e['group_completed_date'] = comp_date
            e['status_class'] = 'status-completed'
            e['status_text'] = 'Completed'
            completed_count += len(e['vaccines'])
        else:
            # pending vaccines in this group
            if e['due_date'] <= today:
                overdue += len(e['vaccines'])
            elif today < e['due_date'] <= due_soon_window:
                due_soon += len(e['vaccines'])

    stats = {
        'completed': completed_count,
        'overdue': overdue,
        'due_soon': due_soon,
        'total': total_vaccines,
    }

    class _GuestChild:
        def __init__(self, name, dob, country):
            self.name = name
            self.dob = dob
            self.country = country
            self.id = None

    today_str = today.strftime('%Y-%m-%d')
    country = guest.get('country') or 'India'
    return render_template('child_view.html', child=_GuestChild(name, dob, country), schedule_entries=entries, today_str=today_str, stats=stats, guest_mode=True, reference_url=get_reference_url(country), reference_label='Official schedule', current_country=country)


@views.route('/guest-child/complete', methods=['POST'])
def guest_mark_vaccination_complete():
    guest = session.get('guest_child')
    if not guest:
        return redirect(url_for('views.add_child'))
    age = request.form.get('age')
    date_str = request.form.get('date')
    if not age or not date_str:
        return redirect(url_for('views.guest_child_view'))
    # Persist completion by age label
    completed_map = session.get('guest_child_completed', {}) or {}
    completed_map[age] = date_str
    session['guest_child_completed'] = completed_map
    return redirect(url_for('views.guest_child_view'))


@views.route('/guest-child/update', methods=['POST'])
def guest_update_child():
    guest = session.get('guest_child')
    if not guest:
        return redirect(url_for('views.add_child'))
    name = request.form.get('child_name', '').strip()
    dob_str = request.form.get('dob', '').strip()
    country = request.form.get('country', 'India')
    errors = _validate_child_form(name, dob_str, country)
    if errors:
        # Render view with errors and keep previous saved guest data
        prev_name = guest.get('name') or ''
        prev_dob_str = guest.get('dob') or ''
        try:
            dob = datetime.strptime(prev_dob_str, '%Y-%m-%d').date()
        except Exception:
            dob = date.today()
        entries = build_schedule_for_child(dob, child=None, country=guest.get('country') or 'India')
        # Overlay completion
        completed_map = session.get('guest_child_completed', {}) or {}
        for e in entries:
            if completed_map.get(e['age']):
                e['group_completed'] = True
                try:
                    e['group_completed_date'] = datetime.strptime(completed_map[e['age']], '%Y-%m-%d').date()
                except Exception:
                    e['group_completed_date'] = date.today()
                e['status_class'] = 'status-completed'
                e['status_text'] = 'Completed'
        class _GuestChild:
            def __init__(self, name, dob, country):
                self.name = name
                self.dob = dob
                self.country = country
                self.id = None
        today_str = date.today().strftime('%Y-%m-%d')
        cur_country = guest.get('country') or 'India'
        return render_template('child_view.html', child=_GuestChild(prev_name, dob, cur_country), schedule_entries=entries, today_str=today_str, stats=None, form_errors=errors, form_data={'child_name': name, 'dob': dob_str, 'country': country}, guest_mode=True, editing=True, reference_url=get_reference_url(cur_country), reference_label='Official schedule', current_country=cur_country)
    # No errors: update session and redirect
    session['guest_child'] = {'name': name, 'dob': dob_str, 'country': country}
    return redirect(url_for('views.guest_child_view'))

@views.route('/dashboard')
def dashboard():
    parent_id = session.get('parent_id')
    if not parent_id:
        # Guest: show a lightweight preview if they added one child
        guest = session.get('guest_child')
        if not guest:
            flash('Log in to view your dashboard, or add a temporary child first.', 'info')
            return redirect(url_for('views.add_child'))
        # Build a preview schedule for the guest child
        try:
            dob_date = datetime.strptime(guest.get('dob', ''), '%Y-%m-%d').date()
            schedule_entries = build_schedule_for_child(dob_date, child=None, country=guest.get('country') or 'India')
        except Exception:
            schedule_entries = []
        # Render a minimal dashboard using base template
        cur_country = guest.get('country') or 'India'
        return render_template('dashboard.html', children=[], child_stats=[], overall_completed=0, overall_overdue=0, overall_upcoming=0, guest_child=guest, guest_schedule=schedule_entries, reference_url=get_reference_url(cur_country), reference_label='Official schedule', current_country=cur_country)
    children = Child.query.filter_by(parent_id=parent_id).order_by(Child.created_at.desc()).all()
    today = date.today()
    due_soon_window = today + timedelta(days=30)

    # Ensure vaccination rows exist for each child
    for c in children:
        build_schedule_for_child(c.dob, child=c)

    overall_completed = overall_overdue = overall_upcoming = 0
    child_stats = []
    for c in children:
        vacs = Vaccination.query.filter_by(child_id=c.id).all()
        completed = sum(1 for v in vacs if v.completed_at)
        # Treat vaccinations due today as overdue/due rather than "due soon" for consistency with schedule cards
        overdue = sum(1 for v in vacs if (not v.completed_at) and v.due_date <= today)
        due_soon = sum(1 for v in vacs if (not v.completed_at) and today < v.due_date <= due_soon_window)
        upcoming = sum(1 for v in vacs if (not v.completed_at) and v.due_date > due_soon_window)
        total = len(vacs)
        # Next due date among not completed
        pending = [v for v in vacs if not v.completed_at]
        next_due = min(pending, key=lambda x: x.due_date).due_date if pending else None
        next_due_vaccines = [v.name for v in vacs if (not v.completed_at) and next_due and v.due_date == next_due]

        overall_completed += completed
        overall_overdue += overdue
        overall_upcoming += (due_soon + upcoming)

        child_stats.append({
            'child': c,
            'completed': completed,
            'overdue': overdue,
            'due_soon': due_soon,
            'upcoming': upcoming,
            'total': total,
            'next_due': next_due,
            'next_due_vaccines': next_due_vaccines,
        })

    return render_template(
        'dashboard.html',
        children=children,
        child_stats=child_stats,
        overall_completed=overall_completed,
        overall_overdue=overall_overdue,
        overall_upcoming=overall_upcoming,
    )
    

@views.route('/child/<int:child_id>')
def child_view(child_id):
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    child = Child.query.filter_by(id=child_id, parent_id=parent_id).first()
    schedule_entries = []
    stats = {}
    if child:
        schedule_entries = build_schedule_for_child(child.dob, child=child, country=child.country or 'India')
        vacs = Vaccination.query.filter_by(child_id=child.id).all()
        today = date.today()
        due_soon_window = today + timedelta(days=30)
        stats = {
            'completed': sum(1 for v in vacs if v.completed_at),
            'overdue': sum(1 for v in vacs if (not v.completed_at) and v.due_date <= today),
            'due_soon': sum(1 for v in vacs if (not v.completed_at) and today < v.due_date <= due_soon_window),
            'total': len(vacs),
        }
    today_str = date.today().strftime('%Y-%m-%d')
    cur_country = (child.country if child else 'India')
    return render_template('child_view.html', child=child, schedule_entries=schedule_entries, today_str=today_str, stats=stats, reference_url=get_reference_url(cur_country), reference_label='Official schedule', current_country=cur_country)


@views.route('/child/<int:child_id>/complete', methods=['POST'])
def mark_vaccination_complete(child_id):
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    child = Child.query.filter_by(id=child_id, parent_id=parent_id).first_or_404()
    vac_name = request.form.get('vaccine')
    date_str = request.form.get('date')
    if not vac_name:
        return redirect(url_for('views.child_view', child_id=child.id))
    vac = Vaccination.query.filter_by(child_id=child.id, name=vac_name).first()
    if not vac:
        # If somehow missing create with due_date today
        vac = Vaccination(child_id=child.id, name=vac_name, due_date=date.today())
        db.session.add(vac)
    # Parse completion date
    try:
        completed_at = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else date.today()
    except ValueError:
        completed_at = date.today()
    # Determine if this is a group submission (we always send first vaccine). Mark all in same age group.
    # Find due_date group by matching due_date of this vaccine.
    vac.completed_at = completed_at
    # Mark others in same due_date that are not yet completed
    siblings = Vaccination.query.filter_by(child_id=child.id, due_date=vac.due_date).all()
    for s in siblings:
        if not s.completed_at:
            s.completed_at = completed_at
    db.session.commit()
    return redirect(url_for('views.child_view', child_id=child.id))


@views.route('/child/<int:child_id>/delete', methods=['POST'])
def delete_child(child_id):
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    child = Child.query.filter_by(id=child_id, parent_id=parent_id).first_or_404()
    db.session.delete(child)  # cascades to vaccinations
    db.session.commit()
    return redirect(url_for('views.dashboard'))


@views.route('/child/<int:child_id>/calendar')
def download_child_calendar(child_id):
    """Generate an .ics calendar file for all vaccination due dates for the child."""
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    child = Child.query.filter_by(id=child_id, parent_id=parent_id).first_or_404()
    # Ensure schedule & vaccination rows present
    schedule_entries = build_schedule_for_child(child.dob, child=child)
    # Build ICS content
    def esc(val: str) -> str:
        return val.replace(',', '\,').replace('\n', '\n').replace(';', '\;')

    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//VaccinationTracker//EN',
        'CALSCALE:GREGORIAN',
        f'X-WR-CALNAME:Vaccinations - {esc(child.name)}',
    ]
    for entry in schedule_entries:
        due = entry.get('due_date')
        if not due:
            continue
        # One event per age group (listing vaccines) to keep calendar concise
        summary = f"{entry['age']} Vaccines"
        description = ', '.join(entry['vaccines'])
        # Timezone-aware UTC timestamp (deprecated utcnow replaced)
        dtstamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        dtstart = due.strftime('%Y%m%d')  # all-day
        uid = f"{child.id}-{entry['age'].replace(' ', '')}-{dtstart}@vaccinationtracker"
        lines.extend([
            'BEGIN:VEVENT',
            f'UID:{uid}',
            f'DTSTAMP:{dtstamp}',
            f'DTSTART;VALUE=DATE:{dtstart}',
            f'SUMMARY:{esc(summary)}',
            f'DESCRIPTION:{esc(description)}',
            'END:VEVENT'
        ])
    lines.append('END:VCALENDAR')
    ics_data = '\r\n'.join(lines) + '\r\n'
    filename = f"{child.name.replace(' ', '_')}_vaccinations.ics"
    return Response(
        ics_data,
        mimetype='text/calendar',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )


@views.route('/child/<int:child_id>/update', methods=['POST'])
def update_child(child_id):
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    child = Child.query.filter_by(id=child_id, parent_id=parent_id).first_or_404()
    name = request.form.get('child_name', '').strip()
    dob_str = request.form.get('dob', '').strip()
    country = request.form.get('country', 'India')
    errors = _validate_child_form(name, dob_str, country)
    if errors:
        # Re-render child view with errors
        schedule_entries = build_schedule_for_child(child.dob, child=child, country=child.country or 'India')
        vacs = Vaccination.query.filter_by(child_id=child.id).all()
        today = date.today()
        due_soon_window = today + timedelta(days=30)
        stats = {
            'completed': sum(1 for v in vacs if v.completed_at),
            'overdue': sum(1 for v in vacs if (not v.completed_at) and v.due_date < today),
            'due_soon': sum(1 for v in vacs if (not v.completed_at) and today <= v.due_date <= due_soon_window),
            'total': len(vacs),
        }
        today_str = today.strftime('%Y-%m-%d')
        cur_country = child.country or 'India'
        return render_template('child_view.html', child=child, schedule_entries=schedule_entries, today_str=today_str, stats=stats, form_errors=errors, editing=True, form_data={'child_name': name, 'dob': dob_str, 'country': country}, reference_url=get_reference_url(cur_country), reference_label='Official schedule', current_country=cur_country)

    new_dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
    dob_changed = new_dob != child.dob
    # If country changed, we'll need to rebuild schedule entries as due dates depend on DOB but set per schedule set
    child.name = name
    child.dob = new_dob
    country_changed = False
    if hasattr(child, 'country'):
        country_changed = (child.country or 'India') != (country or 'India')
        child.country = country or 'India'
    db.session.commit()
    if dob_changed or country_changed:
        # Recreate vaccinations for new DOB: delete existing then rebuild
        Vaccination.query.filter_by(child_id=child.id).delete()
        db.session.commit()
        build_schedule_for_child(child.dob, child=child, country=child.country or 'India')
    return redirect(url_for('views.child_view', child_id=child.id))


@views.route('/compare')
def compare_schedules():
    """Compare vaccination schedules between different countries"""
    from .schedule_data import _load_schedules
    
    # Get selected countries from query params, default to India and UK
    selected_countries = request.args.getlist('countries')
    if not selected_countries:
        selected_countries = ['India', 'UK']
    
    all_schedules = _load_schedules()
    available_countries = list(all_schedules.keys())
    
    # Filter selected countries to only include available ones
    selected_countries = [c for c in selected_countries if c in available_countries]
    if not selected_countries:
        selected_countries = ['India']
    
    # Get schedules for selected countries
    comparison_data = {}
    for country in selected_countries:
        comparison_data[country] = {
            'schedule': all_schedules[country].get('schedule', []),
            'reference_url': all_schedules[country].get('reference_url', '')
        }
    
    # Create a unified view by collecting all unique age periods
    all_ages = set()
    for country_data in comparison_data.values():
        for item in country_data['schedule']:
            all_ages.add(item['age'])
    
    # Sort ages in a meaningful way (by approximate numeric value)
    def age_sort_key(age_str):
        # Extract first number for sorting
        import re
        match = re.search(r'(\d+)', age_str)
        if match:
            num = int(match.group(1))
            # Adjust for units (convert to days for comparison)
            if 'week' in age_str.lower():
                return num * 7
            elif 'month' in age_str.lower():
                return num * 30
            elif 'year' in age_str.lower():
                return num * 365
            else:
                return num
        # Handle special cases
        if 'birth' in age_str.lower():
            return 0
        return 999999  # Put unmatched at end
    
    sorted_ages = sorted(all_ages, key=age_sort_key)
    
    # Build comparison table
    comparison_table = []
    for age in sorted_ages:
        row = {'age': age, 'countries': {}}
        for country in selected_countries:
            # Find vaccines for this age in this country
            vaccines = []
            for item in comparison_data[country]['schedule']:
                if item['age'] == age:
                    vaccines.extend(item['vaccines'])
            row['countries'][country] = vaccines
        comparison_table.append(row)
    
    return render_template('compare_schedules.html',
                         comparison_table=comparison_table,
                         selected_countries=selected_countries,
                         available_countries=available_countries,
                         comparison_data=comparison_data)