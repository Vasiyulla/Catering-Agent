export class TrayItemDto {
  dishQuery!: string;
  quantity!: number;
}

export class CalculateQuoteDto {
  orderMode?: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
  packageId?: string;
  guestCount?: number;
  postcode?: string;
  dietaryPreference?: string;
  trayItems?: TrayItemDto[];
}
