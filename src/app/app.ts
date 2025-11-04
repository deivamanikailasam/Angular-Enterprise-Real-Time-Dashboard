import { Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly titleService = inject(Title);
  protected readonly title = signal('Angular - Enterprise Real-Time Dashboard');

  constructor() {
    this.titleService.setTitle(this.title());
  }
}
