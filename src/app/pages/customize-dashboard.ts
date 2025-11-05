import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customize-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="text-2xl font-bold mb-4 text-white">Customize Dashboard</h2>
      <p class="text-slate-400">Drag-and-drop layout customization coming next...</p>
    </div>
  `,
})
export class CustomizeDashboardPage {}
