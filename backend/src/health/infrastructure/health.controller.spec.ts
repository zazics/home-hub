import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { GetHealthUseCase } from '../application/get-health.use-case';

describe('HealthController', () => {
  let controller: HealthController;
  let useCase: GetHealthUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: GetHealthUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              status: 'ok',
              timestamp: new Date(),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    useCase = module.get<GetHealthUseCase>(GetHealthUseCase);
  });

  it('should return health status', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });
});
