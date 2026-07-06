import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { DeviceList } from './pages/device-list/device-list';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'devices', component: DeviceList },
];
