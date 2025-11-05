import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth';
import { DashboardLayout } from './layouts/dashboard-layout';
import { LoginPage } from './pages/login/login';
import { UnauthorizedPage } from './pages/unauthorized';
import { MetricsViewPage } from './pages/metric-view/metrics-view';
import { CustomizeDashboardPage } from './pages/customize-dashboard';
import { AlertsPage } from './pages/alerts';

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
        canActivate: [authGuard], // Protect parent route - prevents redirect to login before child guard runs
        children: [
            {
                path: '',
                redirectTo: 'view',
                pathMatch: 'full',
            },
            {
                path: 'view',
                component: MetricsViewPage,
                canActivate: [authGuard], // Explicitly protect child routes
                data: { roles: [] } // Everyone can view metrics
            },
            {
                path: 'customize',
                component: CustomizeDashboardPage,
                canActivate: [authGuard], // Explicitly protect child routes
                data: { roles: ['admin', 'tenant-user'] }
            },
            {
                path: 'alerts',
                component: AlertsPage,
                canActivate: [authGuard], // Explicitly protect child routes
                data: { roles: [] }
            }
        ]
    },
    {
        path: 'admin/metrics',
        component: MetricsViewPage,
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
