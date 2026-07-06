import { Component, computed, input } from '@angular/core';

import { Device } from '../../../core/models/device';

@Component({
  selector: 'app-device-list-item',
  imports: [],
  templateUrl: './device-list-item.html',
  styleUrl: './device-list-item.css',
})
export class DeviceListItem {
  readonly device = input.required<Device>();

  protected readonly capabilitiesSummary = computed(() => this.summarizeCapabilities(this.device()));

  private summarizeCapabilities(device: Device): string | null {
    const capabilities = device.capabilities ?? {};

    switch (device.type) {
      case 'light':
      case 'plug': {
        const power = capabilities['power'];
        return power !== undefined ? `Power: ${power}` : null;
      }
      case 'sensor': {
        const temperature = capabilities['temperature'];
        const unit = capabilities['unit'];
        if (temperature === undefined) {
          return null;
        }
        return unit !== undefined ? `${temperature}${unit}` : `${temperature}`;
      }
      case 'thermostat': {
        const targetTemperature = capabilities['targetTemperature'];
        const mode = capabilities['mode'];
        if (targetTemperature === undefined && mode === undefined) {
          return null;
        }
        const parts: string[] = [];
        if (targetTemperature !== undefined) {
          parts.push(`Target: ${targetTemperature}`);
        }
        if (mode !== undefined) {
          parts.push(`Mode: ${mode}`);
        }
        return parts.join(' · ');
      }
      default:
        return null;
    }
  }
}
