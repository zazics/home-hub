export type DeviceType = 'light' | 'plug' | 'sensor' | 'thermostat' | 'other';

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface DeviceIntegration {
  protocol: string;
  externalId: string;
  manufacturer?: string;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: Record<string, unknown>;
  integration: DeviceIntegration;
  room?: string;
  createdAt: string; // ISO 8601, kept as string — format for display in the template, not in the model
  updatedAt: string;
}

export interface PaginatedDevicesMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDevicesResponse {
  data: Device[];
  meta: PaginatedDevicesMeta;
}

export interface ListDevicesParams {
  page?: number;
  limit?: number;
  type?: DeviceType;
  status?: DeviceStatus;
  room?: string;
  sort?: 'name' | '-name' | 'createdAt' | '-createdAt';
}
