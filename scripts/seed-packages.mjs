import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

async function seedPackages() {
  try {
    console.log(`Connecting to Base: ${baseId}...`);
    const metaRes = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const packagesTable = metaRes.data.tables.find((t) => t.name === 'Packages');
    if (!packagesTable) {
      console.log('Packages table not found. Please verify table name is "Packages".');
      return;
    }

    console.log('Found Packages table! Existing columns on Packages table:');
    const existingFieldNames = packagesTable.fields.map((f) => f.name);
    console.log(existingFieldNames);

    const packages = [
      {
        Name: 'Dil Se Classic Feast',
        Description: 'Ideal for intimate gatherings, pujas, and birthdays. Includes: 2 Starters, 2 Mains, 1 Dal Makhani, 1 Dum Biryani, Fresh Naan & Gulab Jamun. Price: £14.50/person (Min 15 guests).',
      },
      {
        Name: 'Dil Se Royal Celebration Feast',
        Description: 'Our most popular feast for weddings, anniversaries, and grand celebrations. Includes: 3 Starters, 3 Mains (Butter Chicken, Lamb Rogan Josh, Shahi Paneer), Dal Makhani, Awadhi Biryani, 2 Breads, and 2 Desserts (Rabdi Jamun + Rasmalai). Price: £18.00/person (Min 20 guests).',
      },
      {
        Name: 'Executive Office Buffet',
        Description: 'Quick serving, mess-free corporate lunch with warmers and eco disposables. Includes: 1 Starter, 2 Mains, 1 Dal, Basmati Rice, Naan, and Dessert. Price: £13.00/person (Min 20 guests).',
      },
    ];

    const recordsToInsert = packages.map((pkg) => {
      const recordFields = {};
      recordFields['Name'] = pkg.Name;
      if (existingFieldNames.includes('Notes')) {
        recordFields['Notes'] = pkg.Description;
      } else if (existingFieldNames.includes('Description')) {
        recordFields['Description'] = pkg.Description;
      }
      return { fields: recordFields };
    });

    console.log(`Inserting ${recordsToInsert.length} packages into Packages table...`);
    await axios.post(
      `https://api.airtable.com/v0/${baseId}/Packages`,
      { records: recordsToInsert },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('🎉 SUCCESS: All 3 Curated Packages have been added to your Airtable Packages table!');
  } catch (err) {
    console.error('Error seeding Packages:', err.response?.data || err.message);
  }
}

seedPackages();
