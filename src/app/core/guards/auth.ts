import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { inject } from '@angular/core';
import { UserRole } from '../../shared/models/dashboard.model';
import { AuthService } from '../services/auth';

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
  
  const authService = inject(AuthService);
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
    authService.initialize();
    
    // CRITICAL: Check authentication state immediately after initialization
    // Don't wait - these are synchronous signal reads
    const isInitialized = authService.isInitialized$();
    const isAuthenticated = authService.isAuthenticated$();
    const user = authService.currentUser$();
    
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
    if (!authService.isTokenValid()) {
      console.log('[authGuard] Token invalid, refreshing...');
      authService.refreshToken();
    }

    // Check role-based access
    const requiredRoles = route.data['roles'] as UserRole[] | undefined;
    if (requiredRoles && requiredRoles.length > 0 && !authService.hasAccess(requiredRoles)) {
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
  
  const authService = inject(AuthService);
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
  authService.initialize();

  // CRITICAL: Check authentication state immediately after initialization
  // These are synchronous signal reads - no waiting needed
  const isInitialized = authService.isInitialized$();
  const isAuthenticated = authService.isAuthenticated$();
  const user = authService.currentUser$();
  
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
