import { describe, it, expect, beforeEach } from 'vitest';
import { HostProtectionService } from './host-protection.service.js';

describe('HostProtectionService — Host Guardian & Social Embarrassment Protection', () => {
  let service: HostProtectionService;

  beforeEach(() => {
    service = new HostProtectionService();
  });

  it('should flag severe under-ordering when trays feed less than 65% of guests', () => {
    const result = service.auditOrder({
      guestCount: 30,
      orderMode: 'A_LA_CARTE_TRAYS',
      items: [{ dishName: 'Awadhi Biryani', quantity: 1 }], // 1 tray feeds only 10
    });

    expect(result.isSafe).toBe(false);
    expect(result.trapType).toBe('UNDER_ORDERING');
    expect(result.severity).toBe('CRITICAL');
    expect(result.portionDeficitGuests).toBe(20);
    expect(result.formattedBubbleAdvice).toContain('food might run short');
  });

  it('should flag stealth meat-eater risk for mixed crowds', () => {
    const result = service.auditOrder({
      guestCount: 25,
      dietaryPreference: 'Mixed (Non-veg & Veg)',
    });

    expect(result.isSafe).toBe(true);
    expect(result.trapType).toBe('STEALTH_MEAT_EATER');
    expect(result.severity).toBe('WARNING');
    expect(result.formattedBubbleAdvice).toContain('tuck into the Paneer');
  });

  it('should calibrate spice for kids, first birthdays, or elderly family members', () => {
    const result = service.auditOrder({
      guestCount: 20,
      userMessage: "It's my daughter's first birthday and grandparents are coming",
    });

    expect(result.isSafe).toBe(true);
    expect(result.trapType).toBe('SPICE_SENSITIVITY');
    expect(result.spiceRecommendation).toBeDefined();
    expect(result.formattedBubbleAdvice).toContain('rich and mild');
  });

  it('should guard against extreme over-ordering to protect customer budget', () => {
    const result = service.auditOrder({
      guestCount: 15,
      orderMode: 'A_LA_CARTE_TRAYS',
      items: [
        { dishName: 'Biryani', quantity: 2 },
        { dishName: 'Butter Chicken', quantity: 2 },
      ], // 4 trays = feeds 40 people for 15 guests!
    });

    expect(result.isSafe).toBe(false);
    expect(result.trapType).toBe('OVER_ORDERING');
    expect(result.severity).toBe('WARNING');
    expect(result.formattedBubbleAdvice).toContain('save some budget');
  });

  it('should return safe state when order is balanced', () => {
    const result = service.auditOrder({
      guestCount: 20,
      orderMode: 'FEAST_PACKAGE',
      packageId: 'PKG-GOLD',
    });

    expect(result.isSafe).toBe(true);
    expect(result.trapType).toBe('NONE');
  });
});
