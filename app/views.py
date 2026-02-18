from flask import Blueprint, render_template, request, redirect, url_for, Response, session, flash
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from zoneinfo import ZoneInfo
from .models import Child, Vaccination, Parent
from . import db
from .schedule_data import build_schedule_for_child, get_reference_url, get_countries
from .security import sanitize_text, validate_name, has_disallowed_keywords

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


def _uk_today() -> date:
    try:
        return datetime.now(ZoneInfo('Europe/London')).date()
    except Exception:
        return date.today()


def _format_pdf_date(value) -> str:
    if not value:
        return '—'
    if isinstance(value, datetime):
        value = value.date()
    return value.strftime('%d %b %Y')


def _build_vaccine_record_rows(vaccinations, today: date):
    rows = []
    for vac in vaccinations:
        if vac.completed_at:
            status = 'Completed'
            display_date = _format_pdf_date(vac.completed_at)
        elif not vac.due_date:
            status = 'Due'
            display_date = '—'
        elif vac.due_date <= today:
            status = 'Overdue'
            display_date = _format_pdf_date(vac.due_date)
        else:
            status = 'Due'
            display_date = _format_pdf_date(vac.due_date)
        rows.append({
            'vaccine': vac.name,
            'status': status,
            'date': display_date,
        })
    return rows


def _build_grouped_vaccine_record_rows(schedule_entries, vaccinations, today: date):
    vac_by_name = {v.name: v for v in vaccinations}
    seen = set()
    groups = []

    for entry in schedule_entries or []:
        age_label = entry.get('age') or 'Schedule'
        group_rows = []
        for vac_name in entry.get('vaccines') or []:
            vac = vac_by_name.get(vac_name)
            if not vac:
                # Keep schedule completeness even if DB row doesn't exist yet.
                due_date = entry.get('due_date')

                class _TempVac:
                    def __init__(self, name, due_date):
                        self.name = name
                        self.due_date = due_date
                        self.completed_at = None

                vac = _TempVac(vac_name, due_date)
            row = _build_vaccine_record_rows([vac], today)[0]
            group_rows.append(row)
            seen.add(vac_name)
        if group_rows:
            groups.append({'age': age_label, 'rows': group_rows})

    leftover = [v for v in vaccinations if v.name not in seen]
    if leftover:
        leftover_rows = _build_vaccine_record_rows(leftover, today)
        groups.append({'age': 'Other', 'rows': leftover_rows})

    return groups


def _name_initials(name: str) -> str:
    parts = [p for p in (name or '').split() if p]
    if not parts:
        return 'CH'
    initials = ''.join(part[0] for part in parts if part and part[0].isalpha()).upper()
    return initials or 'CH'


def _escape_pdf_text(text: str) -> str:
    safe = (text or '').replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    return safe.encode('latin-1', errors='replace').decode('latin-1')


def _pdf_text(x: int, y: int, text: str, font: str = 'F1', size: int = 10, color=(0, 0, 0)) -> str:
    r, g, b = color
    return f"BT {r:.3f} {g:.3f} {b:.3f} rg /{font} {size} Tf {x} {y} Td ({_escape_pdf_text(text)}) Tj ET"


def _status_color(status: str):
    if status == 'Completed':
        return (0.020, 0.588, 0.412)
    if status == 'Overdue':
        return (0.863, 0.149, 0.149)
    return (0.851, 0.467, 0.024)


def _build_vaccine_record_stats(vaccinations, today: date):
    due_soon_window = today + timedelta(days=30)
    completed = sum(1 for v in vaccinations if v.completed_at)
    overdue = sum(1 for v in vaccinations if (not v.completed_at) and v.due_date and v.due_date <= today)
    due_soon = sum(1 for v in vaccinations if (not v.completed_at) and v.due_date and today < v.due_date <= due_soon_window)
    return {
        'completed': completed,
        'overdue': overdue,
        'due_soon': due_soon,
        'total': len(vaccinations),
    }


