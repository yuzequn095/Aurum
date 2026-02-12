import { Controller, Get } from '@nestjs/common';

@Controller('v1')
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
