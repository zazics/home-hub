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

  constructor() {
    this.fetchDevices();
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
