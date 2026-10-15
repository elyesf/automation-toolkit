/**
 * Pure logic for the daily follow-up reminder. No Google services here, so it is testable with Node.
 */

const OPEN_STATUSES = ['New', 'Contacted', 'Offer sent'];

/** Whole days between two dates, ignoring the time of day. */
function daysBetween(from, to) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86400000);
}

/**
 * Returns open leads with no update for at least maxDays.
 * rows: 2D array from the sheet including the header row.
 */
function findStaleLeads(rows, today, maxDays) {
  if (rows.length < 2) return [];
  const header = rows[0];
  const col = (name) => header.indexOf(name);
  const required = ['Name', 'Status', 'Owner', 'Last update'];
  const missing = required.filter((name) => col(name) === -1);
  if (missing.length) {
    throw new Error('Missing columns: ' + missing.join(', '));
  }

  const stale = [];
  rows.slice(1).forEach((row, i) => {
    const status = String(row[col('Status')]).trim();
    const updated = row[col('Last update')];
    if (!OPEN_STATUSES.includes(status) || !(updated instanceof Date)) return;
    const age = daysBetween(updated, today);
    if (age >= maxDays) {
      stale.push({
        row: i + 2,
        name: row[col('Name')],
        status,
        owner: String(row[col('Owner')] || '').trim(),
        daysSinceUpdate: age,
      });
    }
  });
  return stale.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

/** Groups stale leads by owner email. Leads without an owner go to the fallback address. */
function groupByOwner(staleLeads, fallbackEmail) {
  return staleLeads.reduce((groups, lead) => {
    const key = lead.owner || fallbackEmail;
    (groups[key] = groups[key] || []).push(lead);
    return groups;
  }, {});
}

/** Plain text email body for one owner. */
function reminderText(leads, sheetUrl) {
  const lines = leads.map((l) => `- ${l.name} (${l.status}, ${l.daysSinceUpdate} days, row ${l.row})`);
  return [`These ${leads.length} leads need a follow-up:`, '', ...lines, '', sheetUrl].join('\n');
}

if (typeof module !== 'undefined') {
  module.exports = { daysBetween, findStaleLeads, groupByOwner, reminderText, OPEN_STATUSES };
}
