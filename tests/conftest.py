import os
import sys
from pathlib import Path
import pytest
from datetime import date

# Ensure project root is on sys.path so `import app` works even if pytest is launched from tests/
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app import create_app, db  # noqa: E402 (import after path fix)

@pytest.fixture(scope='session')
def app():
    os.environ['SECRET_KEY'] = 'test-secret'
    # Use in-memory SQLite for speed
    os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    application = create_app()
    application.config.update(TESTING=True)
    yield application

@pytest.fixture(scope='session')
def _db(app):  # name _db to integrate with flask-sqlalchemy if needed
    with app.app_context():
        yield db

@pytest.fixture()
def client(app):
    return app.test_client()

@pytest.fixture()
def parent_and_child(_db):
    from app.models import Parent, Child
    from datetime import datetime
    parent = Parent(name='Test Parent', email='parent@example.com', password_hash='x')
    _db.session.add(parent)
    _db.session.commit()
    child = Child(name='Kid', dob=date(2024,1,1), parent_id=parent.id)
    _db.session.add(child)
    _db.session.commit()
    return parent, child
