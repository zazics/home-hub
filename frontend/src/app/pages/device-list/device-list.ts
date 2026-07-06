import { Component, inject, signal } from '@angular/core';

import { Device, PaginatedDevicesMeta } from '../../core/models/device';
import { DeviceService } from '../../core/services/device.service';
import { DeviceListItem } from './device-list-item/device-list-item';

const PAGE_SIZE = 20;

type DeviceListViewState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'success'; devices: Device[]; meta: PaginatedDevicesMeta };

interface LightCommandState {
  pendingDeviceId: string | null;
  errorDeviceId: string | null;
  errorMessage: string | null;
}

@Component({
  selector: 'app-device-list',
  imports: [DeviceListItem],
  templateUrl: './device-list.html',
  styleUrl: './device-list.css',
})
export class DeviceList {
  private readonly deviceService = inject(DeviceService);

  protected readonly state = signal<DeviceListViewState>({ kind: 'loading' });
  protected readonly page = signal<number>(1);
  protected readonly commandState = signal<LightCommandState>({
    pendingDeviceId: null,
    errorDeviceId: null,
    errorMessage: null,
  });

  constructor() {
    this.fetchDevices();
  }

  protected isPending(deviceId: string): boolean {
    return this.commandState().pendingDeviceId === deviceId;
  }

  protected errorFor(deviceId: string): string | null {
    const current = this.commandState();
    return current.errorDeviceId === deviceId ? current.errorMessage : null;
  }

  protected onTogglePower(device: Device, power: 'on' | 'off'): void {
    this.sendCommand(device, { power });
  }

  protected onSetBrightness(device: Device, brightness: number): void {
    this.sendCommand(device, { brightness });
  }

  private sendCommand(device: Device, command: { power?: 'on' | 'off'; brightness?: number }): void {
    const previousDevice = device;
    this.commandState.set({ pendingDeviceId: device.id, errorDeviceId: null, errorMessage: null });

    this.deviceService.sendLightCommand(device.id, command).subscribe({
      next: (updatedDevice) => {
        this.replaceDevice(updatedDevice);
        this.commandState.set({ pendingDeviceId: null, errorDeviceId: null, errorMessage: null });
      },
      error: (error) => {
        console.error('Failed to send light command', error);
        this.replaceDevice(previousDevice);
        this.commandState.set({
          pendingDeviceId: null,
          errorDeviceId: device.id,
          errorMessage: 'Failed to send command. Please try again.',
        });
      },
    });
  }

  private replaceDevice(updatedDevice: Device): void {
    const currentState = this.state();
    if (currentState.kind !== 'success') {
      return;
    }
    const devices = currentState.devices.map((d) => (d.id === updatedDevice.id ? updatedDevice : d));
    this.state.set({ ...currentState, devices });
  }

  protected previous(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.set(this.page() - 1);
    this.fetchDevices();
  }

  protected next(): void {
    const currentState = this.state();
    if (currentState.kind !== 'success' || this.page() >= currentState.meta.totalPages) {
      return;
    }
    this.page.set(this.page() + 1);
    this.fetchDevices();
  }

  protected retry(): void {
    this.fetchDevices();
  }

  private fetchDevices(): void {
    this.state.set({ kind: 'loading' });

    this.deviceService.listDevices({ page: this.page(), limit: PAGE_SIZE }).subscribe({
      next: (response) => {
        if (response.data.length === 0) {
          this.state.set({ kind: 'empty' });
          return;
        }
        this.state.set({ kind: 'success', devices: response.data, meta: response.meta });
      },
      error: (error) => {
        console.error('Failed to fetch devices', error);
        this.state.set({ kind: 'error' });
      },
    });
  }
}
