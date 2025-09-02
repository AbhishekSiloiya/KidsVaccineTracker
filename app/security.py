import re
from html import escape


DISALLOWED_KEYWORDS = {
    'select', 'insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create',
    'grant', 'revoke', 'union', 'sleep', 'benchmark', '--', ';', '/*', '*/'
}

def has_disallowed_keywords(value: str) -> bool:
    if value is None:
        return False
    low = str(value).lower()
    return any(kw in low for kw in DISALLOWED_KEYWORDS)


def sanitize_text(value: str, max_len: int = 200) -> str:
    """Basic server-side sanitization to mitigate XSS and SQL injection attempts.

    - Strips control chars
    - Removes angle brackets and suspicious tag starts
    - Collapses whitespace
    - Blocks obvious SQL keywords/operators
    - Trims to max_len
    Returns safe string (escaped for HTML output).
    """
    if value is None:
        return ''
    # Normalize to string and strip non-printable control chars
    s = str(value)
    s = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", s)
    # Remove common script and tag patterns
    s = re.sub(r"<\s*/?\s*script[^>]*>", "", s, flags=re.I)
    s = s.replace('<', '').replace('>', '')
    # Disallow common SQL injection tokens/keywords (case-insensitive remove)
    for kw in DISALLOWED_KEYWORDS:
        s = re.sub(re.escape(kw), '', s, flags=re.I)
    # Collapse whitespace and trim
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > max_len:
        s = s[:max_len]
    # Escape for HTML contexts as a final safety
    return escape(s)


def validate_name(name: str, field_label: str = 'Name') -> list[str]:
    """Allow Unicode letters, digits, spaces, hyphen (-), and apostrophes (straight or curly).

    Disallow other punctuation and symbols. Enforce minimum length of 2.
    """
    errs: list[str] = []
    if name is None:
        errs.append(f'{field_label} is required.')
        return errs
    s = name.strip()
    if len(s) < 2:
        errs.append(f'{field_label} must be at least 2 characters.')
        return errs

    allowed_extra = {"-", "'", "’", " "}
    invalid = False
    for ch in s:
        if ch.isalpha() or ch.isdigit() or ch.isspace() or ch in allowed_extra:
            continue
        invalid = True
        break
    if invalid:
        errs.append(f'{field_label} contains invalid characters.')
    return errs


def validate_email(email: str) -> list[str]:
    errs = []
    if not email:
        errs.append('Email is required.')
        return errs
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        errs.append('Invalid email format.')
    return errs
