"""Normalisation helpers shared by the tools. Same rules as the Apps Script version."""

import re

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$")


def normalize_email(value: str | None) -> str:
    """Trim and lowercase. Returns '' if the result does not look like an email."""
    email = (value or "").strip().lower()
    return email if EMAIL_PATTERN.match(email) else ""


def normalize_phone(value: str | None, default_country: str = "49") -> str:
    """Return the number in E.164 (+49...) or '' if too short to be real.

    "0151 234 5678" -> "+491512345678", "0049 30 123456" -> "+4930123456".
    """
    raw = (value or "").strip()
    if not raw:
        return ""
    digits = re.sub(r"\D", "", raw)
    if raw.startswith("+"):
        pass
    elif digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = default_country + digits[1:]
    return "+" + digits if len(digits) >= 8 else ""


def normalize_name(value: str | None) -> str:
    """Collapse spaces and fix ALL CAPS or all lowercase names. Mixed case is kept as typed."""
    name = " ".join((value or "").split())
    if name.isupper() or name.islower():
        name = " ".join(part.capitalize() for part in name.split(" "))
    return name
