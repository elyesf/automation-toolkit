/**
 * Everything that changes between clients lives here, so the logic files stay generic.
 * The values below are examples.
 */
const CONFIG = {
  sheetName: 'Leads',
  notifyEmail: 'sales@example.com',

  // Form question titles -> lead fields
  fieldMap: {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    city: 'City',
    message: 'How can we help?',
    budget: 'Budget (EUR)',
    timeline: 'When do you need it?',
  },

  // Checked in order, first match wins
  categoryRules: [
    { category: 'Water treatment', keywords: ['filter', 'softener', 'water quality', 'wasser'] },
    { category: 'Installation', keywords: ['install', 'montage', 'new system'] },
    { category: 'Maintenance', keywords: ['repair', 'maintenance', 'wartung', 'leak'] },
  ],

  // Optional: ask the OpenAI API when no rule matches. Needs the script property OPENAI_API_KEY.
  useAiFallback: false,

  // Column order of the Leads sheet
  columns: ['Received', 'Name', 'Email', 'Phone', 'City', 'Category', 'Priority', 'Status', 'Owner', 'Last update', 'Message'],
};
