import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { PaginatedDevicesResponse } from '../../core/models/device';
import { DeviceService } from '../../core/services/device.service';
import { DeviceList } from './device-list';

describe('DeviceList', () => {
  function setup(deviceService: Partial<DeviceService>) {
    TestBed.configureTestingModule({
      imports: [DeviceList],
      providers: [{ provide: DeviceService, useValue: deviceService }],
    });
    const fixture = TestBed.createComponent(DeviceList);
    fixture.detectChanges();
    return fixture;
  }

  function makeResponse(overrides?: Partial<PaginatedDevicesResponse>): PaginatedDevicesResponse {
    return {
      data: [
        {
          id: '1',
          name: 'Living room lamp',
          type: 'light',
          status: 'online',
          capabilities: { power: 'on' },
          integration: { protocol: 'zigbee', externalId: 'abc' },
          room: 'living-room',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      ...overrides,
    };
  }

  it('shows the loading state initially then the success state', () => {
    const fixture = setup({ listDevices: () => of(makeResponse()) });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-device-list-item')).toBeTruthy();
  });

  it('shows the error state when the request fails', () => {
    const fixture = setup({
      listDevices: () => throwError(() => new Error('network error')),
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.status-error')?.textContent).toContain('Unable to load devices');
  });

  it('shows the empty state when data is an empty array', () => {
    const fixture = setup({
      listDevices: () => of(makeResponse({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })),
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.status-empty')?.textContent).toContain('No devices found');
  });

  it('disables the previous button on the first page', () => {
    const fixture = setup({ listDevices: () => of(makeResponse()) });
    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll('button');

    expect(buttons[0].disabled).toBe(true);
  });

  it('disables the next button on the last page', () => {
    const fixture = setup({
      listDevices: () =>
        of(makeResponse({ meta: { page: 1, limit: 20, total: 1, totalPages: 1 } })),
    });
    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll('button');

    expect(buttons[1].disabled).toBe(true);
  });

  it('requests the next page when next() is called and it is not the last page', () => {
    let requestedPage = 1;
    const fixture = setup({
      listDevices: (params) => {
        requestedPage = params?.page ?? 1;
        return of(
          makeResponse({
            meta: { page: requestedPage, limit: 20, total: 40, totalPages: 2 },
          }),
        );
      },
    });

    (fixture.componentInstance as unknown as { next: () => void }).next();
    fixture.detectChanges();

    expect(requestedPage).toBe(2);
  });

  it('does not go below page 1 when previous() is called on the first page', () => {
    let callCount = 0;
    const fixture = setup({
      listDevices: () => {
        callCount++;
        return of(makeResponse());
      },
    });

    (fixture.componentInstance as unknown as { previous: () => void }).previous();
    fixture.detectChanges();

    expect(callCount).toBe(1);
  });

  it('retries the fetch when retry() is called after an error', () => {
    let callCount = 0;
    const fixture = setup({
      listDevices: () => {
        callCount++;
        return callCount === 1 ? throwError(() => new Error('boom')) : of(makeResponse());
      },
    });

    (fixture.componentInstance as unknown as { retry: () => void }).retry();
    fixture.detectChanges();

    expect(callCount).toBe(2);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-device-list-item')).toBeTruthy();
  });
});