def _build_vaccine_record_pdf(groups, generated_on: date, child_name: str, parent_name: str, stats) -> bytes:
    table_items = []

    for group in groups or []:
        table_items.append({'kind': 'group', 'label': group.get('age') or 'Schedule'})
        for row in group.get('rows') or []:
            table_items.append({'kind': 'row', 'row': row})

    instructions = []
    page_cmds = []
    page_cmds.append(_pdf_text(42, 805, 'Vaccination Record', font='F2', size=18))
    page_cmds.append(_pdf_text(465, 805, 'VaxGuard', font='F2', size=12, color=(0.145, 0.388, 0.922)))
    page_cmds.append(_pdf_text(42, 786, f"Generated on: {_format_pdf_date(generated_on)}"))
    page_cmds.append(_pdf_text(42, 770, f"Child: {child_name}"))
    page_cmds.append(_pdf_text(42, 754, f"Parent: {parent_name}"))
    page_cmds.append(_pdf_text(42, 734, f"Overdue: {stats['overdue']}", font='F2', size=10, color=(0.863, 0.149, 0.149)))
    page_cmds.append(_pdf_text(170, 734, f"Due Soon: {stats['due_soon']}", font='F2', size=10, color=(0.851, 0.467, 0.024)))
    page_cmds.append(_pdf_text(312, 734, f"Complete: {stats['completed']}/{stats['total']}", font='F2', size=10, color=(0.020, 0.588, 0.412)))

    if table_items:
        page_cmds.append(_pdf_text(42, 714, 'Vaccine', font='F2', size=9))
        page_cmds.append(_pdf_text(375, 714, 'Status', font='F2', size=9))
        page_cmds.append(_pdf_text(462, 714, 'Date', font='F2', size=9))
        y = 699
        for item in table_items:
            if y < 94:
                break
            if item['kind'] == 'group':
                page_cmds.append(_pdf_text(42, y, item['label'], font='F2', size=8, color=(0.122, 0.161, 0.235)))
                y -= 11
                continue
            row = item['row']
            color = _status_color(row['status'])
            page_cmds.append(_pdf_text(54, y, (row['vaccine'] or '')[:56], font='F1', size=8))
            page_cmds.append(_pdf_text(375, y, row['status'], font='F2', size=8, color=color))
            page_cmds.append(_pdf_text(462, y, row['date'], font='F2', size=8, color=color))
            y -= 11
    else:
        page_cmds.append(_pdf_text(42, 697, 'No vaccination schedule available.', font='F1', size=11))

    page_cmds.append(_pdf_text(42, 78, 'Due = upcoming based on schedule', size=9))
    page_cmds.append(_pdf_text(42, 64, 'Overdue = past scheduled date', size=9))
    page_cmds.append(_pdf_text(42, 32, 'VaxGuard', size=8))
    page_cmds.append(_pdf_text(470, 32, 'Page 1 of 1', size=8))
    instructions.append('\n'.join(page_cmds))

    objects = []

    def _add_object(content: str) -> int:
        objects.append(content)
        return len(objects)

    font_regular_id = _add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold_id = _add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    page_ids = []
    pages_id = _add_object("")
    catalog_id = _add_object("")

    for cmd in instructions:
        stream_bytes = cmd.encode('latin-1', errors='replace')
        stream = stream_bytes.decode('latin-1')
        content_id = _add_object(f"<< /Length {len(stream_bytes)} >>\nstream\n{stream}\nendstream")
        page_id = _add_object(
            "<< /Type /Page "
            f"/Parent {pages_id} 0 R "
            "/MediaBox [0 0 595 842] "
            f"/Contents {content_id} 0 R "
            "/Resources << /Font << "
            f"/F1 {font_regular_id} 0 R "
            f"/F2 {font_bold_id} 0 R "
            ">> >> >>"
        )
        page_ids.append(page_id)

    kids_refs = ' '.join(f"{pid} 0 R" for pid in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Count {len(page_ids)} /Kids [ {kids_refs} ] >>"
    objects[catalog_id - 1] = f"<< /Type /Catalog /Pages {pages_id} 0 R >>"

    output = BytesIO()
    output.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, content in enumerate(objects, start=1):
        offsets.append(output.tell())
        output.write(f"{i} 0 obj\n{content}\nendobj\n".encode('latin-1', errors='replace'))
    xref_pos = output.tell()
    output.write(f"xref\n0 {len(objects) + 1}\n".encode('latin-1'))
    output.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        output.write(f"{off:010d} 00000 n \n".encode('latin-1'))
    output.write(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode('latin-1')
    )
    return output.getvalue()

def _validate_child_form(name: str, dob_str: str, country: str | None = None):
    errors = []
    if has_disallowed_keywords(name):
        errors.append('Child name contains disallowed words.')
    # Validate name with stricter rules
    errors += validate_name(name, field_label='Child name')
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
        name = sanitize_text(request.form.get('child_name', '').strip(), max_len=80)
        dob = sanitize_text(request.form.get('dob', '').strip(), max_len=10)
        country = sanitize_text(request.form.get('country', 'India').strip(), max_len=40)
        form_data = {'child_name': name, 'dob': dob, 'country': country}
        form_errors = _validate_child_form(name, dob, country)
        if not form_errors:
            if parent_id:
                # Persist child in DB for logged-in parent
                child = Child(name=name, dob=datetime.strptime(dob, '%Y-%m-%d').date(), parent_id=parent_id, country=country)
                db.session.add(child)
                db.session.commit()
                # Redirect to the newly created child's view
                return redirect(url_for('views.child_view', child_id=child.id))
            else:
                # Guest flow: allow only one child in session; block adding a second
                if session.get('guest_child'):
                    flash('Adding more than one child requires an account. Please log in or create an account.', 'error')
                    return redirect(url_for('auth.login'))
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
    age = sanitize_text(request.form.get('age', ''), max_len=40)
    date_str = sanitize_text(request.form.get('date', ''), max_len=10)
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
    name = sanitize_text(request.form.get('child_name', '').strip(), max_len=80)
    dob_str = sanitize_text(request.form.get('dob', '').strip(), max_len=10)
    country = sanitize_text(request.form.get('country', 'India').strip(), max_len=40)
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
        
        # Calculate stats for guest child
        completed_map = session.get('guest_child_completed', {}) or {}
        today = date.today()
        due_soon_window = today + timedelta(days=30)
        completed_count = overdue = due_soon = upcoming = 0
        next_due_date = None
        next_due_vaccines = []
        
        for entry in schedule_entries:
            if completed_map.get(entry['age']):
                completed_count += len(entry['vaccines'])
            else:
                if entry['due_date'] <= today:
                    overdue += len(entry['vaccines'])
                elif today < entry['due_date'] <= due_soon_window:
                    due_soon += len(entry['vaccines'])
                else:
                    upcoming += len(entry['vaccines'])
                
                # Find the earliest next due date among incomplete vaccinations
                if not next_due_date or entry['due_date'] < next_due_date:
                    next_due_date = entry['due_date']
                    next_due_vaccines = entry['vaccines']
        
        # Render a minimal dashboard using base template
        cur_country = guest.get('country') or 'India'
        return render_template('dashboard.html', children=[], child_stats=[], overall_completed=completed_count, overall_overdue=overdue, overall_upcoming=due_soon + upcoming, guest_child=guest, guest_schedule=schedule_entries, guest_next_due=next_due_date, guest_next_vaccines=next_due_vaccines, reference_url=get_reference_url(cur_country), reference_label='Official schedule', current_country=cur_country)
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
        return val.replace(',', '\\,').replace('\n', '\\n').replace(';', '\\;')

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


@views.route('/child/<int:child_id>/vaccine-record.pdf')
def download_vaccine_record_pdf(child_id):
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    child = Child.query.filter_by(id=child_id, parent_id=parent_id).first_or_404()

    try:
        schedule_entries = build_schedule_for_child(child.dob, child=child, country=child.country or 'India')
        vaccinations = Vaccination.query.filter_by(child_id=child.id).order_by(
            Vaccination.due_date.asc(),
            Vaccination.name.asc(),
        ).all()

        generated_on = _uk_today()
        initials = _name_initials(child.name)
        filename = f"{initials}_vaxguard_vaccine_record_{generated_on.strftime('%Y-%m-%d')}.pdf"
        grouped_rows = _build_grouped_vaccine_record_rows(schedule_entries, vaccinations, generated_on)
        stats = _build_vaccine_record_stats(vaccinations, generated_on)
        parent_name = child.parent.name if child.parent and child.parent.name else 'Parent'
        pdf_bytes = _build_vaccine_record_pdf(grouped_rows, generated_on, child.name or 'Child', parent_name, stats)

        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={'Content-Disposition': f'attachment; filename={filename}'},
        )
    except Exception:
        flash("Couldn't generate PDF. Try again.", 'error')
        return redirect(url_for('views.child_view', child_id=child.id))


@views.route('/child/<int:child_id>/update', methods=['POST'])
def update_child(child_id):
    parent_id = session.get('parent_id')
    if not parent_id:
        flash('Please log in first.', 'error')
        return redirect(url_for('auth.login'))
    child = Child.query.filter_by(id=child_id, parent_id=parent_id).first_or_404()
    name = sanitize_text(request.form.get('child_name', '').strip(), max_len=80)
    dob_str = sanitize_text(request.form.get('dob', '').strip(), max_len=10)
    country = sanitize_text(request.form.get('country', 'India').strip(), max_len=40)
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
