import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal, computed, effect } from '@angular/core';
import {
  CdkDropList,
  CdkDrag,
  CdkDragDrop,
  CdkDragEnter,
  CdkDragExit,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';

import { DashboardLayout, WidgetConfig } from '../../shared/models/dashboard.model';
import { LayoutStorageService } from '../../core/services/layout-storage';
import { AuthService } from '../../core/services/auth';
import { MetricsDataService } from '../../core/services/metric-data';
import { MetricWidgetComponent } from '../../shared/components/metric-widget/metric-widget';

@Component({
  selector: 'app-customize-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CdkDropList,
    CdkDrag,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatCardModule,
    FormsModule,
    MetricWidgetComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Customization Toolbar -->
      <div class="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-white">Customize Dashboard</h2>
            <p class="text-sm text-slate-400 mt-1">
              Drag widgets to rearrange them. Changes are auto-saved.
            </p>
          </div>

          <div class="flex gap-3">
            <button
              (click)="onAddWidget()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg flex items-center gap-2"
            >
              <mat-icon class="text-lg">add</mat-icon>
              Add Widget
            </button>
            <button
              (click)="onResetLayout()"
              class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition shadow-lg flex items-center gap-2"
            >
              <mat-icon class="text-lg">refresh</mat-icon>
              Reset
            </button>
            <button
              (click)="onExportLayout()"
              class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-lg flex items-center gap-2"
            >
              <mat-icon class="text-lg">download</mat-icon>
              Export
            </button>
          </div>
        </div>

        <!-- Layout Status -->
        <div class="mt-4 p-3 rounded-lg border border-slate-700/50 bg-slate-900/50 flex justify-between items-center text-sm">
          <span class="text-slate-200">
            @if (layoutSyncing()) {
              <mat-icon class="inline text-blue-400 animate-spin">sync</mat-icon>
              Syncing...
            } @else {
              <mat-icon class="inline text-emerald-400">check_circle</mat-icon>
              Auto-saved
            }
          </span>
          <span class="text-slate-400">
            {{ widgets().length }} widgets • Last saved: {{ lastSaveTime() | date: 'HH:mm:ss' }}
          </span>
        </div>
      </div>

      <!-- Available Metrics Panel -->
      <div class="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg p-4">
        <h3 class="text-lg font-semibold text-white mb-3">Available Metrics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          @for (metric of availableMetrics(); track metric.id) {
            @let isInWidgets = isMetricInWidgets(metric.id);
            <button
              (click)="onSelectMetric(metric.id)"
              [class.opacity-50]="isInWidgets"
              [class.cursor-not-allowed]="isInWidgets"
              [class.bg-slate-700/50]="isInWidgets"
              [class.bg-slate-800/50]="!isInWidgets"
              class="p-3 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 hover:border-blue-500/50 transition text-sm font-medium text-white text-center shadow-lg relative"
              [disabled]="isInWidgets"
              title="{{ isInWidgets ? 'Already added' : 'Add ' + metric.name + ' widget' }}"
            >
              {{ metric.name }}
              @if (isInWidgets) {
                <mat-icon class="absolute top-1 right-1 text-xs text-emerald-400">check_circle</mat-icon>
              }
            </button>
          }
        </div>
      </div>

      <!-- Customizable Grid -->
      <div class="rounded-lg border-2 border-dashed border-slate-700/50 bg-slate-900/30 p-6 min-h-96">
        @if (widgets().length === 0) {
          <div class="flex flex-col items-center justify-center h-96 text-slate-400">
            <mat-icon class="text-6xl mb-4 text-slate-500">dashboard_customize</mat-icon>
            <p class="text-lg">Add widgets to customize your dashboard</p>
            <p class="text-sm text-slate-500 mt-2">Click "Add Widget" or select a metric above</p>
          </div>
        } @else {
          <div
            cdkDropList
            [cdkDropListData]="widgets()"
            (cdkDropListDropped)="onDrop($event)"
            (cdkDropListEntered)="onDragEntered($event)"
            (cdkDropListExited)="onDragExited($event)"
            [cdkDropListSortingDisabled]="false"
            [cdkDropListAutoScrollDisabled]="false"
            [cdkDropListAutoScrollStep]="20"
            [cdkDropListEnterPredicate]="dropListEnterPredicate"
            class="widget-grid-container"
          >
            @for (widget of widgets(); track widget.id; let i = $index) {
              <div
                cdkDrag
                [cdkDragDisabled]="false"
                [cdkDragLockAxis]="null"
                class="widget-card"
              >
                <ng-template cdkDragPlaceholder>
                  <div class="widget-card widget-card-placeholder" aria-hidden="true">
                    <div class="widget-card-placeholder__content">
                      <mat-icon class="text-2xl">open_with</mat-icon>
                      <span>Release to drop widget</span>
                    </div>
                  </div>
                </ng-template>

                <!-- Widget Header -->
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex justify-between items-center border-b border-slate-700/50">
                  <span class="font-semibold text-sm flex-1">
                    {{ getMetricName(widget.metricId) }}
                  </span>
                  <button
                    (click)="onRemoveWidget(widget.id)"
                    class="p-1 hover:bg-blue-800 rounded transition"
                    type="button"
                    title="Remove widget"
                  >
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                </div>

                <!-- Widget Preview -->
                <div class="p-4">
                  @if (getMetric(widget.metricId); as metric) {
                    <app-metric-widget [metric]="metric"></app-metric-widget>
                  } @else {
                    <div class="flex items-center justify-center h-32 text-slate-500">
                      <mat-icon class="animate-spin mr-2">refresh</mat-icon>
                      <span class="text-sm">Loading metric...</span>
                    </div>
                  }
                </div>

                <!-- Widget Footer with Index -->
                <div class="px-3 py-2 bg-slate-900/50 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-400">
                  <span>Position: {{ i + 1 }}</span>
                  <span>{{ widget.refreshInterval / 1000 }}s</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Widget Configuration Panel -->
      <div class="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg p-4">
        <h3 class="text-lg font-semibold text-white mb-4">Widget Configuration</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Refresh Interval (ms)
            </label>
            <input
              type="number"
              [(ngModel)]="refreshInterval"
              (change)="onRefreshIntervalChange()"
              min="1000"
              step="1000"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Grid Size
            </label>
            <select
              [(ngModel)]="gridSize"
              (change)="onGridSizeChange()"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="small" class="bg-slate-900 text-slate-200">Small</option>
              <option value="medium" class="bg-slate-900 text-slate-200">Medium</option>
              <option value="large" class="bg-slate-900 text-slate-200">Large</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .widget-card {
        background: linear-gradient(to bottom right, rgb(30 41 55 / 0.5), rgb(15 23 42 / 0.5));
        border: 1px solid rgb(51 65 85 / 0.5);
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transition: box-shadow 0.2s;
        overflow: hidden;
        min-height: 200px;
        width: 100%;
        position: relative;
      }

      .widget-card:hover {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      /* Drag and Drop Styles */
      .cdk-drag {
        cursor: grab;
      }

      .cdk-drag.cdk-drag-dragging {
        cursor: grabbing;
      }

      .cdk-drag-preview {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        opacity: 0.9;
        transform: rotate(2deg);
        pointer-events: none;
      }

      .cdk-drag-placeholder {
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        pointer-events: none !important;
      }

      /* Smooth transitions for items moving during drag */
      .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder):not(.cdk-drag-preview) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1) !important;
        will-change: transform;
      }

      .cdk-drop-list-dragging .cdk-drag.cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1) !important;
        will-change: transform;
      }

      /* Ensure placeholder doesn't block transitions */
      .cdk-drag-placeholder {
        transition: none !important;
      }

      .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
        pointer-events: none;
      }

      /* Widget grid container - using CSS Grid for proper placeholder positioning */
      .widget-grid-container.cdk-drop-list {
        display: grid !important;
        grid-template-columns: repeat(1, 1fr);
        gap: 1rem;
        position: relative;
        grid-auto-rows: minmax(200px, auto);
        align-items: stretch;
      }

      @media (min-width: 768px) {
        .widget-grid-container.cdk-drop-list {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (min-width: 1024px) {
        .widget-grid-container.cdk-drop-list {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Ensure placeholder is visible and properly sized in grid */
      .cdk-drag-placeholder {
        grid-column: span 1;
        grid-row: span 1;
        min-height: 200px;
      }

      /* Visual feedback during drag */
      .cdk-drop-list.cdk-drop-list-dragging .widget-card:not(.cdk-drag-placeholder) {
        opacity: 0.7;
      }

      .widget-card-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        border: 3px dashed rgb(59 130 246);
        border-radius: 0.5rem;
        background: linear-gradient(135deg, rgb(30 58 138 / 0.6), rgb(59 130 246 / 0.25));
        box-sizing: border-box;
        box-shadow: 0 0 0 2px rgb(59 130 246 / 0.4), inset 0 0 20px rgb(59 130 246 / 0.2);
        animation: dropHighlight 1.5s ease-in-out infinite;
        width: 100%;
        height: 100%;
      }

      .widget-card-placeholder__content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        color: rgb(96 165 250);
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        pointer-events: none;
      }

      .widget-card-placeholder__content mat-icon {
        font-size: 2rem;
      }

      @keyframes dropHighlight {
        0%, 100% {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px rgb(59 130 246 / 0.4), inset 0 0 20px rgb(59 130 246 / 0.2);
        }
        50% {
          border-color: rgb(96 165 250);
          box-shadow: 0 0 0 4px rgb(96 165 250 / 0.5), inset 0 0 30px rgb(96 165 250 / 0.25);
        }
      }

    `,
  ],
})
export class CustomizeDashboardPage implements OnInit, OnDestroy {
  widgets = signal<WidgetConfig[]>([]);
  refreshInterval = 5000;
  gridSize = 'medium';

  private currentLayout = signal<DashboardLayout | null>(null);
  private syncTimeout?: number;
  lastSaveTime = signal<number>(Date.now());

  layoutSyncing = signal<boolean>(false);

  availableMetrics = computed(() => {
    return this.metricsDataService.getAllMetrics();
  });

  constructor(
    private layoutStorageService: LayoutStorageService,
    private authService: AuthService,
    private metricsDataService: MetricsDataService
  ) {
    // Effect: Sync layout to store
    effect(() => {
      const widgets = this.widgets();
      const user = this.authService.currentUser$();
      if (user && widgets) {
        this.syncLayout(user.id, user.tenantId);
      }
    });
  }

  ngOnInit(): void {
    this.loadLayout();
  }

  ngOnDestroy(): void {
    // Cleanup sync timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
  }

  private loadLayout(): void {
    const userId = this.authService.currentUser$()?.id;
    if (!userId) return;

    const layout = this.layoutStorageService.loadLayoutForUser(userId);
    if (layout) {
      this.widgets.set(layout.widgets);
      this.currentLayout.set(layout);
    } else {
      // Initialize with default widgets
      this.initializeDefaultLayout();
    }
  }

  private initializeDefaultLayout(): void {
    const defaultMetrics = this.metricsDataService
      .getAllMetrics()
      .slice(0, 3);

    const defaultWidgets: WidgetConfig[] = defaultMetrics.map((metric, index) => ({
      id: `widget-${index}`,
      metricId: metric.id,
      position: { x: index * 20, y: index * 20 },
      size: { width: 300, height: 300 },
      refreshInterval: 5000,
    }));

    this.widgets.set(defaultWidgets);
  }

  private syncLayout(userId: string, tenantId: string): void {
    // Debounce sync to avoid too many saves
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.layoutSyncing.set(true);

    this.syncTimeout = window.setTimeout(() => {
      const layout: DashboardLayout = {
        userId,
        tenantId,
        widgets: this.widgets(),
        lastModified: Date.now(),
      };

      try {
        this.layoutStorageService.saveLayout(layout);
        this.lastSaveTime.set(Date.now());
      } catch (error) {
        // Handle save error - log in development mode only
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.error('Failed to save layout:', error);
        }
      } finally {
        this.layoutSyncing.set(false);
      }
    }, 500); // Debounce delay
  }

  onDragEntered(_event: CdkDragEnter<WidgetConfig[]>): void {
    // Placeholder should move automatically, but we can add visual feedback if needed
  }

  onDragExited(_event: CdkDragExit<WidgetConfig[]>): void {
    // Clean up any visual feedback if needed
  }

  onDrop(event: CdkDragDrop<WidgetConfig[]>): void {
    // Validate event
    if (!event.container || !event.container.data) {
      return;
    }

    // Only proceed if item was moved
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    // Ensure we're working with the same container
    if (event.container !== event.previousContainer) {
      return; // Cross-container drops not supported yet
    }

    // Get current widgets array from signal - ensure we have the latest
    const currentWidgets = [...this.widgets()];
    
    // Validate indices
    if (
      event.previousIndex < 0 ||
      event.previousIndex >= currentWidgets.length ||
      event.currentIndex < 0 ||
      event.currentIndex >= currentWidgets.length
    ) {
      return;
    }
    
    // Reorder using Angular CDK utility
    // This moves the item from previousIndex to currentIndex
    // Example: [A, B, C] -> drag A to position 1 -> [B, A, C]
    moveItemInArray(currentWidgets, event.previousIndex, event.currentIndex);
    
    // Update positions based on new order
    const reorderedWidgets = currentWidgets.map((widget, index) => ({
      ...widget,
      position: { x: index * 20, y: index * 20 },
    }));
    
    // Update widgets signal - this will trigger auto-save via effect
    this.widgets.set(reorderedWidgets);
  }

  onAddWidget(): void {
    const availableMetrics = this.availableMetrics();
    if (availableMetrics.length === 0) {
      return; // No metrics available
    }

    // Find first metric that's not already in widgets
    const existingMetricIds = this.widgets().map(w => w.metricId);
    const availableMetric = availableMetrics.find(m => !existingMetricIds.includes(m.id)) 
      ?? availableMetrics[0];

    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metricId: availableMetric.id,
      position: { x: this.widgets().length * 20, y: this.widgets().length * 20 },
      size: { width: 300, height: 300 },
      refreshInterval: this.refreshInterval,
    };

    this.widgets.update(current => [...current, newWidget]);
  }

  onRemoveWidget(widgetId: string): void {
    this.widgets.update(current =>
      current.filter(w => w.id !== widgetId)
    );
  }

  onSelectMetric(metricId: string): void {
    // Check if metric already exists in widgets
    const existingWidget = this.widgets().find(w => w.metricId === metricId);
    if (existingWidget) {
      // If metric already exists, highlight it or show a message
      // For now, we'll just return silently
      return;
    }
    
    // Add new widget with selected metric
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metricId,
      position: { x: this.widgets().length * 20, y: this.widgets().length * 20 },
      size: { width: 300, height: 300 },
      refreshInterval: this.refreshInterval,
    };

    this.widgets.update(current => [...current, newWidget]);
  }

  onResetLayout(): void {
    if (confirm('Reset layout to default? This cannot be undone.')) {
      this.initializeDefaultLayout();
    }
  }

  onExportLayout(): void {
    const userId = this.authService.currentUser$()?.id;
    if (!userId) return;

    const exported = this.layoutStorageService.exportLayout(userId);
    if (!exported) return;

    const blob = new Blob([exported], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-layout-${new Date().toISOString()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  onRefreshIntervalChange(): void {
    // Update all widgets with new refresh interval
    this.widgets.update(current =>
      current.map(w => ({
        ...w,
        refreshInterval: this.refreshInterval,
      }))
    );
  }

  onGridSizeChange(): void {
    // Apply grid size changes dynamically
    // This could be used to adjust grid columns or widget sizes
    // For now, the grid size is handled by CSS classes
  }

  onWidgetMetricChange(widgetId: string, newMetricId: string): void {
    // Update a specific widget's metric
    this.widgets.update(current =>
      current.map(w =>
        w.id === widgetId ? { ...w, metricId: newMetricId } : w
      )
    );
  }

  getMetricName(metricId: string): string {
    return (
      this.metricsDataService
        .getAllMetrics()
        .find(m => m.id === metricId)?.name ?? 'Unknown'
    );
  }

  getMetric(metricId: string) {
    return this.metricsDataService.getMetric(metricId);
  }

  isMetricInWidgets(metricId: string): boolean {
    return this.widgets().some(w => w.metricId === metricId);
  }

  dropListEnterPredicate = () => {
    // Always allow dropping in the same list
    return true;
  };
}
