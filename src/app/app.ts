import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthGuard } from './core/guards/auth';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, MatProgressSpinnerModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly titleService = inject(Title);
  private readonly authGuard = inject(AuthGuard);
  private readonly router = inject(Router);
  protected readonly title = signal('Angular - Enterprise Real-Time Dashboard');
  protected readonly isInitializing = this.authGuard.isInitialized$;
  protected readonly isNavigating = signal(false);

  constructor() {
    this.titleService.setTitle(this.title());
    
    // Pre-initialize AuthGuard immediately to speed up guard checks
    // This ensures authentication state is ready before any navigation
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.authGuard.initialize();
    }
    
    // Track navigation events to show loading during route transitions
    // Set loading state immediately on NavigationStart to prevent any flash
    this.router.events
      .pipe(
        filter(
          event =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError
        )
      )
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          // CRITICAL: Set navigating state immediately to prevent flash
          this.isNavigating.set(true);
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          // Small delay to ensure smooth transition and guard completion
          setTimeout(() => {
            this.isNavigating.set(false);
          }, 100);
        }
      });
  }
}
