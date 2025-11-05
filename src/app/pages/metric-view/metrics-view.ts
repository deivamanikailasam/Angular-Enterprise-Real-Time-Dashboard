import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MetricsGridComponent } from '../../shared/components/metric-grid/metric-grid';
import { DashboardMetric } from '../../shared/models/dashboard.model';
import { MetricsDataService } from '../../core/services/metric-data';
import { DashboardStoreService } from '../../core/services/dashboard-store';

@Component({
  selector: 'app-metrics-view',
  standalone: true,
  imports: [CommonModule, MetricsGridComponent, MatIconModule],
  template: `
    <div class="space-y-6">
      <!-- Critical Alerts Section -->
      @if (criticalMetrics().length > 0) {
        <div class="rounded-lg border-l-4 border-rose-500 bg-gradient-to-r from-rose-900/30 to-red-900/20 p-4 shadow-lg">
          <h3 class="text-lg font-bold text-rose-400 mb-3 flex items-center gap-2">
            <mat-icon class="text-xl">warning</mat-icon>
            Critical Alerts ({{ criticalMetrics().length }})
          </h3>
          <div class="space-y-2">
            @for (metric of criticalMetrics(); track metric.id) {
              <div class="flex items-center justify-between rounded-lg border border-rose-700/50 bg-slate-800/50 p-3">
                <span class="font-semibold text-white">{{ metric.name }}</span>
                <span class="text-rose-400 font-bold">
                  {{ metric.currentValue | number: '1.0-2' }} {{ metric.unit }}
                </span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Main Metrics Grid -->
      <app-metrics-grid [metrics]="allMetrics"></app-metrics-grid>
    </div>
  `,
})
export class MetricsViewPage implements OnInit, OnDestroy {
  allMetrics = signal<DashboardMetric[]>([]);
  criticalMetrics = signal<DashboardMetric[]>([]);
  private updateInterval?: number;

  constructor(
    private metricsDataService: MetricsDataService,
    private dashboardStore: DashboardStoreService
  ) {
    // Effect: Update dashboard store with metrics
    effect(() => {
      const metrics = this.allMetrics();
      if (metrics.length > 0) {
        this.dashboardStore.setMetrics(metrics);
      }
    });
  }

  ngOnInit(): void {
    this.loadMetrics();

    // Simulate real-time updates
    this.updateInterval = window.setInterval(() => {
      this.loadMetrics();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private loadMetrics(): void {
    const metrics = this.metricsDataService.getAllMetrics();
    this.allMetrics.set(metrics);

    const critical = this.metricsDataService.getMetricsByCritical();
    this.criticalMetrics.set(critical);
  }
}
