import { DeviceResponseDto } from './device-response.dto';

export interface PaginatedDevicesMeta {
  page: number;
  limit: number;
  total: number; // total matching documents (post-filter)
  totalPages: number;
}

// Envelope DTO returned by GET /devices (ADR 0001, section 5).
export class PaginatedDevicesResponseDto {
  declare data: DeviceResponseDto[];
  declare meta: PaginatedDevicesMeta;
}
