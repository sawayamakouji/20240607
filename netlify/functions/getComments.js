const { google } = require('googleapis');
const axios = require('axios');
const sheets = google.sheets('v4');
const openai = require('openai');

exports.handler = async function(event, context) {
  try {
    // Logging environment variables for debugging
    console.log("OPENAI_API_KEY: ", process.env.OPENAI_API_KEY);
    console.log("GOOGLE_CLIENT_EMAIL: ", process.env.GOOGLE_CLIENT_EMAIL);
    console.log("GOOGLE_PRIVATE_KEY: ", process.env.GOOGLE_PRIVATE_KEY ? "Loaded" : "Not Loaded");
    console.log("LINE_ACCESS_TOKEN: ", process.env.LINE_ACCESS_TOKEN);
    console.log("SPREADSHEET_ID: ", process.env.SPREADSHEET_ID);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = 'Sheet1';

    const json = JSON.parse(event.body);

    // LINEからのメッセージデータを抽出
    const message = json.events[0].message.text;
    const replyToken = json.events[0].replyToken;

    // ChatGPT APIを使って返信を生成
    const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message }
      ],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const replyMessage = gptResponse.data.choices[0].message.content.trim();

    // スプレッドシートにメッセージと返信を追加
    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId,
      range: `${sheetName}!A:B`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[message, replyMessage]],
      },
    });

    // LINEへの応答
    const lineReplyMessage = {
      replyToken: replyToken,
      messages: [{ type: 'text', text: replyMessage }],
    };

    await axios.post('https://api.line.me/v2/bot/message/reply', lineReplyMessage, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_ACCESS_TOKEN}`
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success' }),
    };
  } catch (error) {
    console.error("Error occurred:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
