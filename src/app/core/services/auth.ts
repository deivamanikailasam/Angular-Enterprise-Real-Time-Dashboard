import { Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { signal, computed, inject } from '@angular/core';
import { AuthUser, DemoUser, UserRole } from '../../shared/models/dashboard.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);

  private currentUser = signal<AuthUser | null>(null);
  private isAuthenticated = signal<boolean>(false);
  private isInitialized = signal<boolean>(false);

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
    
    console.log('[AuthService.initialize] Called:', {
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
      console.log('[AuthService.initialize] Loading stored session...');
      this.loadStoredSession();
      
      const afterLoad = this.isAuthenticated();
      console.log('[AuthService.initialize] After loadStoredSession:', {
        authenticated: afterLoad,
        hasUser: !!this.currentUser()
      });
      
      // During hydration, localStorage might not be immediately accessible
      // Try multiple times with a small delay if needed
      if (!afterLoad && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        console.log('[AuthService.initialize] Not authenticated, scheduling async retry...');
        // Give it a microtask to ensure localStorage is fully ready
        Promise.resolve().then(() => {
          if (!this.isAuthenticated()) {
            console.log('[AuthService.initialize] Async retry: Loading stored session again...');
            this.loadStoredSession();
            console.log('[AuthService.initialize] Async retry result:', {
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
    console.log('[AuthService.initialize] Initialization complete');
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
      console.log('[AuthService.loadStoredSession] Not in browser, skipping');
      return;
    }
    
    // Double-check localStorage is available (safety check for hydration)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('[AuthService.loadStoredSession] localStorage not available');
      return;
    }
    
    try {
      const stored = localStorage.getItem('auth_user');
      console.log('[AuthService.loadStoredSession] localStorage item:', stored ? 'EXISTS' : 'NOT FOUND');
      
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        console.log('[AuthService.loadStoredSession] Parsed user:', {
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
          console.log('[AuthService.loadStoredSession] Session loaded successfully');
          
          // If token is expired, refresh it
          if (!this.isTokenValid()) {
            console.log('[AuthService.loadStoredSession] Token expired, refreshing...');
            this.refreshToken();
          }
        } else {
          // Invalid user data, clear it
          console.warn('[AuthService.loadStoredSession] Invalid user data in localStorage, clearing...');
          localStorage.removeItem('auth_user');
        }
      } else {
        console.log('[AuthService.loadStoredSession] No stored session found');
      }
    } catch (error) {
      console.error('[AuthService.loadStoredSession] Error loading stored session:', error);
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

