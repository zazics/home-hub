import { Injectable } from '@nestjs/common';
import { HealthCheckPort } from '../application/ports/health-check.port';

// Adapter (exit point) - implements the port.
// Concrete implementation details live here.
@Injectable()
export class InMemoryHealthCheckAdapter implements HealthCheckPort {
  async check(): Promise<string> {
    // Placeholder implementation: always returns 'ok'.
    // Later, this could check MongoDB, memory usage, disk space, etc.
    return 'ok';
  }
}
