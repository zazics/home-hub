import { Controller, Get } from '@nestjs/common';
import { GetHealthUseCase } from '../application/get-health.use-case';

// Adapter (entry point) - HTTP layer. Handles incoming requests.
@Controller('health')
export class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  @Get()
  async check() {
    const health = await this.getHealthUseCase.execute();
    return {
      status: health.status,
      timestamp: health.timestamp,
    };
  }
}
