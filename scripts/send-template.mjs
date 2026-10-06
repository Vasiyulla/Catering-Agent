import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const recipient = '919737893728';

async function sendTemplate() {
  console.log(`Sending 'hello_world' template message to ${recipient}...`);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Template API response:', res.data);
  } catch (err) {
    console.error('❌ Template Error:', err.response?.data || err.message);
  }
}

sendTemplate();
