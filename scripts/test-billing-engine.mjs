import { MenuCacheService } from '../dist/airtable/menu-cache.service.js';
import { BillingEngineService } from '../dist/agent/billing/billing-engine.service.js';

async function testBilling() {
  console.log('🧪 Testing Deterministic Catering Billing Engine...\n');

  const menuCache = new MenuCacheService();
  const billing = new BillingEngineService(menuCache);

  console.log('--- 1. Testing Party Trays Quote (2 Biryani + 1 Dal in HA9) ---');
  const trayQuote = billing.calculateTrayOrder({
    items: [
      { dishQuery: 'Biryani', quantity: 2 },
      { dishQuery: 'Dal Makhani', quantity: 1 },
    ],
    guestCount: 30,
    postcode: 'HA9 0WS',
  });
  console.log('Food Subtotal:', '£' + trayQuote.foodSubtotal);
  console.log('Delivery Fee:', '£' + trayQuote.deliveryFee);
  console.log('Total Amount:', '£' + trayQuote.totalAmount);
  console.log('Cost Per Guest:', '£' + trayQuote.costPerGuest);
  console.log('\nSmart Receipt Card:\n' + trayQuote.smartReceiptCard);

  console.log('\n--- 2. Testing Royal Feast Buffet (25 guests) ---');
  const feastQuote = billing.calculateFeastPackage({
    packageIdOrName: 'PKG-GOLD',
    guestCount: 25,
    postcode: 'UB1 1AA',
  });
  console.log('Package Rate:', '£' + feastQuote.perPersonRate);
  console.log('Total Amount:', '£' + feastQuote.totalAmount);
  console.log('\nSmart Receipt Card:\n' + feastQuote.smartReceiptCard);

  console.log('\n--- 3. Testing Portion Recommender (35 guests, Mixed) ---');
  const portions = billing.recommendPortionsForGuests(35, 'Mixed');
  console.log('Recommended Basket:', portions);
  const recQuote = billing.calculateTrayOrder({ items: portions, guestCount: 35, postcode: 'HA1' });
  console.log('Rec Total:', '£' + recQuote.totalAmount, '| Per Guest: £' + recQuote.costPerGuest);
}

testBilling().catch(console.error);
