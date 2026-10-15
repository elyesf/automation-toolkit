const test = require('node:test');
const assert = require('node:assert/strict');
const { daysBetween, findStaleLeads, groupByOwner, reminderText } = require('../follow-up-reminders/ReminderLogic.js');

const header = ['Name', 'Status', 'Owner', 'Last update'];
const today = new Date(2026, 9, 15, 9, 0);
const daysAgo = (n) => new Date(2026, 9, 15 - n, 17, 30);

test('daysBetween ignores the time of day', () => {
  assert.equal(daysBetween(new Date(2026, 9, 14, 23, 0), new Date(2026, 9, 15, 1, 0)), 1);
});

test('findStaleLeads returns open leads older than the limit, oldest first', () => {
  const rows = [
    header,
    ['Fresh', 'New', 'mira@example.com', daysAgo(1)],
    ['Old', 'Contacted', 'mira@example.com', daysAgo(5)],
    ['Older', 'New', '', daysAgo(9)],
    ['Closed', 'Won', 'mira@example.com', daysAgo(30)],
    ['No date', 'New', '', ''],
  ];
  const stale = findStaleLeads(rows, today, 3);
  assert.deepEqual(stale.map((l) => [l.name, l.row, l.daysSinceUpdate]), [['Older', 4, 9], ['Old', 3, 5]]);
});

test('findStaleLeads fails clearly when a column is missing', () => {
  assert.throws(() => findStaleLeads([['Name', 'Status'], ['A', 'New']], today, 3), /Last update/);
});

test('groupByOwner sends leads without owner to the fallback', () => {
  const groups = groupByOwner([{ owner: 'mira@x.de' }, { owner: '' }, { owner: 'mira@x.de' }], 'sales@x.de');
  assert.equal(groups['mira@x.de'].length, 2);
  assert.equal(groups['sales@x.de'].length, 1);
});

test('reminderText lists each lead', () => {
  const text = reminderText([{ name: 'Anna', status: 'New', daysSinceUpdate: 4, row: 7 }], 'https://sheet');
  assert.match(text, /Anna \(New, 4 days, row 7\)/);
  assert.match(text, /https:\/\/sheet$/);
});
