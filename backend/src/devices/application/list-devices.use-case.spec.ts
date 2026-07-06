import { Test, TestingModule } from '@nestjs/testing';
import { ListDevicesUseCase } from './list-devices.use-case';
import {
  DEVICE_REPOSITORY_PORT,
  DeviceRepositoryPort,
} from './ports/device-repository.port';
import { ListDevicesQueryDto } from './dto/list-devices-query.dto';
import { Device } from '../domain/device';

interface MockDeviceRepository extends DeviceRepositoryPort {
  findPaginated: jest.Mock;
}

describe('ListDevicesUseCase', () => {
  let useCase: ListDevicesUseCase;
  let mockRepository: MockDeviceRepository;

  const sampleDevice: Device = {
    id: '665f1a2b8c9d4e0012a3b456',
    name: 'Living room lamp',
    type: 'light',
    status: 'online',
    capabilities: { power: 'on', brightness: 80 },
    integration: {
      protocol: 'zigbee',
      externalId: '0x00158d0004f2a1b3',
      manufacturer: 'IKEA',
    },
    room: 'living-room',
    createdAt: new Date('2026-06-01T10:15:00.000Z'),
    updatedAt: new Date('2026-07-04T18:42:11.000Z'),
  };

  beforeEach(async () => {
    mockRepository = {
      findPaginated: jest
        .fn()
        .mockResolvedValue({ data: [sampleDevice], total: 1 }),
    } as MockDeviceRepository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListDevicesUseCase,
        { provide: DEVICE_REPOSITORY_PORT, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<ListDevicesUseCase>(ListDevicesUseCase);
  });

  it('maps domain devices to response DTOs', async () => {
    const query: ListDevicesQueryDto = {
      page: 1,
      limit: 20,
      sort: 'name',
    };

    const result = await useCase.execute(query);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: sampleDevice.id,
      name: sampleDevice.name,
      type: sampleDevice.type,
      status: sampleDevice.status,
      capabilities: sampleDevice.capabilities,
      integration: sampleDevice.integration,
      room: sampleDevice.room,
      createdAt: '2026-06-01T10:15:00.000Z',
      updatedAt: '2026-07-04T18:42:11.000Z',
    });
  });

  it('computes pagination meta from total and limit', async () => {
    mockRepository.findPaginated.mockResolvedValue({
      data: [sampleDevice],
      total: 45,
    });

    const query: ListDevicesQueryDto = { page: 2, limit: 20, sort: 'name' };
    const result = await useCase.execute(query);

    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('returns an empty data array with 0 totalPages when there are no matches', async () => {
    mockRepository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    const query: ListDevicesQueryDto = { page: 1, limit: 20, sort: 'name' };
    const result = await useCase.execute(query);

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('forwards filters and sort to the repository', async () => {
    const query: ListDevicesQueryDto = {
      page: 1,
      limit: 20,
      type: 'sensor',
      status: 'online',
      room: 'kitchen',
      sort: '-createdAt',
    };

    await useCase.execute(query);

    expect(mockRepository.findPaginated).toHaveBeenCalledWith(
      { type: 'sensor', status: 'online', room: 'kitchen' },
      { page: 1, limit: 20 },
      '-createdAt',
    );
  });
});
