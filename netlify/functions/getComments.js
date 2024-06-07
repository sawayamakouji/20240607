const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.handler = async function(event, context) {
  try {
    console.log("Starting function execution");

    // 環境変数の確認
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      throw new Error("Missing required environment variables");
    }

    console.log("Environment variables loaded");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log("Authentication successful");

    const client = await auth.getClient();
    const range = 'Sheet1!A:A';

    const request = {
      spreadsheetId,
      range,
      auth: client,
    };

    console.log("Request prepared");

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;

    console.log("Data retrieved:", rows);

    return {
      statusCode: 200,
      body: JSON.stringify(rows),
    };
  } catch (error) {
    console.error("Error occurred:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
