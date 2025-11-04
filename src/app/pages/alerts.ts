import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold mb-4">Alerts</h2>
      <p class="text-gray-600">Alert management coming next...</p>
    </div>
  `,
})
export class AlertsPage {}
