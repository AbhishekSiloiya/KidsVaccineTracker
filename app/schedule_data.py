from datetime import date, timedelta
import json
import os
import re
from typing import List, Dict, Any, Optional, Tuple
from . import db
from .models import Vaccination

# Lazy-loaded cache
_SCHEDULE_DATA: Optional[Dict[str, Any]] = None

def _load_schedules() -> Dict[str, Any]:
    global _SCHEDULE_DATA
    if _SCHEDULE_DATA is not None:
        return _SCHEDULE_DATA
    # schedules.json is placed under app/static for easy serving
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, 'static', 'schedules.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            _SCHEDULE_DATA = json.load(f)
    except Exception:
        # Fallback: minimal India-only if file missing
        _SCHEDULE_DATA = {
            'India': {
                'reference_url': 'https://iapindia.org/pdf/Indian-Pediatrics/2024/Indian-Pediatrics-February-2024-issue.pdf',
                'schedule': [
                    {"age": "Birth", "vaccines": ["BCG", "OPV 0", "Hepatitis B-1"]}
                ]
            }
        }
    return _SCHEDULE_DATA

def get_countries() -> List[str]:
    return list(_load_schedules().keys())

def get_reference_url(country: str) -> Optional[str]:
    data = _load_schedules()
    c = data.get(country or '') or data.get('India')
    if isinstance(c, dict):
        return c.get('reference_url')
    return None

def get_schedule(country: str) -> Tuple[List[Dict[str, Any]], str]:
    data = _load_schedules()
    ckey = country if country in data else 'India'
    cdata = data.get(ckey, {})
    return cdata.get('schedule', []), cdata.get('reference_url', '')

def _calc_due_date(dob: date, age_label: str) -> date:
    label = (age_label or '').strip()
    if not label:
        return dob
    # Handle ranges by taking the first number (e.g., '16-18 Months' -> 16 Months)
    label = re.sub(r"(\d+)\s*-\s*\d+", r"\1", label)
    # Sum all occurrences like '3 Years', '4 Months', '6 Weeks'
    year_sum = 0
    month_sum = 0
    week_sum = 0
    for m in re.finditer(r"(\d+)\s*(year|years|month|months|week|weeks)", label, flags=re.IGNORECASE):
        n = int(m.group(1))
        unit = m.group(2).lower()
        if unit.startswith('year'):
            year_sum += n
        elif unit.startswith('month'):
            month_sum += n
        elif unit.startswith('week'):
            week_sum += n
    # If nothing matched but label mentions 'year' (e.g., 'Every Year'), default to 1 year
    if year_sum == 0 and month_sum == 0 and week_sum == 0:
        if re.search(r"year", label, re.IGNORECASE):
            year_sum = 1
        elif re.search(r"month", label, re.IGNORECASE):
            month_sum = 1
        elif re.search(r"week", label, re.IGNORECASE):
            week_sum = 1
        else:
            return dob
    # Apply additions
    d = dob
    if year_sum:
        try:
            d = date(d.year + year_sum, d.month, d.day)
        except ValueError:
            d = date(d.year + year_sum, d.month, min(d.day, 28))
    if month_sum:
        month = d.month - 1 + month_sum
        year = d.year + month // 12
        month = month % 12 + 1
        day = min(d.day, [31,29 if year%4==0 and (year%100!=0 or year%400==0) else 28,31,30,31,30,31,31,30,31,30,31][month-1])
        d = date(year, month, day)
    if week_sum:
        d = d + timedelta(weeks=week_sum)
    return d

def build_schedule_for_child(dob: date, child=None, country: Optional[str] = None):
    """Return schedule entries and ensure Vaccination rows exist.

    If a child model is provided, create Vaccination rows for each vaccine if missing.
    """
    today = date.today()
    entries = []
    schedule, _ref = get_schedule(country or getattr(child, 'country', None) or 'India')

    for item in schedule:
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
