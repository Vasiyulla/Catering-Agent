import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const appId = '1673736194262454';
const appSecret = process.env.WHATSAPP_APP_SECRET;
const appAccessToken = `${appId}|${appSecret}`;

async function checkAppSubscriptions() {
  console.log(`Checking subscriptions for App ID: ${appId} with App Token...`);
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v21.0/${appId}/subscriptions?access_token=${appAccessToken}`,
    );
    console.log('--- Official App Webhook Subscriptions ---');
    console.dir(res.data, { depth: null });
  } catch (err) {
    console.error('Error checking app subscriptions:', err.response?.data || err.message);
  }
}

checkAppSubscriptions();
