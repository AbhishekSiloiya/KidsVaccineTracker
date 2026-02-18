from datetime import date
from uuid import uuid4

from app import db
from app.models import Parent, Child, Vaccination
from app.views import _build_vaccine_record_rows, _name_initials, _build_vaccine_record_stats, _build_grouped_vaccine_record_rows


def _create_logged_in_child(client, child_name='Kid PDF'):
    unique = uuid4().hex[:8]
    parent = Parent(name='PDF Parent', email=f'{child_name.lower().replace(" ", "")}-{unique}@example.com', password_hash='x')
    db.session.add(parent)
    db.session.commit()
    child = Child(name=child_name, dob=date(2024, 1, 1), parent_id=parent.id, country='UK')
    db.session.add(child)
    db.session.commit()
    with client.session_transaction() as sess:
        sess['parent_id'] = parent.id
    return parent, child


def test_vaccine_record_pdf_requires_login(client):
    resp = client.get('/child/1/vaccine-record.pdf')
    assert resp.status_code == 302
    assert '/auth/login' in resp.location


def test_vaccine_record_pdf_download_headers_and_core_text(client, _db, monkeypatch):
    parent, child = _create_logged_in_child(client, child_name='NoPI Kid')
    monkeypatch.setattr('app.views.build_schedule_for_child', lambda *args, **kwargs: [{'age': '8 Weeks', 'vaccines': ['MMR'], 'due_date': date(2026, 1, 1)}])

    db.session.add(Vaccination(child_id=child.id, name='MMR', due_date=date(2026, 1, 1), completed_at=None))
    db.session.commit()

    resp = client.get(f'/child/{child.id}/vaccine-record.pdf')
    assert resp.status_code == 200
    assert resp.mimetype == 'application/pdf'
    disposition = resp.headers.get('Content-Disposition', '')
    assert 'attachment;' in disposition
    assert f'{_name_initials(child.name)}_vaxguard_vaccine_record_'.encode('utf-8') in disposition.encode('utf-8')
    assert child.name.encode('utf-8') in resp.data
    assert parent.name.encode('utf-8') in resp.data
    assert b'Vaccination Record' in resp.data
    assert f'Child: {child.name}'.encode('utf-8') in resp.data
    assert f'Parent: {parent.name}'.encode('utf-8') in resp.data
    assert b'Overdue:' in resp.data
    assert b'Due Soon:' in resp.data
    assert b'Complete:' in resp.data
    assert b'8 Weeks' in resp.data


def test_vaccine_record_pdf_only_for_own_child(client, _db):
    parent_a, _ = _create_logged_in_child(client, child_name='Parent A Kid')
    parent_b = Parent(name='Parent B', email=f'parentb-{uuid4().hex[:8]}@example.com', password_hash='x')
    db.session.add(parent_b)
    db.session.commit()
    other_child = Child(name='Other Kid', dob=date(2023, 5, 1), parent_id=parent_b.id, country='UK')
    db.session.add(other_child)
    db.session.commit()

    with client.session_transaction() as sess:
        sess['parent_id'] = parent_a.id

    resp = client.get(f'/child/{other_child.id}/vaccine-record.pdf')
    assert resp.status_code == 404


def test_vaccine_record_rows_status_logic():
    today = date(2026, 2, 17)
    vacs = [
        Vaccination(name='Completed Vac', due_date=date(2026, 1, 1), completed_at=date(2026, 1, 5)),
        Vaccination(name='Overdue Vac', due_date=date(2026, 2, 1), completed_at=None),
        Vaccination(name='Due Today Vac', due_date=date(2026, 2, 17), completed_at=None),
        Vaccination(name='Due Vac', due_date=date(2026, 3, 1), completed_at=None),
        Vaccination(name='No Due Date Vac', due_date=None, completed_at=None),
    ]

    rows = _build_vaccine_record_rows(vacs, today)
    by_name = {row['vaccine']: row for row in rows}
    assert by_name['Completed Vac']['status'] == 'Completed'
    assert by_name['Completed Vac']['date'] == '05 Jan 2026'
    assert by_name['Overdue Vac']['status'] == 'Overdue'
    assert by_name['Overdue Vac']['date'] == '01 Feb 2026'
    assert by_name['Due Today Vac']['status'] == 'Overdue'
    assert by_name['Due Today Vac']['date'] == '17 Feb 2026'
    assert by_name['Due Vac']['status'] == 'Due'
    assert by_name['Due Vac']['date'] == '01 Mar 2026'
    assert by_name['No Due Date Vac']['status'] == 'Due'
    assert by_name['No Due Date Vac']['date'] == '—'


def test_vaccine_record_stats_logic():
    today = date(2026, 2, 17)
    vacs = [
        Vaccination(name='Completed Vac', due_date=date(2026, 1, 1), completed_at=date(2026, 1, 5)),
        Vaccination(name='Overdue Vac', due_date=date(2026, 2, 10), completed_at=None),
        Vaccination(name='Due Soon Vac', due_date=date(2026, 2, 25), completed_at=None),
        Vaccination(name='Future Vac', due_date=date(2026, 4, 1), completed_at=None),
        Vaccination(name='No Due Date Vac', due_date=None, completed_at=None),
    ]
    stats = _build_vaccine_record_stats(vacs, today)
    assert stats['completed'] == 1
    assert stats['overdue'] == 1
    assert stats['due_soon'] == 1
    assert stats['total'] == 5


def test_grouped_vaccine_record_rows_uses_schedule_groups():
    today = date(2026, 2, 18)
    schedule_entries = [
        {'age': '8 Weeks', 'due_date': date(2026, 2, 28), 'vaccines': ['6-in-1-1', 'Rotavirus-1']},
        {'age': '12 Weeks', 'due_date': date(2026, 3, 28), 'vaccines': ['6-in-1-2']},
    ]
    vaccinations = [
        Vaccination(name='6-in-1-1', due_date=date(2026, 2, 28), completed_at=None),
        Vaccination(name='Rotavirus-1', due_date=date(2026, 2, 28), completed_at=None),
        Vaccination(name='6-in-1-2', due_date=date(2026, 3, 28), completed_at=None),
    ]
    groups = _build_grouped_vaccine_record_rows(schedule_entries, vaccinations, today)
    assert [g['age'] for g in groups] == ['8 Weeks', '12 Weeks']
    assert [r['vaccine'] for r in groups[0]['rows']] == ['6-in-1-1', 'Rotavirus-1']
    assert [r['vaccine'] for r in groups[1]['rows']] == ['6-in-1-2']


def test_name_initials():
    assert _name_initials('Rudra') == 'R'
    assert _name_initials('Rudra Singh') == 'RS'
    assert _name_initials('') == 'CH'


def test_vaccine_record_pdf_empty_schedule_message(client, _db, monkeypatch):
    _, child = _create_logged_in_child(client, child_name='Empty Schedule Kid')
    monkeypatch.setattr('app.views.build_schedule_for_child', lambda *args, **kwargs: [])

    resp = client.get(f'/child/{child.id}/vaccine-record.pdf')
    assert resp.status_code == 200
    assert b'No vaccination schedule available.' in resp.data
