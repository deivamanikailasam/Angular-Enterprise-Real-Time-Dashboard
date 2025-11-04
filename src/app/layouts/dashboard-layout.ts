import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthGuard } from '../core/guards/auth';
import { TenantService } from '../core/services/tenant';
import { DashboardStoreService } from '../core/services/dashboard-store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
    templateUrl: './dashboard-layout.html',
    styleUrls: ['./dashboard-layout.css']
})
export class DashboardLayout implements OnInit {
  constructor(
    public authGuard: AuthGuard,
    public tenantService: TenantService,
    private dashboardStore: DashboardStoreService
  ) {}

  dashboardHealth: any;
  criticalMetricsCount: any;

  ngOnInit(): void {
    // Initialize dashboard on component load
    this.dashboardHealth = this.dashboardStore.dashboardHealth;
    this.criticalMetricsCount = this.dashboardStore.criticalMetrics;
    const tenantId = this.tenantService.activeTenant$()?.id;
    if (tenantId) {
      this.dashboardStore.setTenantId(tenantId);
      this.dashboardStore.setUserRole(
        this.authGuard.currentUser$()?.roles[0] ?? 'viewer'
      );
    }
  }

  onTenantChange(event: Event): void {
    const tenantId = (event.target as HTMLSelectElement).value;
    this.tenantService.setActiveTenant(tenantId);
    this.dashboardStore.setTenantId(tenantId);
  }

  onProfile(): void {
    console.log('Navigate to profile');
    // TODO: Implement profile navigation
  }

  onSettings(): void {
    console.log('Navigate to settings');
    // TODO: Implement settings navigation
  }

  onLogout(): void {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
      this.authGuard.logout();
      // authService.logout() already navigates to login
    }
  }
}
