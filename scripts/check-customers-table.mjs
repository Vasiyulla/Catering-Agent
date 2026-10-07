import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

async function checkCustomersTable() {
  try {
    const metaRes = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const custTable = metaRes.data.tables.find((t) => t.name === 'Customers');
    if (custTable) {
      console.log('Customers table fields:');
      console.log(custTable.fields.map((f) => ({ name: f.name, type: f.type })));
    } else {
      console.log('Customers table not found!');
    }
  } catch (err) {
    console.error('Error checking Customers table:', err.response?.data || err.message);
  }
}

checkCustomersTable();
