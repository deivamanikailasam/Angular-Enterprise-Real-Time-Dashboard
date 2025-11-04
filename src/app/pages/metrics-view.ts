import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metrics-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold mb-4">Metrics View</h2>
      <p class="text-gray-600">Metrics visualization coming next...</p>
    </div>
  `,
})
export class MetricsViewPage {}
