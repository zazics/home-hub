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

  it('always shows a power toggle for a light', () => {
    const element = setup(baseDevice({ type: 'light', capabilities: { power: 'on' } }));

    const toggle = element.querySelector<HTMLButtonElement>('.power-toggle');
    expect(toggle).toBeTruthy();
    expect(toggle?.textContent).toContain('Turn off');
  });

  it('shows "Turn on" when the light is off', () => {
    const element = setup(baseDevice({ type: 'light', capabilities: { power: 'off' } }));

    const toggle = element.querySelector<HTMLButtonElement>('.power-toggle');
    expect(toggle?.textContent).toContain('Turn on');
  });

  it('does not show a power toggle for a non-light device', () => {
    const element = setup(baseDevice({ type: 'plug', capabilities: { power: 'on' } }));

    expect(element.querySelector('.power-toggle')).toBeNull();
  });

  it('emits togglePower with the opposite power state when clicked', () => {
    const fixture = TestBed.createComponent(DeviceListItem);
    fixture.componentRef.setInput('device', baseDevice({ type: 'light', capabilities: { power: 'on' } }));
    fixture.detectChanges();

    let emitted: 'on' | 'off' | undefined;
    fixture.componentInstance.togglePower.subscribe((value) => (emitted = value));

    const nativeElement = fixture.nativeElement as HTMLElement;
    const toggle = nativeElement.querySelector<HTMLButtonElement>('.power-toggle');
    toggle?.click();

    expect(emitted).toBe('off');
  });

  it('renders the brightness slider only if capabilities.brightness is present', () => {
    const element = setup(baseDevice({ type: 'light', capabilities: { power: 'on', brightness: 55 } }));

    const slider = element.querySelector<HTMLInputElement>('.brightness-slider');
    expect(slider).toBeTruthy();
    expect(slider?.value).toBe('55');
  });

  it('does not render the brightness slider when brightness is absent', () => {
    const element = setup(baseDevice({ type: 'light', capabilities: { power: 'on' } }));

    expect(element.querySelector('.brightness-slider')).toBeNull();
  });

  it('emits setBrightness on slider change (commit), not on every input', () => {
    const fixture = TestBed.createComponent(DeviceListItem);
    fixture.componentRef.setInput(
      'device',
      baseDevice({ type: 'light', capabilities: { power: 'on', brightness: 50 } }),
    );
    fixture.detectChanges();

    let emitted: number | undefined;
    fixture.componentInstance.setBrightness.subscribe((value) => (emitted = value));

    const nativeElement = fixture.nativeElement as HTMLElement;
    const slider = nativeElement.querySelector<HTMLInputElement>('.brightness-slider');
    slider!.value = '75';
    slider!.dispatchEvent(new Event('change'));

    expect(emitted).toBe(75);
  });

  it('disables the light controls while a command is pending', () => {
    const fixture = TestBed.createComponent(DeviceListItem);
    fixture.componentRef.setInput(
      'device',
      baseDevice({ type: 'light', capabilities: { power: 'on', brightness: 50 } }),
    );
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const toggle = nativeElement.querySelector<HTMLButtonElement>('.power-toggle');
    const slider = nativeElement.querySelector<HTMLInputElement>('.brightness-slider');
    expect(toggle?.disabled).toBe(true);
    expect(slider?.disabled).toBe(true);
  });

  it('shows an inline error message when provided', () => {
    const fixture = TestBed.createComponent(DeviceListItem);
    fixture.componentRef.setInput('device', baseDevice({ type: 'light', capabilities: { power: 'on' } }));
    fixture.componentRef.setInput('errorMessage', 'Failed to send command. Please try again.');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('.device-error')?.textContent).toContain('Failed to send command');
  });
});
