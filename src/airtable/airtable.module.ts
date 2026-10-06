import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AirtableService } from './airtable.service.js';
import { MenuCacheService } from './menu-cache.service.js';

@Module({
  imports: [ConfigModule],
  providers: [AirtableService, MenuCacheService],
  exports: [AirtableService, MenuCacheService],
})
export class AirtableModule {}
