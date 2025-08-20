from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv  # type: ignore
load_dotenv()

db = SQLAlchemy()

def create_app():
    # Use package's own static directory (app/static) to avoid picking up outdated root-level duplicates
    app = Flask(__name__, static_folder='static', static_url_path='/static', template_folder='template')
    # Configuration sourced from environment variables with safe fallbacks
    # SECRET_KEY should ALWAYS be overridden in a real deployment
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-insecure-change-me')

    db_url = os.environ.get('DATABASE_URL') or os.environ.get('SQLALCHEMY_DATABASE_URI')
    if not db_url:
        # Default to a local SQLite file inside instance/ for easier persistence & separation
        instance_path = os.path.join(os.path.abspath(os.path.join(app.root_path, '..')), 'instance')
        os.makedirs(instance_path, exist_ok=True)
        db_url = 'sqlite:///' + os.path.join(instance_path, 'children.db').replace('\\', '/')
    else:
        # If user supplied a SQLite URL, ensure its directory exists and make relative paths absolute
        if db_url.startswith('sqlite:///'):
            raw_path = db_url.replace('sqlite:///', '', 1)
            # Expand user (~) and environment vars
            raw_path = os.path.expandvars(os.path.expanduser(raw_path))
            if not os.path.isabs(raw_path):
                # Treat relative paths as relative to the project root (one level above app package)
                project_root = os.path.abspath(os.path.join(app.root_path, '..'))
                raw_path = os.path.join(project_root, raw_path)
            # Ensure parent directory exists
            os.makedirs(os.path.dirname(raw_path), exist_ok=True)
            # Reconstruct URI with normalized separators
            db_url = 'sqlite:///' + raw_path.replace('\\', '/')
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    # Import models so SQLAlchemy registers them
    from .models import Child, Parent  # noqa: F401

    with app.app_context():
        db.create_all()
        # Lightweight migration for existing SQLite DBs: add 'country' column to children if missing
        try:
            from sqlalchemy import text
            engine = db.engine
            with engine.connect() as conn:
                res = conn.execute(text("PRAGMA table_info(children)"))
                cols = {row[1] for row in res}  # row[1] is column name
                if 'country' not in cols:
                    # Add nullable column with default 'India'
                    conn.execute(text("ALTER TABLE children ADD COLUMN country VARCHAR(50)"))
                    # Initialize nulls to 'India'
                    conn.execute(text("UPDATE children SET country = 'India' WHERE country IS NULL"))
                    conn.commit()
        except Exception:
            # Best-effort; ignore if database isn't SQLite or migration not applicable
            pass

    from .views import views
    from .auth import auth

    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/auth/')

    return app