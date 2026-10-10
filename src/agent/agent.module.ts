import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MenuModule } from '../menu/menu.module.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';
import { BillingEngineService } from './billing/billing-engine.service.js';
import { HostProtectionService } from './protection/host-protection.service.js';
import { AgentService } from './agent.service.js';

@Module({
  imports: [ConfigModule, MenuModule, forwardRef(() => WhatsAppModule)],
  providers: [BillingEngineService, HostProtectionService, AgentService],
  exports: [BillingEngineService, HostProtectionService, AgentService],
})
export class AgentModule {}
