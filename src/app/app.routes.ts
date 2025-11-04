import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth';
import { DashboardLayout } from './layouts/dashboard-layout';
import { LoginPage } from './pages/login/login';
import { UnauthorizedPage } from './pages/unauthorized';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full',
    },
    {
        path: 'login',
        component: LoginPage,
        canActivate: [publicGuard], // Redirect to dashboard if already logged in
    },
    {
        path: 'dashboard',
        component: DashboardLayout,
        canActivate: [authGuard],
        children: [
            {
                path: 'view',
                loadComponent: () =>
                    import('./pages/metrics-view').then(m => m.MetricsViewPage),
                data: { roles: [] } // Everyone can view metrics
            },
            {
                path: 'customize',
                loadComponent: () =>
                    import('./pages/customize-dashboard').then(m => m.CustomizeDashboardPage),
                data: { roles: ['admin', 'tenant-user'] }
            },
            {
                path: 'alerts',
                loadComponent: () =>
                    import('./pages/alerts').then(m => m.AlertsPage),
                data: { roles: [] }
            }
        ]
    },
    {
        path: 'admin/metrics',
        loadComponent: () =>
            import('./pages/metrics-view').then(m => m.MetricsViewPage),
        canActivate: [authGuard],
        data: { roles: ['admin'] }
    },
    {
        path: 'unauthorized',
        component: UnauthorizedPage,
      },
      {
        path: '**',
        redirectTo: '/login', // Redirect unknown routes to login
      },
];
