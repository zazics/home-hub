import { TestBed } from '@angular/core/testing';

import { Device } from '../../../core/models/device';
import { DeviceListItem } from './device-list-item';

describe('DeviceListItem', () => {
  function setup(device: Device) {
    const fixture = TestBed.createComponent(DeviceListItem);
    fixture.componentRef.setInput('device', device);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function baseDevice(overrides: Partial<Device>): Device {
    return {
      id: '1',
      name: 'Test device',
      type: 'other',
      status: 'unknown',
      capabilities: {},
      integration: { protocol: 'zigbee', externalId: 'abc' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('renders the device name, room and status', () => {
    const element = setup(
      baseDevice({ name: 'Living room lamp', room: 'living-room', status: 'online' }),
    );

    expect(element.querySelector('.device-name')?.textContent).toContain('Living room lamp');
    expect(element.querySelector('.device-room')?.textContent).toContain('living-room');
    expect(element.querySelector('.device-status')?.textContent).toContain('online');
  });

  it('does not render the room when missing', () => {
    const element = setup(baseDevice({ room: undefined }));

    expect(element.querySelector('.device-room')).toBeNull();
  });

  it('shows the power capability for a light', () => {
    const element = setup(baseDevice({ type: 'light', capabilities: { power: 'on' } }));

    expect(element.querySelector('.device-capabilities')?.textContent).toContain('Power: on');
  });

  it('shows the power capability for a plug', () => {
    const element = setup(baseDevice({ type: 'plug', capabilities: { power: 'off' } }));

    expect(element.querySelector('.device-capabilities')?.textContent).toContain('Power: off');
  });

  it('shows temperature and unit for a sensor', () => {
    const element = setup(
      baseDevice({ type: 'sensor', capabilities: { temperature: 21, unit: 'C' } }),
    );

    expect(element.querySelector('.device-capabilities')?.textContent).toContain('21C');
  });

  it('shows target temperature and mode for a thermostat', () => {
    const element = setup(
      baseDevice({ type: 'thermostat', capabilities: { targetTemperature: 20, mode: 'heat' } }),
    );

    expect(element.querySelector('.device-capabilities')?.textContent).toContain('Target: 20');
    expect(element.querySelector('.device-capabilities')?.textContent).toContain('Mode: heat');
  });

  it('renders nothing extra for an unknown/other type', () => {
    const element = setup(baseDevice({ type: 'other', capabilities: { anything: 'x' } }));

    expect(element.querySelector('.device-capabilities')).toBeNull();
  });

  it('is defensive when expected capability fields are missing', () => {
    const element = setup(baseDevice({ type: 'sensor', capabilities: {} }));

    expect(element.querySelector('.device-capabilities')).toBeNull();
  });
});
