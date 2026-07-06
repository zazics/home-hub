// Pure domain object - no NestJS, no Mongo, no HTTP dependencies.

export type DeviceType = 'light' | 'plug' | 'sensor' | 'thermostat' | 'other';

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface DeviceIntegration {
  protocol: string; // e.g. "zigbee", "mqtt", "http", "wifi-local"
  externalId: string; // id/address on the source system
  manufacturer?: string; // optional, e.g. "IKEA", "Shelly"
}

export interface Device {
  id: string; // string form of MongoDB's native ObjectId

  name: string;
  type: DeviceType;
  status: DeviceStatus;

  // Generic, per-type bag of current state/capabilities (see ADR 0001, section 4).
  capabilities: Record<string, unknown>;

  integration: DeviceIntegration;

  room?: string;

  createdAt: Date;
  updatedAt: Date;
}
