import pytest

from crm_tools.normalize import normalize_email, normalize_name, normalize_phone


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("0151 234 5678", "+491512345678"),
        ("0049 (30) 123-456", "+4930123456"),
        ("+1 514 555 0199", "+15145550199"),
        ("12", ""),
        (None, ""),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


def test_normalize_email():
    assert normalize_email("  Anna@Example.DE ") == "anna@example.de"
    assert normalize_email("not-an-email") == ""


def test_normalize_name_fixes_caps_but_keeps_mixed_case():
    assert normalize_name("ANNA  SCHMIDT") == "Anna Schmidt"
    assert normalize_name("jonas weber") == "Jonas Weber"
    assert normalize_name("Anne-Marie McDonald") == "Anne-Marie McDonald"
