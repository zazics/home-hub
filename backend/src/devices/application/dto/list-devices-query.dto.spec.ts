import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListDevicesQueryDto } from './list-devices-query.dto';

async function validateQuery(plain: Record<string, unknown>) {
  const instance = plainToInstance(ListDevicesQueryDto, plain, {
    enableImplicitConversion: true,
  });
  return validate(instance);
}

describe('ListDevicesQueryDto', () => {
  it('accepts an empty query and applies defaults', async () => {
    const errors = await validateQuery({});
    expect(errors).toHaveLength(0);
  });

  it('accepts a fully valid query', async () => {
    const errors = await validateQuery({
      page: '2',
      limit: '50',
      type: 'light',
      status: 'online',
      room: 'kitchen',
      sort: '-createdAt',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects page = 0', async () => {
    const errors = await validateQuery({ page: '0' });
    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it('rejects limit > 100 rather than silently capping it', async () => {
    const errors = await validateQuery({ limit: '500' });
    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects limit < 1', async () => {
    const errors = await validateQuery({ limit: '0' });
    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects an unknown type value', async () => {
    const errors = await validateQuery({ type: 'not-a-type' });
    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });

  it('rejects an unknown status value', async () => {
    const errors = await validateQuery({ status: 'not-a-status' });
    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it('rejects an unknown sort value', async () => {
    const errors = await validateQuery({ sort: 'invalid' });
    expect(errors.some((error) => error.property === 'sort')).toBe(true);
  });
});
