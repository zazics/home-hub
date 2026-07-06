import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { PaginatedDevicesResponse } from '../models/device';
import { DeviceService } from './device.service';

describe('DeviceService', () => {
  let service: DeviceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DeviceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches devices without params', () => {
    const mockResponse: PaginatedDevicesResponse = {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    service.listDevices().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/devices`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(mockResponse);
  });

  it('fetches devices with pagination params', () => {
    const mockResponse: PaginatedDevicesResponse = {
      data: [
        {
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
          createdAt: '2026-06-01T10:15:00.000Z',
          updatedAt: '2026-07-04T18:42:11.000Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    service.listDevices({ page: 1, limit: 20 }).subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/devices` && r.params.get('page') === '1' && r.params.get('limit') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('omits undefined params from the query', () => {
    service.listDevices({ page: 2, type: undefined }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/devices` && r.params.get('page') === '2',
    );
    expect(req.request.params.has('type')).toBe(false);
    req.flush({ data: [], meta: { page: 2, limit: 20, total: 0, totalPages: 0 } });
  });
});
