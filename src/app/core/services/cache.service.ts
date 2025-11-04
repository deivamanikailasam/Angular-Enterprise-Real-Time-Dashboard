import { Injectable } from '@angular/core';
import { signal, computed } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private cache = signal<Map<string, CacheEntry<any>>>(new Map());

  readonly cacheSize = computed(() => this.cache().size);

  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.update(current => {
      const newMap = new Map(current);
      newMap.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      });
      return newMap;
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache().get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.invalidate(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache().get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.invalidate(key);
      return false;
    }
    return true;
  }

  invalidate(key: string): void {
    this.cache.update(current => {
      const newMap = new Map(current);
      newMap.delete(key);
      return newMap;
    });
  }

  clear(): void {
    this.cache.set(new Map());
  }

  // Utility: Get all expired keys
  getExpiredKeys(): string[] {
    const now = Date.now();
    const expired: string[] = [];

    this.cache().forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expired.push(key);
      }
    });

    return expired;
  }
}