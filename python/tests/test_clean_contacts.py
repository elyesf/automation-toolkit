import csv
from pathlib import Path

from crm_tools.clean_contacts import clean_rows, main

SAMPLE = Path(__file__).parent.parent / "sample_data" / "contacts.csv"


def read_sample():
    with SAMPLE.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_duplicates_are_merged_by_email_or_phone():
    result = clean_rows(read_sample())

    assert result.rows_in == 6
    assert len(result.contacts) == 3
    assert result.merged == 2
    assert result.dropped == [7]


def test_newest_row_wins_and_gaps_are_filled():
    anna = next(c for c in clean_rows(read_sample()).contacts if c["name"] == "Anna Schmidt")

    assert anna["company"] == "Bäckerei Klein GmbH"  # from the newer row
    assert anna["phone"] == "+491512345678"  # filled from the older row
    assert anna["updated_at"] == "2026-10-02"


def test_cli_writes_csv(tmp_path, capsys):
    out = tmp_path / "cleaned.csv"

    assert main([str(SAMPLE), str(out)]) == 0

    with out.open(newline="", encoding="utf-8") as f:
        assert len(list(csv.DictReader(f))) == 3
    assert "Merged 2 duplicates" in capsys.readouterr().out
