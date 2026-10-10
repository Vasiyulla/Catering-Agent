import { Module } from '@nestjs/common';
import { ApiController } from './api.controller.js';
import { MenuModule } from '../menu/menu.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AgentModule } from '../agent/agent.module.js';

@Module({
  imports: [MenuModule, DatabaseModule, AgentModule],
  controllers: [ApiController],
})
export class ApiModule {}
