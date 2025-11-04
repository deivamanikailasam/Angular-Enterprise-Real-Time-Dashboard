import { Injectable } from '@angular/core';
import { signal, computed, effect } from '@angular/core';
import { DashboardMetric, WidgetConfig } from '../../shared/models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardStoreService {
  // Core signals
  private readonly metrics = signal<DashboardMetric[]>([]);
  private readonly layout = signal<WidgetConfig[]>([]);
  private readonly loading = signal<boolean>(false);
  private readonly error = signal<string | null>(null);
  private readonly selectedMetricId = signal<string | null>(null);
  private readonly tenantId = signal<string | null>(null);
  private readonly userRole = signal<string>('viewer');

  // Computed signals
  readonly visibleMetrics = computed(() => {
    const role = this.userRole();
    const allMetrics = this.metrics();
    
    // Role-based filtering
    if (role === 'viewer') {
      return allMetrics.filter(m => !m.id.includes('admin'));
    }
    return allMetrics;
  });

  readonly metricsWithThresholds = computed(() => {
    return this.metrics().filter(m => m.threshold !== undefined);
  });

  readonly criticalMetrics = computed(() => {
    return this.visibleMetrics().filter(metric => {
      if (!metric.threshold) return false;
      return metric.currentValue >= metric.threshold.critical;
    });
  });

  readonly selectedMetric = computed(() => {
    const id = this.selectedMetricId();
    return this.metrics().find(m => m.id === id) || null;
  });

  readonly layoutForTenant = computed(() => {
    const tenant = this.tenantId();
    return this.layout().filter(w => w.metricId);
  });

  readonly dashboardHealth = computed(() => {
    const critical = this.criticalMetrics().length;
    const total = this.visibleMetrics().length;
    return {
      total,
      critical,
      healthy: total - critical,
      healthPercentage: total > 0 ? ((total - critical) / total) * 100 : 100,
    };
  });

  // Public accessors (read-only signals)
  readonly metrics$ = this.metrics.asReadonly();
  readonly layout$ = this.layout.asReadonly();
  readonly loading$ = this.loading.asReadonly();
  readonly error$ = this.error.asReadonly();
  readonly selectedMetricId$ = this.selectedMetricId.asReadonly();
  readonly tenantId$ = this.tenantId.asReadonly();
  readonly userRole$ = this.userRole.asReadonly();

  constructor() {
    // Effect: Log critical metrics for monitoring
    effect(() => {
      const critical = this.criticalMetrics();
      if (critical.length > 0) {
        console.warn('Critical metrics detected:', critical.map(m => m.name));
      }
    });

    // Effect: Auto-clear errors after 5 seconds
    effect(() => {
      const err = this.error();
      if (err) {
        const timeout = setTimeout(() => this.error.set(null), 5000);
        return () => clearTimeout(timeout);
      }
    });
  }

  // State mutations
  setMetrics(metrics: DashboardMetric[]): void {
    this.metrics.set(metrics);
  }

  updateMetric(metricId: string, updates: Partial<DashboardMetric>): void {
    this.metrics.update(current =>
      current.map(m => (m.id === metricId ? { ...m, ...updates } : m))
    );
  }

  addMetric(metric: DashboardMetric): void {
    this.metrics.update(current => [...current, metric]);
  }

  setLayout(layout: WidgetConfig[]): void {
    this.layout.set(layout);
  }

  updateWidgetPosition(widgetId: string, position: { x: number; y: number }): void {
    this.layout.update(current =>
      current.map(w => (w.id === widgetId ? { ...w, position } : w))
    );
  }

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  setError(error: string | null): void {
    this.error.set(error);
  }

  selectMetric(metricId: string | null): void {
    this.selectedMetricId.set(metricId);
  }

  setTenantId(tenantId: string): void {
    this.tenantId.set(tenantId);
  }

  setUserRole(role: string): void {
    this.userRole.set(role);
  }

  // Utility: Clear all state
  reset(): void {
    this.metrics.set([]);
    this.layout.set([]);
    this.loading.set(false);
    this.error.set(null);
    this.selectedMetricId.set(null);
  }
}
