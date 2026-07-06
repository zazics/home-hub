import { Device, DeviceStatus, DeviceType } from '../../domain/device';

// Exact-match filters supported by the listing use case (ADR 0001, section 5).
export interface DeviceFilter {
  type?: DeviceType;
  status?: DeviceStatus;
  room?: string;
}

export interface DevicePagination {
  page: number; // 1-based
  limit: number;
}

// Whitelisted sort fields/directions only (ADR 0001, section 5).
export type DeviceSort = 'name' | '-name' | 'createdAt' | '-createdAt';

export interface PaginatedDevices {
  data: Device[];
  total: number; // total matching documents (post-filter)
}

// Port interface - describes what the application needs from infrastructure.
// The application doesn't care HOW this is implemented.
export interface DeviceRepositoryPort {
  findPaginated(
    filter: DeviceFilter,
    pagination: DevicePagination,
    sort: DeviceSort,
  ): Promise<PaginatedDevices>;

  // Returns null if no device with this id exists (ADR 0003, section 5).
  findById(id: string): Promise<Device | null>;

  // Replaces the whole `capabilities` object with the given value and
  // returns the updated device (ADR 0003, section 5).
  updateCapabilities(
    id: string,
    capabilities: Record<string, unknown>,
  ): Promise<Device>;
}

// Token for dependency injection
export const DEVICE_REPOSITORY_PORT = Symbol('DeviceRepositoryPort');
