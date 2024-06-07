const { google } = require('googleapis');
const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    const auth = await google.auth.getClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = 'Sheet1';

    const json = JSON.parse(event.body);

    // LINEからのメッセージデータを抽出
    const message = json.events[0].message.text;
    const replyToken = json.events[0].replyToken;

    // ChatGPT APIを使って返信を生成
    const gptPrompt = `以下のメッセージに対して、丁寧で親切な一行の返信をしてください: "${message}"`;

    const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: gptPrompt }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const replyMessage = gptResponse.data.choices[0].message.content.trim();

    // スプレッドシートにメッセージと返信を追加
    await sheets.spreadsheets.values.append({
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
