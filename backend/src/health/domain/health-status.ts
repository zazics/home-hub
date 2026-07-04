// Pure domain object - no NestJS, no Mongo, no HTTP dependencies.
export class HealthStatus {
  readonly status: string;
  readonly timestamp: Date;

  constructor(status: string) {
    this.status = status;
    this.timestamp = new Date();
  }

  static ok(): HealthStatus {
    return new HealthStatus('ok');
  }

  isHealthy(): boolean {
    return this.status === 'ok';
  }
}
