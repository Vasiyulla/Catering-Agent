import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

async function debugToken() {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`,
    );
    console.dir(res.data, { depth: null });
  } catch (err) {
    console.error('Error debugging token:', err.response?.data || err.message);
  }
}

debugToken();
