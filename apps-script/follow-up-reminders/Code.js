/**
 * Daily follow-up reminder for the Sheets CRM.
 * Every morning it finds open leads with no update for REMINDER_DAYS days,
 * highlights those rows and sends each owner one email with their list.
 */

const REMINDER_DAYS = 3;
const SHEET_NAME = 'Leads';
const FALLBACK_EMAIL = 'sales@example.com';
const HIGHLIGHT = '#fde7e9';

/** Run once: installs a time trigger between 8 and 9 in the script's time zone. */
function setupDailyTrigger() {
  const exists = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'sendFollowUpReminders');
  if (!exists) {
    ScriptApp.newTrigger('sendFollowUpReminders').timeBased().everyDays(1).atHour(8).create();
  }
}

function sendFollowUpReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const range = sheet.getDataRange();
  const rows = range.getValues();
  const stale = findStaleLeads(rows, new Date(), REMINDER_DAYS);

  // Reset old highlights, then mark the current stale rows
  if (rows.length > 1) {
    sheet.getRange(2, 1, rows.length - 1, rows[0].length).setBackground(null);
  }
  stale.forEach((lead) => sheet.getRange(lead.row, 1, 1, rows[0].length).setBackground(HIGHLIGHT));

  const groups = groupByOwner(stale, FALLBACK_EMAIL);
  Object.keys(groups).forEach((owner) => {
    MailApp.sendEmail(owner, `${groups[owner].length} leads waiting for a follow-up`, reminderText(groups[owner], ss.getUrl()));
  });
  console.log(`Reminders sent for ${stale.length} leads to ${Object.keys(groups).length} owners`);
}
