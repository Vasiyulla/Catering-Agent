import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const recipient = '919737893728';

async function sendLiveTest() {
  console.log(`Sending live WhatsApp test message to ${recipient}...`);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: false,
          body: 'Namaste! Welcome to Dil Se Catering ❤️ Food prepared with pure love for your celebrations. Are you looking for a Complete Feast (per person buffet) or individual Party Trays?',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ LIVE MESSAGE DELIVERED TO WHATSAPP!');
    console.log(res.data);
  } catch (err) {
    console.error('❌ Error sending WhatsApp message:', err.response?.data || err.message);
  }
}

sendLiveTest();
