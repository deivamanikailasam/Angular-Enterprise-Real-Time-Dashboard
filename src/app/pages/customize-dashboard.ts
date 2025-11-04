import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customize-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold mb-4">Customize Dashboard</h2>
      <p class="text-gray-600">Drag-and-drop layout customization coming next...</p>
    </div>
  `,
})
export class CustomizeDashboardPage {}
