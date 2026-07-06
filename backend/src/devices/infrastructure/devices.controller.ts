import { Controller, Get, Query } from '@nestjs/common';
import { ListDevicesUseCase } from '../application/list-devices.use-case';
import { ListDevicesQueryDto } from '../application/dto/list-devices-query.dto';
import { PaginatedDevicesResponseDto } from '../application/dto/paginated-devices-response.dto';

// Adapter (entry point) - HTTP layer. Handles incoming requests.
// Read-only: no POST/PATCH/DELETE, per ADR 0001 non-goals.
@Controller('devices')
export class DevicesController {
  constructor(private readonly listDevicesUseCase: ListDevicesUseCase) {}

  @Get()
  async list(
    @Query() query: ListDevicesQueryDto,
  ): Promise<PaginatedDevicesResponseDto> {
    return this.listDevicesUseCase.execute(query);
  }
}
