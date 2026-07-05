import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import { HealthCheckPort } from '../application/ports/health-check.port';

// Adapter (exit point) - implements the port.
// Checks real MongoDB connectivity via the Mongoose connection.
@Injectable()
export class MongoHealthCheckAdapter implements HealthCheckPort {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check(): Promise<string> {
    if (this.connection.readyState !== ConnectionStates.connected) {
      return 'error';
    }

    try {
      await this.connection.db!.admin().ping();
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
