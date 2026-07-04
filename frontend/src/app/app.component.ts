import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>Home Hub</h1>
      <p>Smart home dashboard for Raspberry Pi</p>
    </div>
  `,
  styles: [`
    .container {
      text-align: center;
      padding: 2rem;
      font-family: Arial, sans-serif;
    }

    h1 {
      color: #333;
      margin-bottom: 1rem;
    }

    p {
      color: #666;
      font-size: 1.1rem;
    }
  `]
})
export class AppComponent {}
