import { Inject, Injectable } from '@nestjs/common';
import {
  DEVICE_REPOSITORY_PORT,
  DeviceRepositoryPort,
} from './ports/device-repository.port';
import { ListDevicesQueryDto } from './dto/list-devices-query.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { PaginatedDevicesResponseDto } from './dto/paginated-devices-response.dto';

// Application use case - orchestrates domain and ports.
// No HTTP, no MongoDB knowledge - just business logic (filtering/pagination/sorting).
@Injectable()
export class ListDevicesUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY_PORT)
    private readonly deviceRepository: DeviceRepositoryPort,
  ) {}

  async execute(
    query: ListDevicesQueryDto,
  ): Promise<PaginatedDevicesResponseDto> {
    const { page, limit, type, status, room, sort } = query;

    const { data, total } = await this.deviceRepository.findPaginated(
      { type, status, room },
      { page, limit },
      sort,
    );

    const response = new PaginatedDevicesResponseDto();
    response.data = data.map((device) => DeviceResponseDto.fromDomain(device));
    response.meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return response;
  }
}
