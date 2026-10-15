/**
 * Lead intake for a Google Sheets CRM.
 *
 * Trigger: "On form submit" from the spreadsheet linked to a Google Form.
 * For each new response it normalises the contact data, checks for duplicates,
 * classifies and scores the lead, writes one CRM row and emails a short notification.
 */

/** Run once from the editor: creates the sheet header and installs the trigger. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetName) || ss.insertSheet(CONFIG.sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.columns);
    sheet.setFrozenRows(1);
  }
  const exists = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'onLeadSubmitted');
  if (!exists) {
    ScriptApp.newTrigger('onLeadSubmitted').forSpreadsheet(ss).onFormSubmit().create();
  }
}

/** Installable trigger handler. e.namedValues maps question titles to answers. */
function onLeadSubmitted(e) {
  // Two submissions at the same moment must not both pass the duplicate check
  const lock = LockService.getScriptLock();
  lock.waitLock(30 * 1000);
  try {
    const lead = toLead(e.namedValues, CONFIG.fieldMap);
    if (!lead.email && !lead.phone) {
      console.warn('Lead without email or phone skipped', lead.name);
      return;
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetName);
    const duplicateRow = findDuplicateRow(lead, readContacts_(sheet));
    if (duplicateRow > 0) {
      appendNote_(sheet, duplicateRow, lead.message);
      return;
    }

    let category = classifyLead(lead.message, CONFIG.categoryRules);
    if (category === 'Other' && CONFIG.useAiFallback) {
      category = classifyWithAi_(lead.message) || 'Other';
    }
    const priority = scoreLead(lead);
    const now = new Date();

    sheet.appendRow([now, lead.name, lead.email, lead.phone, lead.city, category, priority, 'New', '', now, lead.message]);
    notify_(lead, category, priority);
  } finally {
    lock.releaseLock();
  }
}

/** Reads email and phone of all existing rows in one call (much faster than cell by cell). */
function readContacts_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const emailCol = CONFIG.columns.indexOf('Email') + 1;
  const values = sheet.getRange(2, emailCol, lastRow - 1, 2).getValues();
  return values.map((v, i) => ({ email: v[0], phone: v[1], row: i + 2 }));
}

/** A returning contact gets their new message appended instead of a second row. */
function appendNote_(sheet, row, message) {
  const messageCol = CONFIG.columns.indexOf('Message') + 1;
  const updateCol = CONFIG.columns.indexOf('Last update') + 1;
  const cell = sheet.getRange(row, messageCol);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  cell.setValue(`${cell.getValue()}\n[${stamp}] ${message}`.trim());
  sheet.getRange(row, updateCol).setValue(new Date());
}

function notify_(lead, category, priority) {
  const subject = `New ${priority.toLowerCase()} priority lead: ${lead.name || lead.email}`;
  const body = [
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `City: ${lead.city}`,
    `Category: ${category}`,
    '',
    lead.message,
    '',
    SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  ].join('\n');
  MailApp.sendEmail(CONFIG.notifyEmail, subject, body);
}

/** Optional fallback: asks the OpenAI API to pick one of the configured categories. */
function classifyWithAi_(message) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey || !message) return null;
  const categories = CONFIG.categoryRules.map((r) => r.category).concat('Other');
  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${apiKey}` },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: `Answer with exactly one of: ${categories.join(', ')}.` },
        { role: 'user', content: message },
      ],
    }),
  });
  if (response.getResponseCode() !== 200) {
    console.warn('AI classification failed', response.getResponseCode());
    return null;
  }
  const answer = JSON.parse(response.getContentText()).choices[0].message.content.trim();
  // Never trust free text: only accept a category we know
  return categories.includes(answer) ? answer : null;
}
