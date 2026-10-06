import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const wabaId = '1579980259870198'; // Exact WABA ID from Meta Business Suite screenshot!

async function subscribeWaba() {
  console.log(`Checking Subscribed Apps for WABA ID: ${wabaId}...`);
  try {
    const listRes = await axios.get(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    console.log('Current subscriptions before:', listRes.data);

    console.log('Subscribing App to this WABA...');
    const subRes = await axios.post(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    console.log('🎉 SUBSCRIPTION RESULT:', subRes.data);

    const listAfterRes = await axios.get(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    console.log('✅ Active Subscriptions after subscribe:', listAfterRes.data);
  } catch (err) {
    console.error('❌ Error subscribing WABA:', err.response?.data || err.message);
  }
}

subscribeWaba();
