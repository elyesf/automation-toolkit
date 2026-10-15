import csv
from datetime import date
from pathlib import Path

from crm_tools.weekly_report import build_report, week_bounds

SAMPLE = Path(__file__).parent.parent / "sample_data" / "leads.csv"


def rows():
    with SAMPLE.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_week_bounds_start_on_monday():
    assert week_bounds(date(2026, 10, 15)) == (date(2026, 10, 12), date(2026, 10, 18))


def test_report_counts_this_week_and_compares_to_last_week():
    report = build_report(rows(), date(2026, 10, 15))

    assert "New leads: **4** (+1 vs. last week)" in report
    assert "High priority: **2**" in report
    assert "Win rate of closed leads: **67%**" in report
    assert "| Installation | 2 |" in report
