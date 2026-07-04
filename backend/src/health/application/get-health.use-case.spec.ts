import { Test, TestingModule } from '@nestjs/testing';
import { GetHealthUseCase } from './get-health.use-case';
import { HEALTH_CHECK_PORT } from './ports/health-check.port';

describe('GetHealthUseCase', () => {
  let useCase: GetHealthUseCase;
  let mockAdapter: any;

  beforeEach(async () => {
    mockAdapter = {
      check: jest.fn().mockResolvedValue('ok'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetHealthUseCase,
        {
          provide: HEALTH_CHECK_PORT,
          useValue: mockAdapter,
        },
      ],
    }).compile();

    useCase = module.get<GetHealthUseCase>(GetHealthUseCase);
  });

  it('should return a HealthStatus with status "ok"', async () => {
    const result = await useCase.execute();
    expect(result.status).toBe('ok');
    expect(result.isHealthy()).toBe(true);
  });

  it('should call the adapter once', async () => {
    await useCase.execute();
    expect(mockAdapter.check).toHaveBeenCalledTimes(1);
  });
});
