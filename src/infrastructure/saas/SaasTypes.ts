/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../../types';

/**
 * SaaS Tenancy & Hierarchical Org Structures
 */
export interface TenantConfig {
  tenantId: string;
  companyName: string;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: 'TRY' | 'USD' | 'EUR';
  language: 'tr' | 'en';
  timezone: string;
}

export interface SubscriptionInfo {
  tenantId: string;
  tier: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  priceAmount: number;
  maxVehicles: number;
  maxStudents: number;
  maxUsers: number;
  features: string[]; // e.g. ['advanced_routing', 'whatsapp_sync', 'geofence_alerts', 'custom_branding']
}

export interface SaaSUsageMetric {
  tenantId: string;
  activeVehiclesCount: number;
  activeStudentsCount: number;
  activeUsersCount: number;
  whatsappMessagesSent: number;
  apiRequestsCount: number;
  dataStorageBytes: number;
}

/**
 * Audit Trail & Security Ledger for Enterprise Tenants
 */
export interface SaasAuditEvent {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. 'user_create', 'vehicle_assign', 'route_start', 'payment_record'
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  oldPayload?: string;
  newPayload?: string;
}

/**
 * Business & Operational Intelligence Events (Domain Event Taxonomy)
 */
export interface OperationalEvent {
  id: string;
  tenantId: string;
  eventType: 
    | 'route_start' 
    | 'route_complete' 
    | 'stop_visit_success' 
    | 'stop_visit_delay' 
    | 'student_boarded' 
    | 'student_no_show' 
    | 'geofence_breach' 
    | 'speed_violation' 
    | 'gps_loss' 
    | 'driver_rating_received';
  userId: string;
  vehicleId?: string;
  routeId?: string;
  studentId?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

/**
 * High-Value SaaS Key Performance Indicators (KPIs)
 */
export interface FleetMetrics {
  onTimeArrivalRate: number; // percentage
  avgDelayMinutes: number;
  routeDeviationRate: number; // percentage of journeys with deviation
  totalFuelConsumedLiters: number;
  carbonEmissionKg: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  totalDistanceKm: number;
  idleTimeMinutes: number; // engine on but stationary
}

export interface StudentBoardingMetrics {
  totalBoardings: number;
  noShowRate: number; // percentage
  avgBoardingTimeSeconds: number;
  parentSatisfactionScore: number; // 1-5 scale
}

export interface FinancialPerformance {
  expectedRevenue: number;
  collectedRevenue: number;
  collectionRate: number; // percentage
  supplierPayouts: number;
  netMargin: number;
  overduePaymentCount: number;
}
