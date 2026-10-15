const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEmail, normalizePhone, classifyLead, scoreLead, findDuplicateRow, toLead,
} = require('../lead-intake/LeadLogic.js');

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Anna.Schmidt@Example.DE '), 'anna.schmidt@example.de');
  assert.equal(normalizeEmail(null), '');
});

test('normalizePhone turns German formats into E.164', () => {
  assert.equal(normalizePhone('0151 234 5678'), '+491512345678');
  assert.equal(normalizePhone('0049 (30) 123-456'), '+4930123456');
  assert.equal(normalizePhone('+1 514 555 0199'), '+15145550199');
  assert.equal(normalizePhone('123'), '');
  assert.equal(normalizePhone(''), '');
});

test('classifyLead uses the first matching rule', () => {
  const rules = [
    { category: 'Installation', keywords: ['install'] },
    { category: 'Maintenance', keywords: ['repair', 'leak'] },
  ];
  assert.equal(classifyLead('Can you INSTALL and repair it?', rules), 'Installation');
  assert.equal(classifyLead('There is a leak', rules), 'Maintenance');
  assert.equal(classifyLead('Just a question', rules), 'Other');
});

test('scoreLead combines budget, timeline and phone', () => {
  assert.equal(scoreLead({ budget: '8.000 EUR', timeline: 'ASAP', phone: '+49151' }), 'High');
  assert.equal(scoreLead({ budget: '1500', timeline: 'later', phone: '+49151' }), 'Medium');
  assert.equal(scoreLead({ budget: '1500', timeline: 'later' }), 'Low');
  assert.equal(scoreLead({ budget: '', timeline: '' }), 'Low');
});

test('findDuplicateRow matches by email or phone, in any format', () => {
  const existing = [
    { email: 'a@b.de', phone: '', row: 2 },
    { email: '', phone: '+491512345678', row: 3 },
  ];
  assert.equal(findDuplicateRow({ email: 'A@B.de' }, existing), 2);
  assert.equal(findDuplicateRow({ phone: '0151 2345678' }, existing), 3);
  assert.equal(findDuplicateRow({ email: 'new@b.de', phone: '0170 1111111' }, existing), -1);
});

test('toLead maps form answers to lead fields', () => {
  const lead = toLead(
    { Name: ['Anna '], Email: ['ANNA@example.de'], Phone: ['0151 2345678'], City: ['Bonn'], Msg: ['Hi'] },
    { name: 'Name', email: 'Email', phone: 'Phone', city: 'City', message: 'Msg', budget: 'B', timeline: 'T' },
  );
  assert.deepEqual(lead, {
    name: 'Anna', email: 'anna@example.de', phone: '+491512345678', city: 'Bonn',
    message: 'Hi', budget: '', timeline: '',
  });
});
