import { Module } from '@nestjs/common';
import { ApiController } from './api.controller.js';
import { AirtableModule } from '../airtable/airtable.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AgentModule } from '../agent/agent.module.js';

@Module({
  imports: [AirtableModule, DatabaseModule, AgentModule],
  controllers: [ApiController],
})
export class ApiModule {}
