from app.models import Parent, Child, Vaccination
from app.schedule_data import build_schedule_for_child
from datetime import date
import pytest


@pytest.fixture()
def cleanup(_db):
    created_parent_ids = []

    class Tracker:
        def track(self, parent):
            created_parent_ids.append(parent.id)

    tracker = Tracker()
    yield tracker
    # Teardown: delete created parents (cascade removes children & vaccinations)
    for pid in created_parent_ids:
        p = _db.session.get(Parent, pid)
        if p:
            _db.session.delete(p)
    _db.session.commit()

def test_parent_child_relationship(_db, cleanup):
    p = Parent(name='A', email='a@example.com', password_hash='x')
    _db.session.add(p)
    _db.session.commit()
    cleanup.track(p)
    c = Child(name='C1', dob=date(2024,1,1), parent_id=p.id)
    _db.session.add(c)
    _db.session.commit()
    assert c in p.children


def test_schedule_creates_vaccinations(_db, cleanup):
    p = Parent(name='B', email='b@example.com', password_hash='x')
    _db.session.add(p)
    _db.session.commit()
    cleanup.track(p)
    c = Child(name='Kid', dob=date(2024,1,1), parent_id=p.id)
    _db.session.add(c)
    _db.session.commit()
    build_schedule_for_child(c.dob, child=c)
    vacs = Vaccination.query.filter_by(child_id=c.id).all()
    assert len(vacs) > 0


def test_cascade_delete(_db):
    p = Parent(name='Cascade', email='c@example.com', password_hash='x')
    _db.session.add(p)
    _db.session.commit()
    c = Child(name='Kid2', dob=date(2024,1,1), parent_id=p.id)
    _db.session.add(c)
    _db.session.commit()
    build_schedule_for_child(c.dob, child=c)
    vac_count = Vaccination.query.filter_by(child_id=c.id).count()
    assert vac_count > 0
    _db.session.delete(p)
    _db.session.commit()
    assert Vaccination.query.filter_by(child_id=c.id).count() == 0
