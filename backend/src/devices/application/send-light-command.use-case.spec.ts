import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SendLightCommandUseCase } from './send-light-command.use-case';
import {
  DEVICE_REPOSITORY_PORT,
  DeviceRepositoryPort,
} from './ports/device-repository.port';
import { Device } from '../domain/device';
import { LightCommandDto } from './dto/light-command.dto';

interface MockDeviceRepository extends DeviceRepositoryPort {
  findById: jest.Mock;
  updateCapabilities: jest.Mock;
}

describe('SendLightCommandUseCase', () => {
  let useCase: SendLightCommandUseCase;
  let mockRepository: MockDeviceRepository;

  const sampleLight: Device = {
    id: '665f1a2b8c9d4e0012a3b456',
    name: 'Living room lamp',
    type: 'light',
    status: 'online',
    capabilities: { power: 'off', brightness: 40 },
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
      findPaginated: jest.fn(),
      findById: jest.fn().mockResolvedValue(sampleLight),
      updateCapabilities: jest.fn().mockImplementation(
        (id: string, capabilities: Record<string, unknown>) =>
          Promise.resolve({
            ...sampleLight,
            capabilities,
            updatedAt: new Date('2026-07-06T09:00:00.000Z'),
          }),
      ),
    } as MockDeviceRepository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendLightCommandUseCase,
        { provide: DEVICE_REPOSITORY_PORT, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<SendLightCommandUseCase>(SendLightCommandUseCase);
  });

  it('throws BadRequestException when the command body is empty', async () => {
    const command: LightCommandDto = {};

    await expect(useCase.execute(sampleLight.id, command)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the device does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('unknown-id', { power: 'on' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the device is not a light', async () => {
    mockRepository.findById.mockResolvedValue({
      ...sampleLight,
      type: 'sensor',
    });

    await expect(
      useCase.execute(sampleLight.id, { power: 'on' }),
    ).rejects.toThrow(ConflictException);
    expect(mockRepository.updateCapabilities).not.toHaveBeenCalled();
  });

  it('merges a power-only command, preserving existing brightness', async () => {
    const result = await useCase.execute(sampleLight.id, { power: 'on' });

    expect(mockRepository.updateCapabilities).toHaveBeenCalledWith(
      sampleLight.id,
      { power: 'on', brightness: 40 },
    );
    expect(result.capabilities).toEqual({ power: 'on', brightness: 40 });
  });

  it('merges a brightness-only command, preserving existing power', async () => {
    await useCase.execute(sampleLight.id, { brightness: 75 });

    expect(mockRepository.updateCapabilities).toHaveBeenCalledWith(
      sampleLight.id,
      { power: 'off', brightness: 75 },
    );
  });

  it('applies both fields when both are provided', async () => {
    await useCase.execute(sampleLight.id, { power: 'on', brightness: 100 });

    expect(mockRepository.updateCapabilities).toHaveBeenCalledWith(
      sampleLight.id,
      { power: 'on', brightness: 100 },
    );
  });

  it('returns the updated device mapped through DeviceResponseDto', async () => {
    const result = await useCase.execute(sampleLight.id, { power: 'on' });

    expect(result).toMatchObject({
      id: sampleLight.id,
      name: sampleLight.name,
      type: 'light',
      capabilities: { power: 'on', brightness: 40 },
      updatedAt: '2026-07-06T09:00:00.000Z',
    });
  });
});
