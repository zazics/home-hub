import { Injectable, Inject } from '@nestjs/common';
import { HealthCheckPort, HEALTH_CHECK_PORT } from './ports/health-check.port';
import { HealthStatus } from '../domain/health-status';

// Application use case - orchestrates domain and ports.
// No HTTP, no MongoDB knowledge - just business logic.
@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(HEALTH_CHECK_PORT)
    private readonly healthCheckAdapter: HealthCheckPort,
  ) {}

  async execute(): Promise<HealthStatus> {
    const status = await this.healthCheckAdapter.check();
    return new HealthStatus(status);
  }
}
