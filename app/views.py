from flask import Blueprint, render_template, request, redirect, url_for, Response, session, flash
from datetime import date, datetime, timedelta
from .models import Child, Vaccination, Parent
from . import db
from .schedule_data import build_schedule_for_child

# Specify the template_folder because the project currently uses 'template' (singular)
# If you later rename the folder to 'templates', you can remove the parameter.
views = Blueprint('views', __name__, template_folder='template')

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

@views.route('/')
def home():
    # Render the base layout so linked CSS/JS are requested and applied
    return render_template('base.html')

def base_template():  # Optional helper
    return render_template('base.html')

def _validate_child_form(name: str, dob_str: str):
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
    return errors

@views.route('/add-child', methods=['GET', 'POST'])
def add_child():
    # Require login
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    form_errors = []
    form_success = None
    form_data = {}
    if request.method == 'POST':
        name = request.form.get('child_name', '').strip()
        dob = request.form.get('dob', '')
        form_data = {'child_name': name, 'dob': dob}
        form_errors = _validate_child_form(name, dob)
        if not form_errors:
            # Persist child
            child = Child(name=name, dob=datetime.strptime(dob, '%Y-%m-%d').date(), parent_id=parent_id)
            db.session.add(child)
            db.session.commit()
            form_success = 'Child added successfully.'
            # Optional redirect: return redirect(url_for('views.dashboard'))
    return render_template('add_child.html', form_errors=form_errors, form_success=form_success, form_data=form_data)

@views.route('/dashboard')
def dashboard():
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
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
        schedule_entries = build_schedule_for_child(child.dob, child=child)
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
    return render_template('child_view.html', child=child, schedule_entries=schedule_entries, today_str=today_str, stats=stats)


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
        dtstamp = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
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
    errors = _validate_child_form(name, dob_str)
    if errors:
        # Re-render child view with errors
        schedule_entries = build_schedule_for_child(child.dob, child=child)
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
        return render_template('child_view.html', child=child, schedule_entries=schedule_entries, today_str=today_str, stats=stats, form_errors=errors, editing=True, form_data={'child_name': name, 'dob': dob_str})

    new_dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
    dob_changed = new_dob != child.dob
    child.name = name
    child.dob = new_dob
    db.session.commit()
    if dob_changed:
        # Recreate vaccinations for new DOB: delete existing then rebuild
        Vaccination.query.filter_by(child_id=child.id).delete()
        db.session.commit()
        build_schedule_for_child(child.dob, child=child)
    return redirect(url_for('views.child_view', child_id=child.id))