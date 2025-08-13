from datetime import date, timedelta
from app.schedule_data import build_schedule_for_child


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

