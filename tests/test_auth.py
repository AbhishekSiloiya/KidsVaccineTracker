from app.models import Parent, Child
from app import db
from flask import current_app
from datetime import date

def test_register_and_login(client, _db):
    # Register (age required by form; must be >=18)
    resp = client.post('/auth/register', data={
        'name': 'User1',
        'email': 'user1@example.com',
        'age': '30',
        'password': 'secret123'
    }, follow_redirects=True)
    assert resp.status_code == 200
    # Query inside app context to be explicit
    with current_app.app_context():
        assert Parent.query.filter_by(email='user1@example.com').first() is not None

    # Login
    resp2 = client.post('/auth/login', data={
        'email': 'user1@example.com',
        'password': 'secret123'
    }, follow_redirects=True)
    assert resp2.status_code == 200
    # Access dashboard (requires session)
    dash = client.get('/dashboard')
    assert dash.status_code == 200


def test_guest_child_country_persists_on_register(client, _db):
    # Add guest child with UK
    client.post('/add-child', data={
        'child_name': 'GuestKid',
        'dob': '2024-01-01',
        'country': 'UK'
    }, follow_redirects=True)

    # Register and ensure guest child is moved into DB with country
    resp = client.post('/auth/register', data={
        'name': 'GUser',
        'email': 'guser@example.com',
        'age': '28',
        'password': 'secret123'
    }, follow_redirects=True)
    assert resp.status_code == 200

    with current_app.app_context():
        parent = Parent.query.filter_by(email='guser@example.com').first()
        assert parent is not None
        child = Child.query.filter_by(parent_id=parent.id).first()
        assert child is not None
        assert (child.country or 'India') == 'UK'


def test_delete_account(client, _db):
    # Register a user who will be deleted
    email = 'deluser@example.com'
    resp = client.post('/auth/register', data={
        'name': 'Delete Me',
        'email': email,
        'age': '35',
        'password': 'secret123'
    }, follow_redirects=True)
    assert resp.status_code == 200

    with current_app.app_context():
        parent = Parent.query.filter_by(email=email).first()
        assert parent is not None
        pid = parent.id
        # Create a child to verify cascade deletion
        ch = Child(name='TempKid', dob=date(2024, 1, 1), parent_id=pid)
        db.session.add(ch)
        db.session.commit()
        assert Child.query.filter_by(parent_id=pid).count() == 1

    # Delete account (session already established after register)
    del_resp = client.post(f'/auth/parent/{pid}/delete', follow_redirects=True)
    assert del_resp.status_code == 200

    with current_app.app_context():
        assert Parent.query.filter_by(email=email).first() is None
        assert Child.query.filter_by(parent_id=pid).count() == 0
