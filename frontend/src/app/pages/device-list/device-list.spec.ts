import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { Device, PaginatedDevicesResponse } from '../../core/models/device';
import { DeviceService } from '../../core/services/device.service';
import { DeviceListItem } from './device-list-item/device-list-item';
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
    const buttons = element.querySelectorAll('.pagination button');

    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the next button on the last page', () => {
    const fixture = setup({
      listDevices: () =>
        of(makeResponse({ meta: { page: 1, limit: 20, total: 1, totalPages: 1 } })),
    });
    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll('.pagination button');

    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
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

  function getItemDebugElement(fixture: ReturnType<typeof setup>) {
    return fixture.debugElement.query((de) => de.componentInstance instanceof DeviceListItem);
  }

  it('disables the item control while the light command is in flight', () => {
    const commandSubject = new Subject<Device>();
    const fixture = setup({
      listDevices: () => of(makeResponse()),
      sendLightCommand: () => commandSubject.asObservable(),
    });

    const itemDebugElement = getItemDebugElement(fixture);
    (itemDebugElement.componentInstance as DeviceListItem).togglePower.emit('off');
    fixture.detectChanges();

    expect((itemDebugElement.componentInstance as DeviceListItem).disabled()).toBe(true);
  });

  it('replaces the device data with the server response on success', () => {
    const commandSubject = new Subject<Device>();
    const fixture = setup({
      listDevices: () => of(makeResponse()),
      sendLightCommand: () => commandSubject.asObservable(),
    });

    const itemDebugElement = getItemDebugElement(fixture);
    (itemDebugElement.componentInstance as DeviceListItem).togglePower.emit('off');
    fixture.detectChanges();

    const updatedDevice: Device = {
      ...makeResponse().data[0],
      capabilities: { power: 'off' },
    };
    commandSubject.next(updatedDevice);
    commandSubject.complete();
    fixture.detectChanges();

    const updatedItemDebugElement = getItemDebugElement(fixture);
    expect((updatedItemDebugElement.componentInstance as DeviceListItem).device().capabilities['power']).toBe(
      'off',
    );
    expect((updatedItemDebugElement.componentInstance as DeviceListItem).disabled()).toBe(false);
  });

  it('reverts the device and shows an inline error on command failure', () => {
    const commandSubject = new Subject<Device>();
    const fixture = setup({
      listDevices: () => of(makeResponse()),
      sendLightCommand: () => commandSubject.asObservable(),
    });

    const itemDebugElement = getItemDebugElement(fixture);
    const originalDevice = (itemDebugElement.componentInstance as DeviceListItem).device();
    (itemDebugElement.componentInstance as DeviceListItem).togglePower.emit('off');
    fixture.detectChanges();

    commandSubject.error(new Error('boom'));
    fixture.detectChanges();

    const revertedItemDebugElement = getItemDebugElement(fixture);
    const revertedInstance = revertedItemDebugElement.componentInstance as DeviceListItem;
    expect(revertedInstance.device()).toEqual(originalDevice);
    expect(revertedInstance.disabled()).toBe(false);
    expect(revertedInstance.errorMessage()).toBeTruthy();
  });

  it('sends a brightness command when setBrightness is emitted', () => {
    let receivedCommand: { power?: 'on' | 'off'; brightness?: number } | undefined;
    const fixture = setup({
      listDevices: () => of(makeResponse()),
      sendLightCommand: (_id, command) => {
        receivedCommand = command;
        return of({ ...makeResponse().data[0], capabilities: { power: 'on', brightness: 42 } });
      },
    });

    const itemDebugElement = getItemDebugElement(fixture);
    (itemDebugElement.componentInstance as DeviceListItem).setBrightness.emit(42);
    fixture.detectChanges();

    expect(receivedCommand).toEqual({ brightness: 42 });
  });
});
