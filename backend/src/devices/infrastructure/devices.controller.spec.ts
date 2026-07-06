import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { ListDevicesUseCase } from '../application/list-devices.use-case';
import { ListDevicesQueryDto } from '../application/dto/list-devices-query.dto';
import { PaginatedDevicesResponseDto } from '../application/dto/paginated-devices-response.dto';

describe('DevicesController', () => {
  let controller: DevicesController;
  let mockUseCase: { execute: jest.Mock };

  const emptyResponse: PaginatedDevicesResponseDto = {
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  };

  beforeEach(async () => {
    mockUseCase = {
      execute: jest.fn().mockResolvedValue(emptyResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: ListDevicesUseCase, useValue: mockUseCase }],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
  });

  it('delegates to the use case with the parsed query', async () => {
    const query: ListDevicesQueryDto = {
      page: 1,
      limit: 20,
      sort: 'name',
    };

    const result = await controller.list(query);

    expect(mockUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(emptyResponse);
  });

  it('returns an empty data array (200) rather than a 404 when there are no devices', async () => {
    const result = await controller.list({ page: 1, limit: 20, sort: 'name' });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});
