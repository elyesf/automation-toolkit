"""Clean a contact export and merge duplicates.

Usage:
    python -m crm_tools.clean_contacts input.csv cleaned.csv

Expected columns: name, email, phone, company, updated_at (YYYY-MM-DD).
Rows are duplicates when they share an email or a phone number. For each group the most
recently updated row wins, and empty fields are filled from the older rows.
"""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass, field
from pathlib import Path

from .normalize import normalize_email, normalize_name, normalize_phone

FIELDS = ["name", "email", "phone", "company", "updated_at"]


@dataclass
class CleanResult:
    contacts: list[dict[str, str]]
    rows_in: int = 0
    merged: int = 0
    dropped: list[int] = field(default_factory=list)  # line numbers without email and phone


def clean_rows(rows: list[dict[str, str]]) -> CleanResult:
    result = CleanResult(contacts=[], rows_in=len(rows))
    groups: list[list[dict[str, str]]] = []
    by_key: dict[str, int] = {}

    for line, row in enumerate(rows, start=2):  # line 1 is the header
        contact = {
            "name": normalize_name(row.get("name")),
            "email": normalize_email(row.get("email")),
            "phone": normalize_phone(row.get("phone")),
            "company": " ".join((row.get("company") or "").split()),
            "updated_at": (row.get("updated_at") or "").strip(),
        }
        if not contact["email"] and not contact["phone"]:
            result.dropped.append(line)
            continue

        keys = [f"e:{contact['email']}" if contact["email"] else "", f"p:{contact['phone']}" if contact["phone"] else ""]
        keys = [k for k in keys if k]
        group_index = next((by_key[k] for k in keys if k in by_key), None)
        if group_index is None:
            group_index = len(groups)
            groups.append([])
        groups[group_index].append(contact)
        for k in keys:
            by_key.setdefault(k, group_index)

    for group in groups:
        result.merged += len(group) - 1
        result.contacts.append(merge(group))
    return result


def merge(group: list[dict[str, str]]) -> dict[str, str]:
    """Newest row first (ISO dates sort as text), then fill its gaps from older rows."""
    ordered = sorted(group, key=lambda c: c["updated_at"], reverse=True)
    merged = dict(ordered[0])
    for older in ordered[1:]:
        for key, value in older.items():
            if not merged.get(key) and value:
                merged[key] = value
    return merged


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args(argv)

    with args.input.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    result = clean_rows(rows)

    with args.output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(result.contacts)

    print(f"Read {result.rows_in} rows, wrote {len(result.contacts)} contacts")
    print(f"Merged {result.merged} duplicates, rows without email or phone dropped: {len(result.dropped)}")
    if result.dropped:
        print("Dropped lines: " + ", ".join(map(str, result.dropped)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
