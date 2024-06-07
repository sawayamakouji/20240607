const { google } = require('googleapis');
const axios = require('axios');

// 環境変数を使用して認証情報を設定
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

exports.handler = async function(event, context) {
  try {
    // GoogleAuthオブジェクトの作成
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

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
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const replyMessage = gptResponse.data.choices[0].message.content.trim();

    // スプレッドシートにメッセージと返信を追加
    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:B',
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
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
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
