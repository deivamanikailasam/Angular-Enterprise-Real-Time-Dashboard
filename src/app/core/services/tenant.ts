import { Injectable } from '@angular/core';
import { signal, computed } from '@angular/core';
import { TenantConfig } from '../../shared/models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private activeTenant = signal<TenantConfig | null>(null);
  private availableTenants = signal<TenantConfig[]>([
    {
      id: 'tenant-1',
      name: 'Acme Corp',
      dataRetention: 30,
      maxUsers: 100,
    },
    {
      id: 'tenant-2',
      name: 'Global Industries',
      dataRetention: 60,
      maxUsers: 500,
    },
  ]);

  readonly activeTenant$ = this.activeTenant.asReadonly();
  readonly availableTenants$ = this.availableTenants.asReadonly();

  readonly tenantName = computed(() => this.activeTenant()?.name ?? 'No Tenant');
  readonly dataRetention = computed(() => this.activeTenant()?.dataRetention ?? 30);
  readonly maxUsers = computed(() => this.activeTenant()?.maxUsers ?? 0);

  constructor() {
    // Set default tenant
    this.setActiveTenant('tenant-1');
  }

  setActiveTenant(tenantId: string): void {
    const tenant = this.availableTenants().find(t => t.id === tenantId);
    if (tenant) {
      this.activeTenant.set(tenant);
    }
  }

  getTenantById(tenantId: string): TenantConfig | null {
    return this.availableTenants().find(t => t.id === tenantId) ?? null;
  }

  addTenant(tenant: TenantConfig): void {
    this.availableTenants.update(current => [...current, tenant]);
  }
}