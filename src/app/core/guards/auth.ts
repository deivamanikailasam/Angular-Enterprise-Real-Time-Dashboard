import { Injectable, PLATFORM_ID } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { signal, computed, inject } from '@angular/core';
import { AuthUser, DemoUser, UserRole } from '../../shared/models/dashboard.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private platformId = inject(PLATFORM_ID);

  private currentUser = signal<AuthUser | null>(null);
  private isAuthenticated = signal<boolean>(false);
  private isInitialized = signal<boolean>(false);

  /**
   * Check if we're in the browser environment
   * Check this fresh each time to handle SSR/hydration correctly
   */
  // private get isBrowser(): boolean {
  //   return isPlatformBrowser(this.platformId);
  // }

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
  readonly isInitialized$ = this.isInitialized.asReadonly();

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
    // Initialize session synchronously
    this.initialize();
  }

  /**
   * Initialize session from localStorage
   * Can be called multiple times safely (idempotent)
   * During SSR/hydration, we need to reload on client even if marked as initialized on server
   */
  initialize(): void {
    const isBrowser = isPlatformBrowser(this.platformId);
    const wasInitialized = this.isInitialized();
    const wasAuthenticated = this.isAuthenticated();
    
    console.log('[AuthGuard.initialize] Called:', {
      isBrowser,
      wasInitialized,
      wasAuthenticated,
      localStorageAvailable: typeof window !== 'undefined' && typeof localStorage !== 'undefined'
    });
    
    // Always try to load session if we're in the browser
    // This handles SSR/hydration where initialization happened on server (no localStorage)
    // but we need to load session from localStorage on the client
    // Check fresh each time to handle SSR/hydration correctly
    if (isBrowser) {
      // Always load session in browser, even if already initialized
      // This ensures we load from localStorage during hydration
      // The loadStoredSession method will check localStorage availability
      console.log('[AuthGuard.initialize] Loading stored session...');
      this.loadStoredSession();
      
      const afterLoad = this.isAuthenticated();
      console.log('[AuthGuard.initialize] After loadStoredSession:', {
        authenticated: afterLoad,
        hasUser: !!this.currentUser()
      });
      
      // During hydration, localStorage might not be immediately accessible
      // Try multiple times with a small delay if needed
      if (!afterLoad && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        console.log('[AuthGuard.initialize] Not authenticated, scheduling async retry...');
        // Give it a microtask to ensure localStorage is fully ready
        Promise.resolve().then(() => {
          if (!this.isAuthenticated()) {
            console.log('[AuthGuard.initialize] Async retry: Loading stored session again...');
            this.loadStoredSession();
            console.log('[AuthGuard.initialize] Async retry result:', {
              authenticated: this.isAuthenticated(),
              hasUser: !!this.currentUser()
            });
          }
        });
      }
    }
    
    // Mark as initialized AFTER attempting to load session
    // This ensures signals are set before any guards check them
    this.isInitialized.set(true);
    console.log('[AuthGuard.initialize] Initialization complete');
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
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
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

    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
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
 * Safe to call during SSR (will do nothing)
 */
  private loadStoredSession(): void {
    // Check fresh each time to handle SSR/hydration correctly
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[AuthGuard.loadStoredSession] Not in browser, skipping');
      return;
    }
    
    // Double-check localStorage is available (safety check for hydration)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('[AuthGuard.loadStoredSession] localStorage not available');
      return;
    }
    
    try {
      const stored = localStorage.getItem('auth_user');
      console.log('[AuthGuard.loadStoredSession] localStorage item:', stored ? 'EXISTS' : 'NOT FOUND');
      
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        console.log('[AuthGuard.loadStoredSession] Parsed user:', {
          hasId: !!user?.id,
          hasEmail: !!user?.email,
          hasRoles: !!user?.roles,
          rolesArray: Array.isArray(user?.roles),
          email: user?.email
        });
        
        // Validate user structure
        if (user && user.id && user.email && user.roles && Array.isArray(user.roles)) {
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          console.log('[AuthGuard.loadStoredSession] Session loaded successfully');
          
          // If token is expired, refresh it
          if (!this.isTokenValid()) {
            console.log('[AuthGuard.loadStoredSession] Token expired, refreshing...');
            this.refreshToken();
          }
        } else {
          // Invalid user data, clear it
          console.warn('[AuthGuard.loadStoredSession] Invalid user data in localStorage, clearing...');
          localStorage.removeItem('auth_user');
        }
      } else {
        console.log('[AuthGuard.loadStoredSession] No stored session found');
      }
    } catch (error) {
      console.error('[AuthGuard.loadStoredSession] Error loading stored session:', error);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_user');
      }
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
   * Refresh token for stored sessions
   */
  refreshToken(): void {
    const user = this.currentUser();
    if (user && isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      const newToken = this.generateMockToken(user.id);
      const updatedUser = { ...user, token: newToken };
      this.currentUser.set(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
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

/**
 * Route guard for protected routes (requires authentication)
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  console.log('[authGuard] ===== GUARD CALLED =====');
  console.log('[authGuard] Route path:', route.routeConfig?.path);
  console.log('[authGuard] Full URL:', state.url);
  console.log('[authGuard] Route data:', route.data);
  
  const authGuardService = inject(AuthGuard);
  const router = inject(Router);
  
  // CRITICAL: Check if we're in browser
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  
  if (!isBrowser) {
    console.log('[authGuard] Running on server - blocking route (no localStorage on server)');
    // On server, block the route to prevent SSR from rendering protected content
    // Return UrlTree for immediate redirect - this prevents flash
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  
  // CRITICAL: Check localStorage synchronously FIRST before any async operations
  // This prevents flash of content - if no auth_user exists, block immediately
  try {
    const hasStoredSession = localStorage.getItem('auth_user') !== null;
    console.log('[authGuard] Has stored session in localStorage:', hasStoredSession);
    
    if (!hasStoredSession) {
      // No stored session - redirect immediately using UrlTree to prevent flash
      console.log('[authGuard] No stored session - Redirecting immediately');
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    
    // Stored session exists - ensure initialization happens synchronously
    console.log('[authGuard] Stored session exists - initializing...');
    authGuardService.initialize();
    
    // CRITICAL: Check authentication state immediately after initialization
    // Don't wait - these are synchronous signal reads
    const isInitialized = authGuardService.isInitialized$();
    const isAuthenticated = authGuardService.isAuthenticated$();
    const user = authGuardService.currentUser$();
    
    console.log('[authGuard] State after initialize:', {
      isInitialized,
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email
    });
    
    // If not initialized yet, block (shouldn't happen after initialize() call)
    if (!isInitialized) {
      console.log('[authGuard] NOT INITIALIZED - Redirecting');
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    
    // CRITICAL: Check if user is authenticated - if not, redirect immediately
    // This must be synchronous to prevent flash
    if (!isAuthenticated || !user) {
      console.log('[authGuard] NOT AUTHENTICATED - Redirecting to /login');
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    // Check token validity - if expired, regenerate token for stored sessions
    if (!authGuardService.isTokenValid()) {
      console.log('[authGuard] Token invalid, refreshing...');
      authGuardService.refreshToken();
    }

    // Check role-based access
    const requiredRoles = route.data['roles'] as UserRole[] | undefined;
    if (requiredRoles && requiredRoles.length > 0 && !authGuardService.hasAccess(requiredRoles)) {
      console.log('[authGuard] Insufficient permissions - Redirecting to /unauthorized');
      return router.createUrlTree(['/unauthorized']);
    }

    console.log('[authGuard] Access GRANTED');
    return true;
  } catch (error) {
    console.error('[authGuard] Error checking authentication:', error);
    // If there's any error, redirect for security
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
};

/**
 * Route guard for public routes (redirects if already authenticated)
 */
export const publicGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  console.log('[publicGuard] ===== GUARD CALLED =====');
  console.log('[publicGuard] URL:', state.url);
  
  const authGuardService = inject(AuthGuard);
  const router = inject(Router);

  // CRITICAL: Check if we're in browser
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  
  if (!isBrowser) {
    console.log('[publicGuard] Running on server - allowing route (will be checked on client)');
    // On server, allow public routes to pass
    return true;
  }

  // CRITICAL: Check localStorage synchronously FIRST
  const hasStoredSession = localStorage.getItem('auth_user') !== null;
  console.log('[publicGuard] Has stored session:', hasStoredSession);
  
  // If no stored session, allow access to public route immediately
  if (!hasStoredSession) {
    console.log('[publicGuard] No stored session - Allowing public route');
    return true;
  }

  // Stored session exists - ensure initialization happens synchronously
  console.log('[publicGuard] Stored session exists - checking authentication...');
  authGuardService.initialize();

  // CRITICAL: Check authentication state immediately after initialization
  // These are synchronous signal reads - no waiting needed
  const isInitialized = authGuardService.isInitialized$();
  const isAuthenticated = authGuardService.isAuthenticated$();
  const user = authGuardService.currentUser$();
  
  console.log('[publicGuard] State:', {
    isInitialized,
    isAuthenticated,
    hasUser: !!user,
    userEmail: user?.email
  });
  
  // If not initialized yet, allow (will check on next navigation)
  if (!isInitialized) {
    console.log('[publicGuard] NOT INITIALIZED - Allowing (will check on next navigation)');
    return true;
  }

  // CRITICAL: If already authenticated, redirect immediately using UrlTree
  // This prevents any flash of the login page
  if (isAuthenticated && user) {
    // Check if there's a returnUrl in the query params
    const urlTree = router.parseUrl(state.url);
    const returnUrl = urlTree.queryParams['returnUrl'];
    const targetUrl = returnUrl || '/dashboard/view';
    console.log('[publicGuard] Already authenticated - Redirecting to:', targetUrl);
    // Use UrlTree for immediate redirect without flash
    return router.createUrlTree([targetUrl]);
  }

  console.log('[publicGuard] Access GRANTED (public route)');
  return true;
};
