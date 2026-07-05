import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HealthService, HealthStatus } from '../../core/services/health.service';
import { Home } from './home';

describe('Home', () => {
  function setup(healthService: Partial<HealthService>) {
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [{ provide: HealthService, useValue: healthService }],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the success state with the backend status', () => {
    const mockHealth: HealthStatus = { status: 'ok', timestamp: '2026-07-05T12:00:00.000Z' };
    const element = setup({ checkHealth: () => of(mockHealth) });

    expect(element.querySelector('.status-success')?.textContent).toContain('ok');
  });

  it('shows the error state when the health check fails', () => {
    const element = setup({ checkHealth: () => throwError(() => new Error('network error')) });

    expect(element.querySelector('.status-error')?.textContent).toContain('Unable to reach backend');
  });
});
