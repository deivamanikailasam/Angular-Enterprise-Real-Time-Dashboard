import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="text-2xl font-bold mb-4 text-white">Alerts</h2>
      <p class="text-slate-400">Alert management coming next...</p>
    </div>
  `,
})
export class AlertsPage {}
