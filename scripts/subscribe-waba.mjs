import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const businessId = '2310670133098936';

async function getWaba() {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v21.0/${businessId}/owned_whatsapp_business_accounts`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    console.log('Owned WABAs:', res.data);

    if (res.data?.data?.[0]?.id) {
      const wabaId = res.data.data[0].id;
      console.log('Found WABA ID:', wabaId);

      // Subscribe App to WABA
      console.log('Subscribing app to this WABA...');
      const subRes = await axios.post(
        `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log('✅ Subscription Result:', subRes.data);
    }
  } catch (err) {
    console.error('Error fetching WABA from business:', err.response?.data || err.message);
  }
}

getWaba();
