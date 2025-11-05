import { Injectable } from '@angular/core';
import { signal, effect } from '@angular/core';
import { DashboardLayout, WidgetConfig } from '../../shared/models/dashboard.model';

interface StorageConfig {
  storageKey: string;
  compressionEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LayoutStorageService {
  private readonly storageConfig: StorageConfig = {
    storageKey: 'dashboard-layout',
    compressionEnabled: true,
  };

  private layouts = signal<Map<string, DashboardLayout>>(new Map());
  private currentLayout = signal<DashboardLayout | null>(null);
  private syncInProgress = signal<boolean>(false);
  private lastSyncTime = signal<number>(0);

  readonly layouts$ = this.layouts.asReadonly();
  readonly currentLayout$ = this.currentLayout.asReadonly();
  readonly syncInProgress$ = this.syncInProgress.asReadonly();
  readonly lastSyncTime$ = this.lastSyncTime.asReadonly();

  constructor() {
    this.initializeFromStorage();

    // Effect: Auto-save layout changes (debounced)
    effect(() => {
      const layout = this.currentLayout();
      if (layout && !this.syncInProgress()) {
        this.debouncedSave();
      }
    });
  }

  private debounceTimer: any;

  private debouncedSave(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.persistLayoutToStorage();
    }, 1000); // Save after 1 second of inactivity
  }

  private initializeFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageConfig.storageKey);
      if (stored) {
        const layouts = JSON.parse(stored) as DashboardLayout[];
        const layoutMap = new Map(layouts.map(l => [l.userId, l]));
        this.layouts.set(layoutMap);
      }
    } catch (error) {
      console.error('Error loading layouts from storage:', error);
    }
  }

  private persistLayoutToStorage(): void {
    try {
      this.syncInProgress.set(true);
      const layoutArray = Array.from(this.layouts().values());
      const serialized = JSON.stringify(layoutArray);

      // Optional: Compress before storing
      if (this.storageConfig.compressionEnabled) {
        // Note: In production, use a library like lz-string for compression
        localStorage.setItem(
          this.storageConfig.storageKey,
          serialized
        );
      } else {
        localStorage.setItem(
          this.storageConfig.storageKey,
          serialized
        );
      }

      this.lastSyncTime.set(Date.now());
      console.log('Layout persisted to storage');
    } catch (error) {
      console.error('Error persisting layout to storage:', error);
    } finally {
      this.syncInProgress.set(false);
    }
  }

  loadLayoutForUser(userId: string): DashboardLayout | null {
    return this.layouts().get(userId) ?? null;
  }

  saveLayout(layout: DashboardLayout): void {
    this.layouts.update(current => {
      const updated = new Map(current);
      updated.set(layout.userId, layout);
      return updated;
    });

    this.currentLayout.set(layout);
  }

  updateWidgetPosition(
    userId: string,
    widgetId: string,
    position: { x: number; y: number }
  ): void {
    const layout = this.layouts().get(userId);
    if (!layout) return;

    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: layout.widgets.map(w =>
        w.id === widgetId ? { ...w, position } : w
      ),
      lastModified: Date.now(),
    };

    this.saveLayout(updatedLayout);
  }

  updateWidgetSize(
    userId: string,
    widgetId: string,
    size: { width: number; height: number }
  ): void {
    const layout = this.layouts().get(userId);
    if (!layout) return;

    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: layout.widgets.map(w =>
        w.id === widgetId ? { ...w, size } : w
      ),
      lastModified: Date.now(),
    };

    this.saveLayout(updatedLayout);
  }

  addWidgetToLayout(
    userId: string,
    widget: WidgetConfig
  ): void {
    const layout = this.layouts().get(userId);
    if (!layout) return;

    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: [...layout.widgets, widget],
      lastModified: Date.now(),
    };

    this.saveLayout(updatedLayout);
  }

  removeWidgetFromLayout(userId: string, widgetId: string): void {
    const layout = this.layouts().get(userId);
    if (!layout) return;

    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: layout.widgets.filter(w => w.id !== widgetId),
      lastModified: Date.now(),
    };

    this.saveLayout(updatedLayout);
  }

  resetLayoutToDefault(userId: string, tenantId: string): void {
    const defaultLayout: DashboardLayout = {
      userId,
      tenantId,
      widgets: [],
      lastModified: Date.now(),
    };

    this.saveLayout(defaultLayout);
  }

  exportLayout(userId: string): string | null {
    const layout = this.layouts().get(userId);
    if (!layout) return null;

    return JSON.stringify(layout, null, 2);
  }

  importLayout(layoutJson: string, userId: string): boolean {
    try {
      const layout = JSON.parse(layoutJson) as DashboardLayout;
      layout.userId = userId;
      layout.lastModified = Date.now();

      this.saveLayout(layout);
      return true;
    } catch (error) {
      console.error('Error importing layout:', error);
      return false;
    }
  }

  clearStorage(): void {
    localStorage.removeItem(this.storageConfig.storageKey);
    this.layouts.set(new Map());
    this.currentLayout.set(null);
  }
}
