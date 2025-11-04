import { Injectable, PLATFORM_ID } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { signal, computed, inject } from '@angular/core';
import { AuthUser, DemoUser, UserRole } from '../../shared/models/dashboard.models';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private currentUser = signal<AuthUser | null>(null);
  private isAuthenticated = signal<boolean>(false);

  // Demo users for development
  private demoUsers: DemoUser[] = [
    {
      email: 'admin@example.com',
      password: 'password123',
      id: 'admin-1',
      roles: ['admin'],
      tenantId: 'tenant-1',
    },
    {
      email: 'user@example.com',
      password: 'password123',
      id: 'user-1',
      roles: ['tenant-user'],
      tenantId: 'tenant-1',
    },
    {
      email: 'viewer@example.com',
      password: 'password123',
      id: 'viewer-1',
      roles: ['viewer'],
      tenantId: 'tenant-1',
    },
  ];

  readonly currentUser$ = this.currentUser.asReadonly();
  readonly isAuthenticated$ = this.isAuthenticated.asReadonly();

  readonly hasAdminRole = computed(() => {
    const user = this.currentUser();
    return user?.roles.includes('admin') ?? false;
  });

  readonly hasTenantUserRole = computed(() => {
    const user = this.currentUser();
    return user?.roles.includes('tenant-user') ?? false;
  });

  readonly hasViewerRole = computed(() => {
    const user = this.currentUser();
    return user?.roles.includes('viewer') ?? false;
  });

  readonly canEditDashboard = computed(() => {
    return this.hasAdminRole() || this.hasTenantUserRole();
  });

  constructor(private router: Router) {
    // Check if token exists in localStorage from previous session
    this.loadStoredSession();
  }



  setCurrentUser(user: {
    id: string;
    email: string;
    roles: UserRole[];
    tenantId: string;
  }): void {
    this.currentUser.set(user);
  }

  /**
 * Authenticate user with email and password
 */
  login(email: string, password: string): { success: boolean; error?: string } {
    // Find matching demo user
    const demoUser = this.demoUsers.find(
      u => u.email === email && u.password === password
    );

    if (!demoUser) {
      return {
        success: false,
        error: 'Invalid email or password. Check demo credentials below.',
      };
    }

    // Create authenticated user
    const authUser: AuthUser = {
      id: demoUser.id,
      email: demoUser.email,
      roles: demoUser.roles,
      tenantId: demoUser.tenantId,
      token: this.generateMockToken(demoUser.id),
    };

    // Store user state
    this.currentUser.set(authUser);
    this.isAuthenticated.set(true);

    // Persist to localStorage (only in browser)
    if (this.isBrowser) {
      localStorage.setItem('auth_user', JSON.stringify(authUser));
    }

    return { success: true };
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    if (this.isBrowser) {
      localStorage.removeItem('auth_user');
    }

    this.router.navigate(['/login']);
  }

  hasRole(role: UserRole | UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;

    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => user.roles.includes(r));
  }

  hasAccess(requiredRoles: UserRole[]): boolean {
    return requiredRoles.length === 0 || this.hasRole(requiredRoles);
  }

  getTenantId(): string | null {
    return this.currentUser()?.tenantId ?? null;
  }

  /**
 * Load user session from localStorage
 */
  private loadStoredSession(): void {
    if (!this.isBrowser) return;
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
      localStorage.removeItem('auth_user');
    }
  }

  /**
* Generate mock JWT token (for demo purposes)
*/
  private generateMockToken(userId: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      })
    );
    const signature = btoa('mock-signature');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Verify if token is valid
   */
  isTokenValid(): boolean {
    const user = this.currentUser();
    if (!user || !user.token) return false;

    try {
      const parts = user.token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  }
}

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authGuard = inject(AuthGuard);
  const router = inject(Router);
  console.log('authGuard', authGuard.isAuthenticated$());
  // Check if user is authenticated
  if (!authGuard.isAuthenticated$()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Check token validity
  if (!authGuard.isTokenValid()) {
    authGuard.logout();
    return false;
  }

  const requiredRoles = route.data['roles'] as UserRole[] | undefined;

  if (!authGuard.currentUser$()) {
    inject(Router).navigate(['/login']);
    return false;
  }

  if (requiredRoles && !authGuard.hasAccess(requiredRoles)) {
    inject(Router).navigate(['/unauthorized']);
    return false;
  }

  return true;
};

/**
 * Route guard for public routes (redirects if already authenticated)
 */
export const publicGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot
) => {
  const authGuard = inject(AuthGuard);
  const router = inject(Router);

  if (authGuard.isAuthenticated$()) {
    router.navigate(['/dashboard/view']);
    return false;
  }

  return true;
};
