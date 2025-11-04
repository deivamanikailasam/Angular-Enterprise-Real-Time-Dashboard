import { Injectable } from '@angular/core';
import { signal, effect } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private wsUrl = signal<string>('');
  private connected = signal<boolean>(false);
  private reconnectAttempts = signal<number>(0);
  private messageSubject = new Subject<any>();

  readonly messages$ = this.messageSubject.asObservable();
  readonly connected$ = this.connected.asReadonly();
  readonly reconnectAttempts$ = this.reconnectAttempts.asReadonly();

  private ws: WebSocket | null = null;

  constructor() {
    // Effect: Auto-reconnect on disconnect
    effect(() => {
      if (!this.connected()) {
        this.scheduleReconnect();
      }
    });
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsUrl.set(url);

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.connected.set(true);
          this.reconnectAttempts.set(0);
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.messageSubject.next(JSON.parse(event.data));
        };

        this.ws.onerror = (error: Event) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.connected.set(false);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data: any): void {
    if (this.ws && this.connected()) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.connected.set(false);
    }
  }

  private scheduleReconnect(): void {
    const maxAttempts = 5;
    const attempts = this.reconnectAttempts();

    if (attempts >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const backoffMs = Math.pow(2, attempts) * 1000;

    setTimeout(() => {
      console.log(`Attempting to reconnect (${attempts + 1}/${maxAttempts})...`);
      this.reconnectAttempts.update(current => current + 1);
      this.connect(this.wsUrl()).catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, backoffMs);
  }
}
