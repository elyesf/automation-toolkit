# Automation Toolkit

![CI](https://github.com/elyesf/automation-toolkit/actions/workflows/ci.yml/badge.svg)

Small, tested automations for teams that run their sales on Google Sheets and email.

In my freelance work I automate business processes for a small company: a lead pipeline from a web form into a Google Sheets CRM, follow-ups and documentation. That code belongs to the client, so this repo **rebuilds the lead intake idea with my own code, generic config and fake sample data**, plus a few tools that fit next to it (reminders, contact cleanup, a weekly report). No client code or data is included.

**Stack:** Google Apps Script (JavaScript, V8) · Google Sheets · Python 3 · Node test runner · pytest · GitHub Actions

## What's inside

### 1. Lead intake (`apps-script/lead-intake`)

A Google Form submission becomes one clean row in the Sheets CRM.

```
Form submit -> normalise email/phone -> duplicate? -> yes: add note to existing row
                                                  -> no:  classify + score -> new CRM row -> email to sales
```

- Normalises emails and German phone numbers to E.164 (`0151 234 5678` -> `+491512345678`).
- Detects returning contacts by email **or** phone, and adds the new message to their row instead of creating a duplicate.
- Rule-based category from keywords and a priority score from budget, timeline and phone.
- Optional: asks the OpenAI API for a category when no rule matches. The answer is only accepted if it is one of the known categories.
- Uses `LockService` so two submissions at the same moment can't both pass the duplicate check.

### 2. Follow-up reminders (`apps-script/follow-up-reminders`)

A daily trigger finds open leads with no update for 3 days, highlights those rows and sends each owner **one** email with their list.

### 3. Python CRM tools (`python/crm_tools`)

For CRM exports, for example before importing into a new system.

```bash
cd python
python -m crm_tools.clean_contacts sample_data/contacts.csv cleaned.csv
# Read 6 rows, wrote 3 contacts
# Merged 2 duplicates, rows without email or phone dropped: 1

python -m crm_tools.weekly_report sample_data/leads.csv --week 2026-10-15
# # Lead report, week of 12.10.2026 to 18.10.2026
# - New leads: **4** (+1 vs. last week)
# ...
```

- `clean_contacts`: merges duplicates by email or phone, the newest row wins and empty fields are filled from older rows.
- `weekly_report`: Markdown summary with new leads vs. last week, high priority count, open pipeline, win rate and leads per category.

Standard library only, so it runs on any Python 3.10+ without installing anything.

## How it's built

The Apps Script files are split into **logic** (`LeadLogic.js`, `ReminderLogic.js`) and **Google glue** (`Code.js`). The logic files don't call any Google service, so they run under Node and are tested in CI. One line at the end exports them for Node and is ignored by Apps Script:

```js
if (typeof module !== 'undefined') module.exports = { ... };
```

Settings that change per client (sheet name, form questions, keywords, email) are in `Config.js`.

## Set it up in Google Sheets

1. Create a Google Form and link it to a spreadsheet.
2. In the spreadsheet: Extensions > Apps Script. Copy in the files from `apps-script/lead-intake` (or push them with [clasp](https://github.com/google/clasp)).
3. Edit `Config.js` so `fieldMap` matches your form's question titles.
4. Run `setup()` once and accept the permissions. It creates the sheet header and the form trigger.
5. Optional: add `OPENAI_API_KEY` under Project Settings > Script properties and set `useAiFallback: true`.

For reminders, add the files from `apps-script/follow-up-reminders` and run `setupDailyTrigger()` once.

## Run the tests

```bash
npm test                        # Apps Script logic, Node 18+
cd python && pip install pytest && pytest
```

---

Elyes Zarrad · [LinkedIn](https://www.linkedin.com/in/Elyes-Zarrad)
