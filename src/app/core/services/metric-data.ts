import { Injectable } from '@angular/core';
import { signal, effect } from '@angular/core';
import { DashboardMetric, MetricDataPoint } from '../../shared/models/dashboard.model';
import { WebSocketService } from './websocket';
import { CacheService } from './cache';

@Injectable({
  providedIn: 'root',
})
export class MetricsDataService {
  private metricsCache = new Map<string, DashboardMetric>();
  private updateInterval = signal<number>(5000); // 5 seconds

  constructor(
    private wsService: WebSocketService,
    private cacheService: CacheService
  ) {
    this.initializeMetrics();
    this.setupWebSocketListener();
    this.setupAutoRefresh();
  }

  private initializeMetrics(): void {
    // Mock data for demonstration
    const mockMetrics: DashboardMetric[] = [
      {
        id: 'cpu-usage',
        name: 'CPU Usage',
        description: 'System CPU utilization',
        currentValue: 65,
        trend: 'up',
        dataPoints: this.generateMockDataPoints(65),
        unit: '%',
        threshold: { warning: 70, critical: 90 },
      },
      {
        id: 'memory-usage',
        name: 'Memory Usage',
        description: 'System memory consumption',
        currentValue: 48,
        trend: 'stable',
        dataPoints: this.generateMockDataPoints(48),
        unit: 'GB',
        threshold: { warning: 60, critical: 80 },
      },
      {
        id: 'disk-io',
        name: 'Disk I/O',
        description: 'Disk read/write operations',
        currentValue: 320,
        trend: 'down',
        dataPoints: this.generateMockDataPoints(320),
        unit: 'MB/s',
        threshold: { warning: 500, critical: 800 },
      },
      {
        id: 'network-latency',
        name: 'Network Latency',
        description: 'Average network response time',
        currentValue: 45,
        trend: 'stable',
        dataPoints: this.generateMockDataPoints(45),
        unit: 'ms',
        threshold: { warning: 100, critical: 200 },
      },
      {
        id: 'api-errors',
        name: 'API Error Rate',
        description: 'Percentage of failed requests',
        currentValue: 2.3,
        trend: 'down',
        dataPoints: this.generateMockDataPoints(2.3),
        unit: '%',
        threshold: { warning: 5, critical: 10 },
      },
      {
        id: 'request-queue',
        name: 'Request Queue Depth',
        description: 'Number of pending requests',
        currentValue: 127,
        trend: 'up',
        dataPoints: this.generateMockDataPoints(127),
        unit: 'requests',
        threshold: { warning: 100, critical: 500 },
      },
    ];

    mockMetrics.forEach(metric => {
      this.metricsCache.set(metric.id, metric);
      this.cacheService.set(`metric-${metric.id}`, metric, 10000);
    });
  }

  private setupWebSocketListener(): void {
    this.wsService.messages$.subscribe(message => {
      if (message.type === 'metric-update') {
        this.updateMetricFromWebSocket(message.metricId, message.value);
      }
    });
  }

  private setupAutoRefresh(): void {
    effect(() => {
      const interval = this.updateInterval();
      const timer = setInterval(() => {
        this.simulateMetricUpdates();
      }, interval);

      return () => clearInterval(timer);
    });
  }

  private simulateMetricUpdates(): void {
    // Simulate real-time metric updates
    Array.from(this.metricsCache.values()).forEach(metric => {
      const newValue = this.generateRandomValue(
        metric.currentValue,
        metric.id
      );
      const newTrend = this.calculateTrend(metric.currentValue, newValue);

      const updatedMetric: DashboardMetric = {
        ...metric,
        currentValue: newValue,
        trend: newTrend,
        dataPoints: [
          ...metric.dataPoints.slice(-59), // Keep last 60 points
          {
            timestamp: Date.now(),
            value: newValue,
            unit: metric.unit,
          },
        ],
      };

      this.metricsCache.set(metric.id, updatedMetric);
      this.cacheService.set(
        `metric-${metric.id}`,
        updatedMetric,
        this.updateInterval()
      );
    });
  }

  private updateMetricFromWebSocket(
    metricId: string,
    value: number
  ): void {
    const metric = this.metricsCache.get(metricId);
    if (!metric) return;

    const updatedMetric: DashboardMetric = {
      ...metric,
      currentValue: value,
      trend: this.calculateTrend(metric.currentValue, value),
      dataPoints: [
        ...metric.dataPoints.slice(-59),
        {
          timestamp: Date.now(),
          value,
          unit: metric.unit,
        },
      ],
    };

    this.metricsCache.set(metricId, updatedMetric);
    this.cacheService.set(
      `metric-${metricId}`,
      updatedMetric,
      this.updateInterval()
    );
  }

  private generateRandomValue(baseValue: number, metricId: string): number {
    // Add realistic variance based on metric type
    const variance = baseValue * 0.1; // ±10% variance
    const change = (Math.random() - 0.5) * 2 * variance;
    const newValue = Math.max(0, baseValue + change);

    // Constrain specific metrics
    if (metricId === 'cpu-usage' || metricId === 'api-errors') {
      return Math.min(100, newValue);
    }

    return newValue;
  }

  private calculateTrend(
    oldValue: number,
    newValue: number
  ): 'up' | 'down' | 'stable' {
    const diff = newValue - oldValue;
    const threshold = oldValue * 0.02; // 2% threshold

    if (Math.abs(diff) <= threshold) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  private generateMockDataPoints(
    baseValue: number,
    count: number = 60
  ): MetricDataPoint[] {
    const points: MetricDataPoint[] = [];
    const now = Date.now();

    for (let i = count - 1; i >= 0; i--) {
      const variance = baseValue * 0.15;
      const value =
        baseValue + (Math.random() - 0.5) * 2 * variance;

      points.push({
        timestamp: now - i * 1000,
        value: Math.max(0, value),
        unit: '%',
      });
    }

    return points;
  }

  getMetric(metricId: string): DashboardMetric | null {
    return this.metricsCache.get(metricId) ?? null;
  }

  getAllMetrics(): DashboardMetric[] {
    return Array.from(this.metricsCache.values());
  }

  getMetricsByCritical(): DashboardMetric[] {
    return Array.from(this.metricsCache.values())
      .filter(m => m.threshold && m.currentValue >= m.threshold.critical)
      .sort(
        (a, b) => b.currentValue - a.currentValue
      );
  }

  setUpdateInterval(intervalMs: number): void {
    this.updateInterval.set(intervalMs);
  }

  connectWebSocket(url: string): Promise<void> {
    return this.wsService.connect(url);
  }

  disconnectWebSocket(): void {
    this.wsService.disconnect();
  }
}
