from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from . import db
from .models import Parent

auth = Blueprint('auth', __name__, template_folder='template')


def _current_parent():
	pid = session.get('parent_id')
	if not pid:
		return None
	return Parent.query.get(pid)


def login_required(f):
	"""Simple login-required decorator redirecting to login if no parent session."""
	@wraps(f)
	def wrapper(*args, **kwargs):
		if not session.get('parent_id'):
			flash('Please log in to access this page.', 'error')
			return redirect(url_for('auth.login'))
		return f(*args, **kwargs)
	return wrapper


@auth.route('/register', methods=['GET', 'POST'])
def register():
	if request.method == 'POST':
		name = request.form.get('name', '').strip()
		email = request.form.get('email', '').strip().lower()
		age = request.form.get('age', '').strip()
		password = request.form.get('password', '')
		errors = []
		if not name:
			errors.append('Name required.')
		if not email:
			errors.append('Email required.')
		if not age:
			errors.append('Age required.')
		if Parent.query.filter_by(email=email).first():
			errors.append('Email already registered.')
		try:
			age_val = int(age) if age else None
		except ValueError:
			errors.append('Age must be a number.')
			age_val = None
		if age and age_val is not None and age_val < 18:
			errors.append('Parent must be at least 18 years old.')
		if len(password) < 6:
			errors.append('Password must be at least 6 characters.')
		if not errors:
			parent = Parent(name=name, email=email, age=age_val, password_hash=generate_password_hash(password))
			db.session.add(parent)
			db.session.commit()
			session['parent_id'] = parent.id
			return redirect(url_for('views.dashboard'))
		return render_template('parent_register.html', errors=errors, form={'name': name, 'email': email, 'age': age})
	return render_template('parent_register.html')


@auth.route('/login', methods=['GET', 'POST'])
def login():
	if request.method == 'POST':
		email = request.form.get('email', '').strip().lower()
		password = request.form.get('password', '')
		parent = Parent.query.filter_by(email=email).first()
		if parent and check_password_hash(parent.password_hash, password):
			session['parent_id'] = parent.id
			return redirect(url_for('views.dashboard'))
		flash('Invalid credentials', 'error')
	return render_template('parent_login.html')


@auth.route('/logout')
def logout():
	session.pop('parent_id', None)
	return redirect(url_for('auth.login'))


@auth.route('/parent/<int:parent_id>', methods=['GET', 'POST'])
@login_required
def parent_profile(parent_id):
	parent = _current_parent()
	if not parent or parent.id != parent_id:
		return redirect(url_for('auth.login'))
	errors = []
	if request.method == 'POST':
		name = request.form.get('name', '').strip()
		age = request.form.get('age', '').strip()
		if not name:
			errors.append('Name required.')
		if not age:
			errors.append('Age required.')
		try:
			age_val = int(age) if age else None
		except ValueError:
			errors.append('Age must be a number.')
			age_val = parent.age
		if age and age_val is not None and age_val < 18:
			errors.append('Parent must be at least 18 years old.')
		if not errors:
			parent.name = name
			parent.age = age_val
			db.session.commit()
			flash('Profile updated', 'success')
			return redirect(url_for('auth.parent_profile', parent_id=parent.id))
	return render_template('parent_profile.html', parent=parent, errors=errors)


@auth.app_context_processor
def inject_parent():
	return {'current_parent': _current_parent()}
