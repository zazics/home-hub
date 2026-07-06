import { Device, DeviceIntegration, DeviceStatus, DeviceType } from '../../domain/device';

// Response item DTO - mirrors Device, with the native id exposed as string `id`
// and Date fields serialized as ISO 8601 strings (ADR 0001, section 5).
export class DeviceResponseDto {
  declare id: string;
  declare name: string;
  declare type: DeviceType;
  declare status: DeviceStatus;
  declare capabilities: Record<string, unknown>;
  declare integration: DeviceIntegration;
  declare room?: string;
  declare createdAt: string;
  declare updatedAt: string;

  static fromDomain(device: Device): DeviceResponseDto {
    const dto = new DeviceResponseDto();
    dto.id = device.id;
    dto.name = device.name;
    dto.type = device.type;
    dto.status = device.status;
    dto.capabilities = device.capabilities;
    dto.integration = device.integration;
    dto.room = device.room;
    dto.createdAt = device.createdAt.toISOString();
    dto.updatedAt = device.updatedAt.toISOString();
    return dto;
  }
}
