import { Component, inject, signal } from '@angular/core';

import { HealthService, HealthStatus } from '../../core/services/health.service';

type HealthViewState =
  | { kind: 'loading' }
  | { kind: 'success'; health: HealthStatus }
  | { kind: 'error' };

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly healthService = inject(HealthService);

  protected readonly state = signal<HealthViewState>({ kind: 'loading' });

  constructor() {
    this.healthService.checkHealth().subscribe({
      next: (health) => this.state.set({ kind: 'success', health }),
      error: (error) => {
        console.error('Health check failed', error);
        this.state.set({ kind: 'error' });
      },
    });
  }
}
