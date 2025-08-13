from datetime import date, timedelta
from . import db
from .models import Vaccination

vaccination_schedule = [
    {"age": "Birth", "vaccines": ["BCG", "OPV 0", "Hepatitis B-1"]},
    {"age": "6 Weeks", "vaccines": ["DTwP/DTaP-1", "IPV-1", "Hib-1", "Rotavirus-1", "PCV-1", "Hepatitis B-2"]},
    {"age": "10 Weeks", "vaccines": ["DTwP/DTaP-2", "IPV-2", "Hib-2", "Rotavirus-2", "PCV-2", "Hepatitis B-3"]},
    {"age": "14 Weeks", "vaccines": ["DTwP/DTaP-3", "IPV-3", "Hib-3", "Rotavirus-3", "PCV-3", "Hepatitis B-4"]},
    {"age": "6 Months", "vaccines": ["Influenza (IIV)-1"]},
    {"age": "7 Months", "vaccines": ["Influenza (IIV)-2"]},
    {"age": "6-9 Months", "vaccines": ["Typhoid Conjugate Vaccine"]},
    {"age": "9 Months", "vaccines": ["MMR-1", "Meningococcal-1"]},
    {"age": "12 Months", "vaccines": ["Hepatitis A", "Meningococcal-2", "Japanese Encephalitis-1", "Cholera-1"]},
    {"age": "13 Months", "vaccines": ["Japanese Encephalitis-2", "Cholera-2"]},
    {"age": "15 Months", "vaccines": ["MMR-2", "Varicella-1", "PCV Booster"]},
    {"age": "16-18 Months", "vaccines": ["DTwP/DTaP-B1", "Hib-B1", "IPV-B1"]},
    {"age": "18-19 Months", "vaccines": ["Hepatitis A-2", "Varicella-2"]},
    {"age": "4-6 Years", "vaccines": ["DTwP/DTaP-B2", "IPV-B2", "MMR-3"]},
    {"age": "10 Years", "vaccines": ["Tdap"]},
    {"age": "15-18 Years", "vaccines": ["HPV"]},
    {"age": "16-18 Years", "vaccines": ["Td"]},
]

def _calc_due_date(dob: date, age_label: str) -> date:
    parts = age_label.split()
    if not parts:
        return dob
    num_part = parts[0]
    unit = (parts[1] if len(parts) > 1 else '').lower()
    if '-' in num_part:
        num_part = num_part.split('-')[0]
    try:
        n = int(num_part)
    except ValueError:
        n = 0
    d = dob
    if unit.startswith('week'):
        return d + timedelta(weeks=n)
    if unit.startswith('month'):
        month = d.month - 1 + n
        year = d.year + month // 12
        month = month % 12 + 1
        day = min(d.day, [31,29 if year%4==0 and (year%100!=0 or year%400==0) else 28,31,30,31,30,31,31,30,31,30,31][month-1])
        return date(year, month, day)
    if 'year' in unit:
        try:
            return date(d.year + n, d.month, d.day)
        except ValueError:
            return date(d.year + n, d.month, min(d.day, 28))
    return d

def build_schedule_for_child(dob: date, child=None):
    """Return schedule entries and ensure Vaccination rows exist.

    If a child model is provided, create Vaccination rows for each vaccine if missing.
    """
    today = date.today()
    entries = []

    for item in vaccination_schedule:
        due = _calc_due_date(dob, item['age'])
        # For each vaccine in group ensure a Vaccination record exists
        vaccine_records = []
        if child is not None:
            for vac_name in item['vaccines']:
                vac = Vaccination.query.filter_by(child_id=child.id, name=vac_name).first()
                if not vac:
                    vac = Vaccination(child_id=child.id, name=vac_name, due_date=due)
                    db.session.add(vac)
                    vaccine_records.append(vac)
                else:
                    vaccine_records.append(vac)
        # Determine status based on any not completed vaccines in that age group
        group_completed = all(v.completed_at for v in vaccine_records) if vaccine_records else False
        group_completed_date = None
        if group_completed:
            # earliest completion date among vaccines
            dates = [v.completed_at for v in vaccine_records if v.completed_at]
            if dates:
                group_completed_date = min(dates)
        if group_completed:
            status_class = 'status-completed'
            status_text = 'Completed'
        else:
            # Treat vaccines whose due date is today as due (previously strictly < today left same-day items as Upcoming)
            if due <= today:
                status_class = 'status-due'
                status_text = 'Due / Overdue'
            else:
                status_class = 'status-upcoming'
                status_text = 'Upcoming'
        entries.append({
            'age': item['age'],
            'vaccines': item['vaccines'],
            'due_date': due,
            'status_class': status_class,
            'status_text': status_text,
            'vaccine_records': vaccine_records,
            'group_completed': group_completed,
            'group_completed_date': group_completed_date,
        })
    if child is not None:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
    return entries
