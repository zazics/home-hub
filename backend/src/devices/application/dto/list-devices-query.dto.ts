import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DeviceStatus, DeviceType } from '../../domain/device';
import { DeviceSort } from '../ports/device-repository.port';

const DEVICE_TYPES: DeviceType[] = [
  'light',
  'plug',
  'sensor',
  'thermostat',
  'other',
];

const DEVICE_STATUSES: DeviceStatus[] = ['online', 'offline', 'unknown'];

const SORT_VALUES: DeviceSort[] = ['name', '-name', 'createdAt', '-createdAt'];

// Query DTO for GET /devices - see ADR 0001, section 5.
export class ListDevicesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // server caps at 100; exceeding it is rejected (400), never silently clamped
  limit: number = 20;

  @IsOptional()
  @IsIn(DEVICE_TYPES)
  type?: DeviceType;

  @IsOptional()
  @IsIn(DEVICE_STATUSES)
  status?: DeviceStatus;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsIn(SORT_VALUES)
  sort: DeviceSort = 'name';
}
