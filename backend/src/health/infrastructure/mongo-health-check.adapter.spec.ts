import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { ConnectionStates } from 'mongoose';
import { MongoHealthCheckAdapter } from './mongo-health-check.adapter';

interface MockConnection {
  readyState: ConnectionStates;
  db: { admin: () => { ping: jest.Mock } };
}

describe('MongoHealthCheckAdapter', () => {
  let adapter: MongoHealthCheckAdapter;
  let mockConnection: MockConnection;

  beforeEach(async () => {
    mockConnection = {
      readyState: ConnectionStates.connected,
      db: { admin: () => ({ ping: jest.fn().mockResolvedValue(true) }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoHealthCheckAdapter,
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    adapter = module.get<MongoHealthCheckAdapter>(MongoHealthCheckAdapter);
  });

  it('returns "ok" when connection is ready and ping succeeds', async () => {
    expect(await adapter.check()).toBe('ok');
  });

  it('returns "error" when readyState is not connected', async () => {
    mockConnection.readyState = ConnectionStates.disconnected;
    expect(await adapter.check()).toBe('error');
  });

  it('returns "error" when ping throws', async () => {
    mockConnection.db.admin = () => ({
      ping: jest.fn().mockRejectedValue(new Error('down')),
    });
    expect(await adapter.check()).toBe('error');
  });
});
