const Airtable = require('airtable');
const base = new Airtable({ apiKey: 'YOUR_API_KEY' }).base('YOUR_BASE_ID');

base('Table Name').create([
  {
    "fields": {
      "Field 1": "Value 1",
      "Field 2": "Value 2"
    }
  },
  {
    "fields": {
      "Field 1": "Value 3",
      "Field 2": "Value 4"
    }
  }
], function(err, records) {
  if (err) {
    console.error(err);
    return;
  }
  records.forEach(function(record) {
    console.log(record.getId());
  });
});
