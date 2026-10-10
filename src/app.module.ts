import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { AirtableModule } from './airtable/airtable.module.js';
import { DatabaseModule } from './database/database.module.js';
import { WhatsAppModule } from './whatsapp/whatsapp.module.js';
import { AgentModule } from './agent/agent.module.js';
import { ApiModule } from './api/api.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AirtableModule,
    WhatsAppModule,
    AgentModule,
    ApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
