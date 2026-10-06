import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AirtableModule } from '../airtable/airtable.module.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';
import { AgentService } from './agent.service.js';

@Module({
  imports: [ConfigModule, AirtableModule, forwardRef(() => WhatsAppModule)],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
