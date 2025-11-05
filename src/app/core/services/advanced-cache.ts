import { Injectable } from '@angular/core';
import { signal, computed } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessTime: number;
  tags: string[];
}

interface CacheStats {
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdvancedCacheService {
  private readonly maxCacheSize = 100; // Max entries
  private readonly cleanupInterval = 60000; // 1 minute

  private cache = signal<Map<string, CacheEntry<any>>>(new Map());
  private stats = signal<{
    hits: number;
    misses: number;
    evictions: number;
  }>({ hits: 0, misses: 0, evictions: 0 });

  readonly cacheSize = computed(() => this.cache().size);
  readonly cacheStats = computed(() => {
    const s = this.stats();
    const total = s.hits + s.misses;
    return {
      totalSize: this.cache().size,
      hitRate: total > 0 ? (s.hits / total) * 100 : 0,
      missRate: total > 0 ? (s.misses / total) * 100 : 0,
      evictionCount: s.evictions,
    };
  });

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
      this.evictLRUIfNeeded();
    }, this.cleanupInterval);
  }

  set<T>(
    key: string,
    data: T,
    ttlMs: number = 60000,
    tags: string[] = []
  ): void {
    if (this.cache().size >= this.maxCacheSize) {
      this.evictLRUIfNeeded();
    }

    this.cache.update(current => {
      const updated = new Map(current);
      updated.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
        accessCount: 0,
        lastAccessTime: Date.now(),
        tags,
      });
      return updated;
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache().get(key);
    if (!entry) {
      this.updateStats('miss');
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.invalidate(key);
      this.updateStats('miss');
      return null;
    }

    // Update access stats
    this.cache.update(current => {
      const updated = new Map(current);
      const cached = updated.get(key);
      if (cached) {
        cached.accessCount++;
        cached.lastAccessTime = Date.now();
      }
      return updated;
    });

    this.updateStats('hit');
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
      const updated = new Map(current);
      updated.delete(key);
      return updated;
    });
  }

  invalidateByTag(tag: string): void {
    const keysToInvalidate: string[] = [];

    this.cache().forEach((entry, key) => {
      if (entry.tags.includes(tag)) {
        keysToInvalidate.push(key);
      }
    });

    keysToInvalidate.forEach(key => this.invalidate(key));
  }

  clear(): void {
    this.cache.set(new Map());
    this.stats.set({ hits: 0, misses: 0, evictions: 0 });
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache().forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.invalidate(key));
  }

  private evictLRUIfNeeded(): void {
    if (this.cache().size < this.maxCacheSize) return;

    let lruKey: string | null = null;
    let lruTime = Date.now();

    this.cache().forEach((entry, key) => {
      if (entry.lastAccessTime < lruTime) {
        lruTime = entry.lastAccessTime;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.invalidate(lruKey);
      this.stats.update(s => ({
        ...s,
        evictions: s.evictions + 1,
      }));
    }
  }

  private updateStats(type: 'hit' | 'miss'): void {
    this.stats.update(current => ({
      ...current,
      [type === 'hit' ? 'hits' : 'misses']: current[type === 'hit' ? 'hits' : 'misses'] + 1,
    }));
  }

  getStats(): CacheStats {
    return this.cacheStats();
  }
}
