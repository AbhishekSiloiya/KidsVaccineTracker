from datetime import date


def test_add_child_sanitizes_and_blocks_keywords(client):
    # XSS/script and SQL keywords in name should be sanitized/blocked by validation
    resp = client.post('/add-child', data={
        'child_name': "<script>alert('x')</script> DROP TABLE users;",
        'dob': '2024-01-01',
        'country': 'India',
    }, follow_redirects=True)
    # Should render the form with errors (status 200 and contains error text)
    body = resp.get_data(as_text=True)
    assert resp.status_code == 200
    assert ('contains invalid characters' in body) or ('at least 2 characters' in body)


def test_register_validates_email_and_age(client):
    # Invalid email and age non-numeric
    resp = client.post('/register', data={
        'name': 'Valid Name',
        'email': 'not-an-email',
        'age': 'abc',
        'password': 'secret123',
    }, follow_redirects=True)
    body = resp.get_data(as_text=True)
    assert 'Invalid email format' in body
    assert 'Age must be a number' in body


def test_guest_mark_complete_sanitizes_and_redirects(client):
    # Create guest child first
    client.post('/add-child', data={'child_name': 'Temp Kid', 'dob': '2024-02-02', 'country': 'India'})
    # Submit completion with suspicious age label (should be sanitized) and valid date
    resp = client.post('/guest-child/complete', data={'age': "6 months; DROP", 'date': '2024-06-01'})
    assert resp.status_code == 302
    assert '/guest-child' in resp.headers.get('Location', '')


def test_login_sanitizes_email(client):
    # Ensure route handles sanitized email gracefully even if not exists
    resp = client.post('/login', data={'email': "user@example.com; SELECT *", 'password': 'x'})
    assert resp.status_code == 200
    assert 'Invalid credentials' in resp.get_data(as_text=True)
