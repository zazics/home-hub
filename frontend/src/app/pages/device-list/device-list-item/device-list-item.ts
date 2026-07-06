import { Component, computed, input, output } from '@angular/core';

import { Device } from '../../../core/models/device';

@Component({
  selector: 'app-device-list-item',
  imports: [],
  templateUrl: './device-list-item.html',
  styleUrl: './device-list-item.css',
})
export class DeviceListItem {
  readonly device = input.required<Device>();
  readonly disabled = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly togglePower = output<'on' | 'off'>();
  readonly setBrightness = output<number>();

  protected readonly capabilitiesSummary = computed(() => this.summarizeCapabilities(this.device()));

  protected readonly isLight = computed(() => this.device().type === 'light');

  protected readonly power = computed(() => {
    const power = this.device().capabilities?.['power'];
    return power === 'on' || power === 'off' ? power : undefined;
  });

  protected readonly brightness = computed(() => {
    const brightness = this.device().capabilities?.['brightness'];
    return typeof brightness === 'number' ? brightness : undefined;
  });

  protected readonly hasBrightness = computed(() => this.brightness() !== undefined);

  protected onTogglePower(): void {
    const nextPower = this.power() === 'on' ? 'off' : 'on';
    this.togglePower.emit(nextPower);
  }

  protected onBrightnessCommit(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.setBrightness.emit(value);
  }

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
