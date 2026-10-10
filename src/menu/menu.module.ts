import { Module, Global } from '@nestjs/common';
import { MenuService } from './menu.service.js';

@Global()
@Module({
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
