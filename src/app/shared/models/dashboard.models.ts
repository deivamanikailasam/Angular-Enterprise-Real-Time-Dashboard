export interface MetricDataPoint {
    timestamp: number;
    value: number;
    unit: string;
  }
  
  export interface DashboardMetric {
    id: string;
    name: string;
    description: string;
    dataPoints: MetricDataPoint[];
    currentValue: number;
    trend: 'up' | 'down' | 'stable';
    threshold?: { warning: number; critical: number };
  }
  
  export interface DashboardLayout {
    userId: string;
    tenantId: string;
    widgets: WidgetConfig[];
    lastModified: number;
  }
  
  export interface WidgetConfig {
    id: string;
    metricId: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    refreshInterval: number;
  }
  
  export interface User {
    id: string;
    email: string;
    roles: UserRole[];
    tenantId: string;
  }
  
  export type UserRole = 'admin' | 'tenant-user' | 'viewer';
  
  export interface TenantConfig {
    id: string;
    name: string;
    dataRetention: number; // days
    maxUsers: number;
  }
  
  export interface AuthUser {
    id: string;
    email: string;
    roles: UserRole[];
    tenantId: string;
    token?: string;
  }
  
  export interface DemoUser {
    email: string;
    password: string;
    id: string;
    roles: UserRole[];
    tenantId: string;
  }