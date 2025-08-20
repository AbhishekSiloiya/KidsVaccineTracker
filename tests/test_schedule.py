from datetime import date, timedelta
from app.schedule_data import build_schedule_for_child, get_countries, get_reference_url


def test_birth_due_is_dob():
    dob = date(2024, 1, 15)
    entries = build_schedule_for_child(dob)
    birth = next(e for e in entries if e['age'] == 'Birth')
    assert birth['due_date'] == dob


def test_week_calculation():
    dob = date(2024, 1, 1)
    entries = build_schedule_for_child(dob)
    six_w = next(e for e in entries if e['age'] == '6 Weeks')
    assert six_w['due_date'] == dob + timedelta(weeks=6)


def test_month_calculation():
    dob = date(2024, 1, 31)
    entries = build_schedule_for_child(dob)
    six_month = next(e for e in entries if e['age'] == '6 Months')
    # End-of-month handling: expect July 31 -> but Feb shorter so adjust logic ensures valid date
    assert six_month['due_date'].month == 7


def test_status_upcoming_and_due(monkeypatch):
    # Make a dob such that one vaccine is due yesterday, one due today, one future
    base = date.today() - timedelta(weeks=6)  # 6 Weeks should be around today
    entries = build_schedule_for_child(base)
    six_weeks = next(e for e in entries if e['age'] == '6 Weeks')
    assert six_weeks['status_class'] in {'status-due','status-completed'}  # If date==today treated as due


def test_available_countries_contains_india_and_uk():
    countries = get_countries()
    assert 'India' in countries
    assert 'UK' in countries


def test_country_specific_entries_india_vs_uk():
    dob = date(2024, 1, 1)
    india_entries = build_schedule_for_child(dob, country='India')
    uk_entries = build_schedule_for_child(dob, country='UK')
    india_ages = {e['age'] for e in india_entries}
    uk_ages = {e['age'] for e in uk_entries}
    assert '6 Weeks' in india_ages
    assert '8 Weeks' not in india_ages
    assert '8 Weeks' in uk_ages


def test_reference_url_per_country():
    assert 'nhs' in (get_reference_url('UK') or '').lower()
    assert 'iap' in (get_reference_url('India') or '').lower()


def test_composite_age_parsing_three_years_four_months():
    # UK schedule includes '3 Years 4 Months'; ensure due date is computed correctly
    dob = date(2020, 1, 15)
    uk_entries = build_schedule_for_child(dob, country='UK')
    target = next((e for e in uk_entries if e['age'].lower().startswith('3 years 4 months')), None)
    assert target is not None
    due = target['due_date']
    # Expected: +3 years => 2023-01-15; +4 months => 2023-05-15
    assert due.year == 2023 and due.month == 5 and due.day == 15

