import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const wabaId = '1579980259870198';

async function inspectSubscriptions() {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    console.log('--- WABA Subscribed Apps Full Details ---');
    console.dir(res.data, { depth: null });
  } catch (err) {
    console.error('Error inspecting subscriptions:', err.response?.data || err.message);
  }
}

inspectSubscriptions();
