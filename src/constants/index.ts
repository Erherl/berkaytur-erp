/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Global application constants.
 * Separates magic numbers, configuration states, and business-domain metadata.
 */

export const APP_INFO = {
  NAME: 'Berkaytur Servis Taşımacılık A.Ş.',
  TAX_NO: 'BKT-TAX-9876543210',
  TAX_OFFICE: 'Çankaya Vergi Dairesi',
  ADDRESS: 'Çankaya Cad. No: 120/A, Ankara',
  PHONE: '0555 111 22 33',
  EMAIL: 'info@berkaytur.com',
};

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  COORDINATOR: 'coordinator',
  ACCOUNTING: 'accounting',
  PARENT: 'parent',
  DRIVER: 'driver',
  HOSTESS: 'hostess',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Sistem Yöneticisi (Admin)',
  manager: 'Proje Müdürü',
  coordinator: 'Okul Sorumlusu',
  accounting: 'Muhasebe Sorumlusu',
  parent: 'Veli',
  driver: 'Servis Sürücüsü (Kaptan)',
  hostess: 'Rehber Personel (Hostes)',
};

export const ACADEMIC_YEARS = {
  DEFAULT_OPTIONS: ['2025-2026', '2026-2027', '2027-2028'],
  ACTIVE_DEFAULT: '2026-2027',
};

export const MAP_CONFIG = {
  TURKEY_LAT: 39.902000,
  TURKEY_LNG: 32.858000,
  ISTANBUL_LAT: 41.025000,
  ISTANBUL_LNG: 29.155000,
  DEFAULT_ZOOM: 12,
  CLOSE_STOP_THRESHOLD_METERS: 100,
};

export const ROUTE_STATUS = {
  IDLE: 'idle',
  MORNING_ACTIVE: 'morning_active',
  EVENING_ACTIVE: 'evening_active',
  COMPLETED: 'completed',
} as const;

export const STUDENT_STATUS = {
  PENDING: 'pending',
  ON_BUS: 'on_bus',
  AT_SCHOOL: 'at_school',
  AT_HOME: 'at_home',
  ABSENT: 'absent',
} as const;

export const PAYMENT_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  REFUNDED: 'refunded',
} as const;
