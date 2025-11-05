import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardMetric } from '../../models/dashboard.model';
import { signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-metric-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './metric-widget.html',
  styleUrls: ['./metric-widget.css']
})
export class MetricWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() metric!: DashboardMetric;

  private updateTimestamp = signal<number>(Date.now());
  private updateInterval?: number;
  chartPath = signal<string>('');
  chartViewBox = signal<string>('0 0 200 100');
  
  chartWidth = 200;
  chartHeight = 100;
  padding = { top: 10, right: 10, bottom: 20, left: 10 };

  minValue = computed(() => {
    this.updateTimestamp(); // Dependency for reactivity
    if (!this.metric?.dataPoints || this.metric.dataPoints.length === 0) {
      return 0;
    }
    return Math.min(...this.metric.dataPoints.map(p => p.value), Infinity);
  });

  maxValue = computed(() => {
    this.updateTimestamp();
    if (!this.metric?.dataPoints || this.metric.dataPoints.length === 0) {
      return 0;
    }
    return Math.max(...this.metric.dataPoints.map(p => p.value), -Infinity);
  });

  statusLabel = computed(() => {
    if (!this.metric?.threshold) return 'N/A';
    if (this.isCriticalThreshold()) return 'Critical';
    if (this.isWarningThreshold()) return 'Warning';
    return 'Healthy';
  });

  progressPercentage = computed(() => {
    if (!this.metric?.threshold) return 0;
    const max = this.metric.threshold.critical;
    return (this.metric.currentValue / max) * 100;
  });

  progressColor = computed(() => {
    if (this.isCriticalThreshold()) return 'warn';
    if (this.isWarningThreshold()) return 'accent';
    return 'primary';
  });

  constructor() {
    // Empty constructor - effects will be set up after inputs are available
  }

  ngOnInit(): void {
    // Force initial chart update after a short delay to ensure input is set
    setTimeout(() => {
      this.updateChart();
    }, 100);

    // Set up interval to check for data changes (in case array is modified in place)
    this.updateInterval = window.setInterval(() => {
      this.updateChart();
    }, 1000); // Check every second
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update chart when metric input changes
    if (changes['metric']) {
      this.updateTimestamp.set(Date.now());
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    // Cleanup interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private updateChart(): void {
    // Check if metric and dataPoints exist
    if (!this.metric) {
      this.chartPath.set('');
      return;
    }

    if (!this.metric.dataPoints || this.metric.dataPoints.length === 0) {
      this.chartPath.set('');
      return;
    }

    const dataPoints = this.metric.dataPoints;
    const visiblePoints = dataPoints.slice(-30); // Show last 30 points for clarity
    
    if (visiblePoints.length === 0) {
      this.chartPath.set('');
      return;
    }

    const width = this.chartWidth - this.padding.left - this.padding.right;
    const height = this.chartHeight - this.padding.top - this.padding.bottom;
    
    // If we have only one point, create a simple horizontal line
    if (visiblePoints.length === 1) {
      const y = height / 2 + this.padding.top; // Center vertically
      const path = `M ${this.padding.left} ${y} L ${this.padding.left + width} ${y}`;
      this.chartPath.set(path);
      this.chartViewBox.set(`0 0 ${this.chartWidth} ${this.chartHeight}`);
      return;
    }

    // Calculate min/max for scaling
    const values = visiblePoints.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1; // Avoid division by zero
    
    // Generate SVG path points
    const points = visiblePoints.map((point, index) => {
      const x = (index / (visiblePoints.length - 1)) * width + this.padding.left;
      const y = height - ((point.value - minValue) / range) * height + this.padding.top;
      return { x, y };
    });

    // Create line path using linear interpolation
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }

    this.chartPath.set(path);
    this.chartViewBox.set(`0 0 ${this.chartWidth} ${this.chartHeight}`);
  }

  isCriticalThreshold(): boolean {
    if (!this.metric?.threshold) return false;
    return this.metric.currentValue >= this.metric.threshold.critical;
  }

  isWarningThreshold(): boolean {
    if (!this.metric?.threshold) return false;
    return (
      this.metric.currentValue >= this.metric.threshold.warning &&
      this.metric.currentValue < this.metric.threshold.critical
    );
  }

  isThresholdExceeded(): boolean {
    if (!this.metric?.threshold) return false;
    return this.metric.currentValue >= this.metric.threshold.warning;
  }
}
