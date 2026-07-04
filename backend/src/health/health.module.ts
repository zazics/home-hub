import { Module } from '@nestjs/common';
import { HealthController } from './infrastructure/health.controller';
import { GetHealthUseCase } from './application/get-health.use-case';
import { InMemoryHealthCheckAdapter } from './infrastructure/in-memory-health-check.adapter';
import { HEALTH_CHECK_PORT } from './application/ports/health-check.port';

// Module: wires together domain, application, and infrastructure layers.
@Module({
  controllers: [HealthController],
  providers: [
    GetHealthUseCase,
    {
      provide: HEALTH_CHECK_PORT,
      useClass: InMemoryHealthCheckAdapter,
    },
  ],
})
export class HealthModule {}
