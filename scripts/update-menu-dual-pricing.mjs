import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

async function updateAirtableMenuPrices() {
  try {
    console.log(`Connecting to Airtable Base ${baseId}...`);
    const recordsRes = await axios.get(`https://api.airtable.com/v0/${baseId}/Menu`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const records = recordsRes.data.records;
    console.log(`Found ${records.length} existing records in Menu table.`);

    const priceMap = {
      'Amritsari Fish Tikka': { perPerson: 4.5, tray: 42.0, category: 'Starters' },
      'Paneer Tikka Shashlik': { perPerson: 3.5, tray: 32.0, category: 'Starters' },
      'Murgh Malai Tikka': { perPerson: 4.0, tray: 38.0, category: 'Starters' },
      'Crispy Hara Bhara Kebab': { perPerson: 3.0, tray: 28.0, category: 'Starters' },
      'Old Delhi Butter Chicken': { perPerson: 6.5, tray: 60.0, category: 'Mains' },
      'Shahi Kadhai Paneer': { perPerson: 5.5, tray: 50.0, category: 'Mains' },
      'Slow-Cooked Dal Makhani': { perPerson: 4.5, tray: 40.0, category: 'Mains' },
      'Kashmiri Rogan Josh (Lamb)': { perPerson: 7.5, tray: 70.0, category: 'Mains' },
      'Awadhi Chicken Dum Biryani': { perPerson: 6.0, tray: 55.0, category: 'Rice & Biryani' },
      'Subz Nizami Biryani (Veg)': { perPerson: 5.0, tray: 45.0, category: 'Rice & Biryani' },
      'Fresh Tandoori Butter Naan': { perPerson: 1.5, tray: 14.0, category: 'Breads' },
      'Crisp Laccha Paratha': { perPerson: 1.8, tray: 16.0, category: 'Breads' },
      'Warm Gulab Jamun with Rabdi': { perPerson: 3.0, tray: 28.0, category: 'Desserts' },
      'Rasmalai with Pistachio Dust': { perPerson: 3.5, tray: 32.0, category: 'Desserts' },
    };

    const updates = [];
    for (const record of records) {
      const name = record.fields.Name;
      const priceInfo = priceMap[name];
      if (priceInfo) {
        const formattedNotes = `Category: ${priceInfo.category} | Per-Person Price: £${priceInfo.perPerson.toFixed(2)} | Bulk Party Tray (Serves 10): £${priceInfo.tray.toFixed(2)}`;
        updates.push({
          id: record.id,
          fields: {
            Notes: formattedNotes,
          },
        });
      }
    }

    console.log(`Updating ${updates.length} records with dual pricing in Airtable...`);
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      await axios.patch(
        `https://api.airtable.com/v0/${baseId}/Menu`,
        { records: batch },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    console.log('🎉 SUCCESS: Airtable Menu table successfully updated with clear Per-Person and Party Tray prices!');
  } catch (err) {
    console.error('Error updating menu prices:', err.response?.data || err.message);
  }
}

updateAirtableMenuPrices();
