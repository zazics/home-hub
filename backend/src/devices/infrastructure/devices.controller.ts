import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ListDevicesUseCase } from '../application/list-devices.use-case';
import { SendLightCommandUseCase } from '../application/send-light-command.use-case';
import { ListDevicesQueryDto } from '../application/dto/list-devices-query.dto';
import { LightCommandDto } from '../application/dto/light-command.dto';
import { PaginatedDevicesResponseDto } from '../application/dto/paginated-devices-response.dto';
import { DeviceResponseDto } from '../application/dto/device-response.dto';

// Adapter (entry point) - HTTP layer. Handles incoming requests.
// Read (ADR 0001) is read-only; light control mutation added per ADR 0003.
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly listDevicesUseCase: ListDevicesUseCase,
    private readonly sendLightCommandUseCase: SendLightCommandUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListDevicesQueryDto,
  ): Promise<PaginatedDevicesResponseDto> {
    return this.listDevicesUseCase.execute(query);
  }

  @Patch(':id/light-command')
  async sendLightCommand(
    @Param('id') id: string,
    @Body() command: LightCommandDto,
  ): Promise<DeviceResponseDto> {
    return this.sendLightCommandUseCase.execute(id, command);
  }
}
