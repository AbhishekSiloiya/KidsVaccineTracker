# VaccinationTracker (Flask Edition)

Track children's vaccination schedules (IAP 2024 – India) with a Flask backend, server‑side persistence, auth, schedule computation, and calendar export.

## ✨ Features

- Parent registration / login (session auth)
- Multiple children per parent
- Automatic schedule generation from DOB
- Status tracking: Upcoming / Due (incl. due today) / Completed
- Group completion per age milestone
- Dashboard stats: overdue, due soon (≤30 days), upcoming
- ICS calendar export (aggregate events)
- Responsive UI (Tailwind CDN + semantic `vt-` classes)
- PWA basics: `manifest.json`, `sw.js` (offline shell)
- Consistent date formatting via Jinja filters

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Flask 3 |
| ORM | Flask-SQLAlchemy (SQLite default) |
| Templates | Jinja2 |
| Styling | Tailwind CDN + custom CSS |
| Env Config | python-dotenv |
| Tests | pytest + coverage |
| Lint / Sec | flake8, bandit, safety |

## 🚀 Quick Start

```powershell
git clone https://github.com/AbhishekSiloiya/KidsVaccineTracker.git
cd KidsVaccineTracker
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Optional: create .env
"SECRET_KEY=dev-secret" | Out-File -Append .env

python main.py   # http://127.0.0.1:5000/
```

Default DB: `instance/children.db` (auto-created). Override with `DATABASE_URL` (or `SQLALCHEMY_DATABASE_URI`).

## ⚙️ Configuration (.env)

| Key | Purpose | Default |
|-----|---------|---------|
| SECRET_KEY | Session signing | dev-insecure-change-me |
| DATABASE_URL | SQLAlchemy connection | SQLite file |

Example:
```
SECRET_KEY=change-me
DATABASE_URL=sqlite:///instance/children.db
```

## 🧪 Testing & Quality

Tools: `pytest`, `coverage`, `flake8`, `bandit`, `safety`.

```powershell
pytest --cov=app --cov-report=term --cov-report=xml
flake8 app tests
bandit -r app
safety check -r requirements.txt
```

Tests included:
```
tests/
	conftest.py      # fixtures (app, in-memory DB)
	test_schedule.py # schedule & status logic
	test_models.py   # relationships & cascade delete
	test_auth.py     # register/login
```
Planned: dashboard stats, completion endpoint, negative auth cases.

## 📦 CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. Matrix (3.10–3.12) run tests + coverage
2. Lint (flake8)
3. Security (bandit + safety)
4. Build artifact (main)
5. Release publish (main)

## 🗄 Database

- Auto `db.create_all()` for development.
- Consider Alembic for production migrations.
- Cascade delete: Parent → Children → Vaccinations.
- Unique per child per vaccine name.

## 🔐 Auth

- Session-based with password hashing (Werkzeug).
- Add rate limiting & stronger policies for production.

## 📅 Calendar Export

ICS file groups events by age band (one event containing multiple vaccines) for cleaner calendar views.

## 🧱 Project Structure (excerpt)

```
app/               # Flask app package (models, views, schedule_data)
templates/         # Jinja2 templates
static/css/        # style.css, responsive.css
manifest.json      # PWA manifest
sw.js              # service worker
tests/             # pytest suite
requirements.txt   # pinned dependencies
main.py            # entry point (create_app wrapper)
```

## 🧹 Maintenance

```powershell
# Reset dev DB
Remove-Item instance\children.db -ErrorAction Ignore
python main.py

# Production example (Linux deploy)
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:8000 main:app
```

## 🛡 Hardening Roadmap

- CSRF tokens (Flask-WTF)
- HTTPS / proxy headers
- CSP headers
- Rate limiting (Flask-Limiter)
- Alembic migrations
- Coverage threshold gate in CI

## 🤝 Contributing

1. Branch from `develop`
2. Add tests for new logic
3. Run quality checks (tests, lint, security)
4. Open PR with description & rationale

## 📄 License

MIT (add `LICENSE` file if not yet present).

---

Legacy static JS instructions removed. Use the Flask server workflow above.