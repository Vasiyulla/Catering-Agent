import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

async function testCustomerCreation() {
  console.log(`Connecting to Airtable Base ${baseId} to test customer creation...`);
  try {
    const table = 'Customers';
    const testPhone = '919737893728';
    const testName = 'Vasiyulla';

    // 1. Search if existing
    const searchRes = await axios.get(
      `https://api.airtable.com/v0/${baseId}/${table}?filterByFormula={Number}='${testPhone}'`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (searchRes.data.records.length > 0) {
      console.log('Customer already exists in Airtable:', searchRes.data.records[0].fields);
    } else {
      console.log('Customer not found, creating new customer in Airtable...');
      const createRes = await axios.post(
        `https://api.airtable.com/v0/${baseId}/${table}`,
        {
          records: [
            {
              fields: {
                Name: testName,
                Number: testPhone,
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('🎉 CUSTOMER CREATED IN AIRTABLE:', createRes.data.records[0]);
    }
  } catch (err) {
    console.error('❌ Error creating customer:', err.response?.data || err.message);
  }
}

testCustomerCreation();
