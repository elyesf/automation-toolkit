"""Weekly lead report as Markdown, ready to paste into an email or a wiki.

Usage:
    python -m crm_tools.weekly_report leads.csv --week 2026-10-12 > report.md

Expected columns: received (YYYY-MM-DD), category, priority, status.
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

CLOSED_WON = "Won"
CLOSED_LOST = "Lost"


def week_bounds(any_day: date) -> tuple[date, date]:
    """Monday and Sunday of the week that contains any_day."""
    monday = any_day - timedelta(days=any_day.weekday())
    return monday, monday + timedelta(days=6)


def build_report(rows: list[dict[str, str]], any_day: date) -> str:
    monday, sunday = week_bounds(any_day)
    prev_monday = monday - timedelta(days=7)

    def received(row: dict[str, str]) -> date | None:
        try:
            return date.fromisoformat((row.get("received") or "")[:10])
        except ValueError:
            return None

    this_week = [r for r in rows if (d := received(r)) and monday <= d <= sunday]
    last_week = [r for r in rows if (d := received(r)) and prev_monday <= d < monday]

    statuses = Counter(r.get("status", "") for r in rows)
    closed = statuses[CLOSED_WON] + statuses[CLOSED_LOST]
    win_rate = f"{statuses[CLOSED_WON] / closed:.0%}" if closed else "n/a"
    change = len(this_week) - len(last_week)

    lines = [
        f"# Lead report, week of {monday:%d.%m.%Y} to {sunday:%d.%m.%Y}",
        "",
        f"- New leads: **{len(this_week)}** ({change:+d} vs. last week)",
        f"- High priority: **{sum(1 for r in this_week if r.get('priority') == 'High')}**",
        f"- Open pipeline (all time): **{len(rows) - closed}**",
        f"- Win rate of closed leads: **{win_rate}**",
        "",
        "## New leads by category",
        "",
        "| Category | Leads |",
        "|---|---|",
    ]
    for category, count in Counter(r.get("category") or "Other" for r in this_week).most_common():
        lines.append(f"| {category} | {count} |")
    if not this_week:
        lines.append("| (none) | 0 |")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", type=Path)
    parser.add_argument("--week", type=date.fromisoformat, default=date.today(), help="any day in the week")
    args = parser.parse_args(argv)

    with args.input.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    sys.stdout.write(build_report(rows, args.week))
    return 0


if __name__ == "__main__":
    sys.exit(main())
