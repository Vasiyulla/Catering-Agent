import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const appId = '1673736194262454';
const appSecret = process.env.WHATSAPP_APP_SECRET;
const appAccessToken = `${appId}|${appSecret}`;
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'dil_se_catering_webhook_verify_secret';
const callbackUrl = 'https://catering-agent.onrender.com/webhook';

async function subscribeFields() {
  console.log(`Subscribing App ${appId} to 'messages' field on whatsapp_business_account...`);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${appId}/subscriptions`,
      null,
      {
        params: {
          object: 'whatsapp_business_account',
          callback_url: callbackUrl,
          verify_token: verifyToken,
          fields: 'messages',
          access_token: appAccessToken,
        },
      },
    );
    console.log('🎉 APP FIELD SUBSCRIPTION SUCCESS:', res.data);

    // Verify after subscription
    const verifyRes = await axios.get(
      `https://graph.facebook.com/v21.0/${appId}/subscriptions?access_token=${appAccessToken}`,
    );
    console.log('Current Subscriptions now:');
    console.dir(verifyRes.data, { depth: null });
  } catch (err) {
    console.error('❌ Error subscribing fields:', err.response?.data || err.message);
  }
}

subscribeFields();
