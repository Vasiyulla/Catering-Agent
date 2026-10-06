import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

async function checkAndSubscribe() {
  try {
    console.log('Fetching WABA (WhatsApp Business Account) info for Phone ID:', phoneNumberId);
    const phoneRes = await axios.get(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=id,whatsapp_business_account`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const wabaId = phoneRes.data?.whatsapp_business_account?.id;
    console.log('✅ Found WABA ID:', wabaId);

    if (wabaId) {
      // Check subscribed apps for this WABA
      const subsRes = await axios.get(
        `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log('Current Subscribed Apps to this WhatsApp Business Account:', subsRes.data);

      // Now ensure subscription is active
      console.log('Subscribing app to WABA...');
      const subPostRes = await axios.post(
        `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log('✅ Subscription response from Meta:', subPostRes.data);
    }
  } catch (err) {
    console.error('❌ Error checking WABA subscription:', err.response?.data || err.message);
  }
}

checkAndSubscribe();
