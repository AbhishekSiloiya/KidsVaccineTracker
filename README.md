# VaccinationTracker (Flask Edition)

Track children's vaccination schedules (multi-country schedule support) with a Flask backend, server-side persistence, auth, schedule computation, calendar export, and downloadable vaccination-record PDFs.

## ✨ Features

- Parent registration / login (session auth)
- Multiple children per parent
- Automatic schedule generation from DOB
- Status tracking: Upcoming / Due (incl. due today) / Completed
- Group completion per age milestone
- Dashboard stats: overdue, due soon (≤30 days), upcoming
- Vaccination Record PDF download from Child Profile
  - grouped by schedule milestones (e.g. 8 Weeks, 12 Weeks)
  - top summary stats (Overdue / Due Soon / Complete)
  - status/date traffic-light coloring
  - child initials in filename and child/parent names in header
- ICS calendar export (aggregate events)
- Responsive UI (Tailwind CDN + semantic `vt-` classes)
- Desktop Child Profile top panel optimized to compact 3-row actions layout
- PWA basics: `manifest.json`, `sw.js` (offline shell)
- Consistent date formatting via Jinja filters

## 🧑‍💻 Tech Stack

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

python main.py
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
pytest

flake8 app tests
```

Tests included:
```
tests/
	conftest.py      # fixtures (app, in-memory DB)
	test_schedule.py # schedule & status logic
	test_models.py   # relationships & cascade delete
	test_auth.py     # register/login
	test_vaccine_record_pdf.py # PDF auth, logic, grouping, stats
```
Current local suite status: `27 passed`.

## 📦 CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. Matrix (3.10–3.12) run tests + coverage
2. Lint (flake8)
3. Security (bandit + safety)
4. Build artifact (main)

Note: GitHub Release entries are not auto-created by the current workflow.

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

## 📄 Vaccine Record PDF

From Child Profile, users can download a vaccination-record PDF that includes:
- generated date + parent/child identity header
- grouped schedule sections by age milestone
- status/date with traffic-light colors
- quick top stats (Overdue, Due Soon, Complete/Total)
- compact single-page output for current MVP scope

## 🧱 Project Structure (excerpt)

```
app/               # Flask app package (models, views, schedule_data)
app/template/      # Jinja2 templates
app/static/css/    # stylesheet assets
tests/             # pytest suite
docs/              # release notes + QA docs
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

1. Branch from `main`
2. Add tests for new logic
3. Run quality checks (tests, lint, security)
    ```cmd
    cd tests
    pytest test_auth.py
    pytest test_models.py
    pytest test_schedule.py
    ```
4. Open PR with description & rationale

## 📄 License

MIT.
