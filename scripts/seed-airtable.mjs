import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

async function seed() {
  try {
    console.log(`Connecting to Base: ${baseId}...`);
    const metaRes = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const menuTable = metaRes.data.tables.find((t) => t.name === 'Menu');
    if (!menuTable) {
      console.log('Menu table still not found. Please verify table name is "Menu".');
      return;
    }

    console.log('Found Menu table! Existing columns on Menu table:');
    const existingFieldNames = menuTable.fields.map((f) => f.name);
    console.log(existingFieldNames);

    const dishes = [
      {
        Name: 'Amritsari Fish Tikka',
        Category: 'Starters',
        Dietary: 'Non-Veg, Halal',
        Description: 'Crisp carom-spiced batter fried white fish with mint chutney (£4.50/person)',
      },
      {
        Name: 'Paneer Tikka Shashlik',
        Category: 'Starters',
        Dietary: 'Vegetarian, Gluten-Free',
        Description: 'Tandoor-charred cottage cheese cubes with bell peppers and spiced yoghurt (£3.50/person)',
      },
      {
        Name: 'Murgh Malai Tikka',
        Category: 'Starters',
        Dietary: 'Non-Veg, Halal',
        Description: 'Tender chicken skewers infused with cream cheese and green cardamom (£4.00/person)',
      },
      {
        Name: 'Crispy Hara Bhara Kebab',
        Category: 'Starters',
        Dietary: 'Vegetarian, Vegan',
        Description: 'Golden spinach, green peas, and potato patties scented with roasted cumin (£3.00/person)',
      },
      {
        Name: 'Old Delhi Butter Chicken',
        Category: 'Mains',
        Dietary: 'Non-Veg, Halal',
        Description: 'Pulled tandoori chicken simmered in velvety tomato, butter, fenugreek gravy (£6.50/person)',
      },
      {
        Name: 'Shahi Kadhai Paneer',
        Category: 'Mains',
        Dietary: 'Vegetarian, Gluten-Free',
        Description: 'Paneer batons tossed with coarsely crushed coriander seeds and tomato masala (£5.50/person)',
      },
      {
        Name: 'Slow-Cooked Dal Makhani',
        Category: 'Mains',
        Dietary: 'Vegetarian, Gluten-Free',
        Description: 'Black lentils slow-cooked overnight with churned butter and Kashmiri chili (£4.50/person)',
      },
      {
        Name: 'Kashmiri Rogan Josh (Lamb)',
        Category: 'Mains',
        Dietary: 'Non-Veg, Halal',
        Description: 'Tender lamb cuts braised in aromatic alkanet root, fennel, and shallot gravy (£7.50/person)',
      },
      {
        Name: 'Awadhi Chicken Dum Biryani',
        Category: 'Rice & Biryani',
        Dietary: 'Non-Veg, Halal',
        Description: 'Aged basmati rice and marinated chicken sealed in dough with saffron and kewra (£6.00/person)',
      },
      {
        Name: 'Subz Nizami Biryani (Veg)',
        Category: 'Rice & Biryani',
        Dietary: 'Vegetarian',
        Description: 'Seasonal vegetables and basmati rice dum-cooked with whole spices and brown onions (£5.00/person)',
      },
      {
        Name: 'Fresh Tandoori Butter Naan',
        Category: 'Breads',
        Dietary: 'Vegetarian',
        Description: 'Soft leavened flatbread brushed with organic butter (£1.50/person)',
      },
      {
        Name: 'Crisp Laccha Paratha',
        Category: 'Breads',
        Dietary: 'Vegetarian',
        Description: 'Flaky multi-layered whole wheat bread baked in clay tandoor (£1.80/person)',
      },
      {
        Name: 'Warm Gulab Jamun with Rabdi',
        Category: 'Desserts',
        Dietary: 'Vegetarian',
        Description: 'Deep fried milk dough dumplings in rose syrup with saffron condensed milk (£3.00/person)',
      },
      {
        Name: 'Rasmalai with Pistachio Dust',
        Category: 'Desserts',
        Dietary: 'Vegetarian',
        Description: 'Cottage cheese patties soaked in chilled cardamom milk and crushed nuts (£3.50/person)',
      },
    ];

    // Build records with only the fields that actually exist on the table
    const recordsToInsert = dishes.map((dish) => {
      const recordFields = {};
      for (const [key, val] of Object.entries(dish)) {
        if (existingFieldNames.includes(key)) {
          recordFields[key] = val;
        } else if (existingFieldNames.includes('Notes') && key === 'Description') {
          recordFields['Notes'] = val;
        }
      }
      // If none of the extra fields matched, at least insert Name
      if (!recordFields['Name'] && dish.Name) {
        recordFields['Name'] = dish.Name;
      }
      return { fields: recordFields };
    });

    console.log(`Inserting ${recordsToInsert.length} records into Menu table...`);
    for (let i = 0; i < recordsToInsert.length; i += 10) {
      const batch = recordsToInsert.slice(i, i + 10);
      await axios.post(
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

    console.log('🎉 SUCCESS: All Dil Se Catering menu items have been added to your Airtable Menu table!');
  } catch (err) {
    console.error('Error seeding Menu:', err.response?.data || err.message);
  }
}

seed();
