const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.handler = async function(event, context) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = 'Sheet1!A:A';

    const request = {
      spreadsheetId,
      range,
      auth: client,
    };

    
    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;

    return {
      statusCode: 200,
      body: JSON.stringify(rows),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
