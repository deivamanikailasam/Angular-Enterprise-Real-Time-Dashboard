import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal, effect } from '@angular/core';
import { DashboardMetric } from '../../models/dashboard.model';
import { MetricWidgetComponent } from '../metric-widget/metric-widget';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MetricsDataService } from '../../../core/services/metric-data';

@Component({
  selector: 'app-metrics-grid',
  standalone: true,
  imports: [CommonModule, MetricWidgetComponent, MatProgressSpinnerModule, MatMenuModule, MatIconModule],
  styles: [`
    /* Interval Menu Dropdown Styling */
    ::ng-deep .mat-mdc-menu-panel.interval-menu,
    ::ng-deep .mat-mdc-menu-panel[class*="interval-menu"],
    ::ng-deep .cdk-overlay-pane .mat-mdc-menu-panel.interval-menu {
      background: rgb(15 23 42) !important;
      border: 1px solid rgb(51 65 85 / 0.5) !important;
      border-radius: 0.75rem !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1) !important;
      backdrop-filter: blur(12px) !important;
      padding: 0.5rem !important;
      min-width: 200px !important;
    }

    ::ng-deep .mat-mdc-menu-panel.interval-menu .mat-mdc-menu-item,
    ::ng-deep .mat-mdc-menu-panel[class*="interval-menu"] .mat-mdc-menu-item,
    ::ng-deep .cdk-overlay-pane .mat-mdc-menu-panel.interval-menu .mat-mdc-menu-item {
      color: rgb(203 213 225) !important;
      border-radius: 0.5rem !important;
      margin: 0.125rem 0 !important;
      padding: 0.625rem 1rem !important;
      transition: all 0.2s ease !important;
    }

    ::ng-deep .mat-mdc-menu-panel.interval-menu .mat-mdc-menu-item:hover,
    ::ng-deep .mat-mdc-menu-panel[class*="interval-menu"] .mat-mdc-menu-item:hover,
    ::ng-deep .cdk-overlay-pane .mat-mdc-menu-panel.interval-menu .mat-mdc-menu-item:hover {
      background: rgb(30 41 59) !important;
      color: rgb(255 255 255) !important;
    }

    ::ng-deep .mat-mdc-menu-panel.interval-menu .mat-mdc-menu-item.menu-item-selected,
    ::ng-deep .mat-mdc-menu-panel[class*="interval-menu"] .mat-mdc-menu-item.menu-item-selected,
    ::ng-deep .cdk-overlay-pane .mat-mdc-menu-panel.interval-menu .mat-mdc-menu-item.menu-item-selected {
      background: rgb(30 41 59) !important;
      color: rgb(96 165 250) !important;
    }
  `],
  template: `
    <div class="space-y-6">
      <!-- Grid Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">
          Real-Time Metrics
        </h2>
        <div class="flex gap-3">
          <button
            (click)="onRefresh()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            Refresh
          </button>
          <button
            [matMenuTriggerFor]="intervalMenu"
            class="group flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm font-medium text-slate-200 shadow-lg transition hover:border-slate-600 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500/30"
          >
            <span class="whitespace-nowrap text-xs leading-normal">{{ getIntervalLabel() }}</span>
            <mat-icon class="text-base text-blue-400 transition group-hover:text-blue-300 shrink-0 flex items-center justify-center w-4 h-4">expand_more</mat-icon>
          </button>

          <mat-menu #intervalMenu="matMenu" class="interval-menu">
            <button 
              mat-menu-item 
              (click)="onIntervalSelect('1000')"
              [class.menu-item-selected]="selectedInterval === '1000'"
            >
              <span>1 second</span>
            </button>
            <button 
              mat-menu-item 
              (click)="onIntervalSelect('5000')"
              [class.menu-item-selected]="selectedInterval === '5000'"
            >
              <span>5 seconds</span>
            </button>
            <button 
              mat-menu-item 
              (click)="onIntervalSelect('10000')"
              [class.menu-item-selected]="selectedInterval === '10000'"
            >
              <span>10 seconds</span>
            </button>
            <button 
              mat-menu-item 
              (click)="onIntervalSelect('30000')"
              [class.menu-item-selected]="selectedInterval === '30000'"
            >
              <span>30 seconds</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Metrics Grid -->
      @if (metrics().length === 0) {
        <div class="flex items-center justify-center h-64">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          @for (metric of metrics(); track metric.id) {
            <app-metric-widget [metric]="metric"></app-metric-widget>
          }
        </div>
      }

      <!-- Auto-update Indicator -->
      <div class="flex items-center justify-between text-sm text-slate-400 mt-4">
        <span>Last updated: {{ lastUpdateTime() | date: 'HH:mm:ss' }}</span>
        <span
          [class.text-emerald-400]="isAutoUpdating()"
          [class.text-slate-500]="!isAutoUpdating()"
        >
          {{ isAutoUpdating() ? '● Auto-updating' : '● Paused' }}
        </span>
      </div>
    </div>
  `,
})
export class MetricsGridComponent implements OnInit {
  @Input() metrics = signal<DashboardMetric[]>([]);

  selectedInterval = '5000';
  isAutoUpdating = signal<boolean>(true);
  lastUpdateTime = signal<number>(Date.now());

  constructor(private metricsDataService: MetricsDataService) {
    // Effect: Update timestamp on metric changes
    effect(() => {
      this.metrics();
      this.lastUpdateTime.set(Date.now());
    });
  }

  ngOnInit(): void {
    // Metrics are provided via Input, no need to load here
  }

  onRefresh(): void {
    // Refresh is handled by parent component
    // If needed, emit event to parent or reload from service
    const allMetrics = this.metricsDataService.getAllMetrics();
    this.metrics.set(allMetrics);
  }

  onIntervalSelect(interval: string): void {
    this.selectedInterval = interval;
    const intervalMs = parseInt(interval, 10);
    this.metricsDataService.setUpdateInterval(intervalMs);
  }

  getIntervalLabel(): string {
    const labels: { [key: string]: string } = {
      '1000': '1 second',
      '5000': '5 seconds',
      '10000': '10 seconds',
      '30000': '30 seconds'
    };
    return labels[this.selectedInterval] || '5 seconds';
  }
}

