import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

async function checkMetaAPI() {
  console.log(`Checking WhatsApp Phone Number ID: ${phoneNumberId}`);
  console.log(`Access Token prefix: ${accessToken?.slice(0, 15)}...`);

  try {
    // 1. Check Phone Number details
    const phoneRes = await axios.get(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('✅ Phone Number details from Meta:', phoneRes.data);
  } catch (err) {
    console.error('❌ Error fetching Phone Number from Meta:', err.response?.data || err.message);
  }
}

checkMetaAPI();
