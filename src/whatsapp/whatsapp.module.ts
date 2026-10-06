import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppController } from './whatsapp.controller.js';
import { WhatsAppService } from './whatsapp.service.js';
import { WhatsAppDebounceService } from './whatsapp-debounce.service.js';
import { AgentModule } from '../agent/agent.module.js';

@Module({
  imports: [ConfigModule, forwardRef(() => AgentModule)],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppDebounceService],
  exports: [WhatsAppService, WhatsAppDebounceService],
})
export class WhatsAppModule {}
