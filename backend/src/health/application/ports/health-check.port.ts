// Port interface - describes what the application needs from infrastructure.
// The application doesn't care HOW this is implemented.
export interface HealthCheckPort {
  check(): Promise<string>;
}

// Token for dependency injection
export const HEALTH_CHECK_PORT = Symbol('HealthCheckPort');
