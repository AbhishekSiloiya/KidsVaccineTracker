from app.models import Parent
from flask import current_app

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
