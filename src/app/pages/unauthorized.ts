import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-600 to-red-900">
      <div class="text-center">
        <mat-icon class="text-9xl text-red-200 mb-6">lock</mat-icon>
        <h1 class="text-4xl font-bold text-white mb-4">Access Denied</h1>
        <p class="text-red-100 text-lg mb-8">
          You don't have permission to access this page.
        </p>
        <button
          routerLink="/dashboard/view"
          class="px-8 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition"
        >
          <mat-icon class="inline mr-2">home</mat-icon>
          Go to Dashboard
        </button>
      </div>
    </div>
  `,
})
export class UnauthorizedPage {}
