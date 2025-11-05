import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metrics-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="text-2xl font-bold mb-4 text-white">Metrics View</h2>
      <p class="text-slate-400">Metrics visualization coming next...</p>
    </div>
  `,
})
export class MetricsViewPage {}
