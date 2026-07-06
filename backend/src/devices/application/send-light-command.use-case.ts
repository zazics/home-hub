import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEVICE_REPOSITORY_PORT,
  DeviceRepositoryPort,
} from './ports/device-repository.port';
import { LightCommandDto } from './dto/light-command.dto';
import { DeviceResponseDto } from './dto/device-response.dto';

// Application use case - orchestrates domain and ports.
// No HTTP framework knowledge beyond the Nest exceptions used to signal
// error cases to the controller (404/409/400), consistent with the rest of
// this module's layering (see ADR 0003, section 5).
@Injectable()
export class SendLightCommandUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY_PORT)
    private readonly deviceRepository: DeviceRepositoryPort,
  ) {}

  async execute(
    id: string,
    command: LightCommandDto,
  ): Promise<DeviceResponseDto> {
    if (command.power === undefined && command.brightness === undefined) {
      throw new BadRequestException(
        'At least one of "power" or "brightness" must be provided.',
      );
    }

    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device not found: ${id}`);
    }

    if (device.type !== 'light') {
      throw new ConflictException(
        `Device ${id} is not a light (type: ${device.type}).`,
      );
    }

    const capabilities: Record<string, unknown> = { ...device.capabilities };
    if (command.power !== undefined) {
      capabilities.power = command.power;
    }
    if (command.brightness !== undefined) {
      capabilities.brightness = command.brightness;
    }

    const updated = await this.deviceRepository.updateCapabilities(
      id,
      capabilities,
    );

    return DeviceResponseDto.fromDomain(updated);
  }
}
