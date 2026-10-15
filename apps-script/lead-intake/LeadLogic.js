/**
 * Pure functions used by the lead intake script.
 * They don't touch any Google service, so they can be tested with Node (see apps-script/test).
 */

/** Lowercases and trims an email. Returns '' for empty input. */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Turns German phone numbers into E.164 (+49...). Keeps other international numbers.
 * "0151 234 5678" -> "+491512345678", "0049 30 123456" -> "+4930123456".
 * Returns '' when nothing usable is left.
 */
function normalizePhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = '49' + digits.slice(1);
  }
  return digits.length >= 8 ? '+' + digits : '';
}

/**
 * Rule-based lead classification. Rules are checked in order, the first match wins.
 * Each rule: { category, keywords: [...] }. Matching ignores case.
 */
function classifyLead(message, rules) {
  const text = String(message || '').toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((k) => text.includes(String(k).toLowerCase()))) {
      return rule.category;
    }
  }
  return 'Other';
}

/** Priority from the lead's budget and timeline answers in the form. */
function scoreLead(lead) {
  let score = 0;
  const budget = Number(String(lead.budget || '').replace(/[^\d]/g, '')) || 0;
  if (budget >= 5000) score += 2;
  else if (budget >= 1000) score += 1;
  const timeline = String(lead.timeline || '').toLowerCase();
  if (timeline.includes('asap') || timeline.includes('sofort') || timeline.includes('this month')) score += 2;
  else if (timeline.includes('3 months') || timeline.includes('quarter')) score += 1;
  if (lead.phone) score += 1;
  if (score >= 4) return 'High';
  if (score >= 2) return 'Medium';
  return 'Low';
}

/**
 * Finds the row of an existing lead with the same email or phone.
 * existing: array of { email, phone, row }. Returns the row number or -1.
 */
function findDuplicateRow(lead, existing) {
  const email = normalizeEmail(lead.email);
  const phone = normalizePhone(lead.phone);
  const match = existing.find(
    (e) => (email && normalizeEmail(e.email) === email) || (phone && normalizePhone(e.phone) === phone)
  );
  return match ? match.row : -1;
}

/** Maps a form response (question title -> answer) to a lead object using the column config. */
function toLead(namedValues, fieldMap) {
  const pick = (question) => {
    const value = namedValues[question];
    return Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim();
  };
  return {
    name: pick(fieldMap.name),
    email: normalizeEmail(pick(fieldMap.email)),
    phone: normalizePhone(pick(fieldMap.phone)),
    city: pick(fieldMap.city),
    message: pick(fieldMap.message),
    budget: pick(fieldMap.budget),
    timeline: pick(fieldMap.timeline),
  };
}

// Apps Script has no module system. This line only runs under Node, for the tests.
if (typeof module !== 'undefined') {
  module.exports = { normalizeEmail, normalizePhone, classifyLead, scoreLead, findDuplicateRow, toLead };
}
