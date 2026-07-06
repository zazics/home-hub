import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Device, ListDevicesParams, PaginatedDevicesResponse } from '../models/device';

export interface LightCommand {
  power?: 'on' | 'off';
  brightness?: number;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly http = inject(HttpClient);

  listDevices(params?: ListDevicesParams): Observable<PaginatedDevicesResponse> {
    let httpParams = new HttpParams();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          httpParams = httpParams.set(key, value);
        }
      }
    }

    return this.http.get<PaginatedDevicesResponse>(`${environment.apiBaseUrl}/devices`, {
      params: httpParams,
    });
  }

  sendLightCommand(id: string, command: LightCommand): Observable<Device> {
    return this.http.patch<Device>(`${environment.apiBaseUrl}/devices/${id}/light-command`, command);
  }
}
