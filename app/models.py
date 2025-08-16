from datetime import datetime, timezone
from . import db


class Parent(db.Model):
    __tablename__ = 'parents'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    children = db.relationship('Child', back_populates='parent', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Parent {self.id} {self.email}>"


class Child(db.Model):
    __tablename__ = 'children'
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('parents.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    dob = db.Column(db.Date, nullable=False)
    # Country for schedule selection (e.g., 'India', 'UK').
    # Keep nullable=True for backward compatibility with existing DBs created before this column existed.
    country = db.Column(db.String(50), nullable=True, default='India')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship to Vaccination records
    vaccinations = db.relationship('Vaccination', back_populates='child', cascade='all, delete-orphan')
    parent = db.relationship('Parent', back_populates='children')

    def __repr__(self):
        return f"<Child {self.id} {self.name}>"


class Vaccination(db.Model):
    __tablename__ = 'vaccinations'
    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('children.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    completed_at = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    child = db.relationship('Child', back_populates='vaccinations')

    __table_args__ = (
        db.UniqueConstraint('child_id', 'name', name='uq_child_vaccine_name'),
    )

    def __repr__(self):
        return f"<Vaccination {self.id} child={self.child_id} {self.name} completed={self.completed_at is not None}>"
