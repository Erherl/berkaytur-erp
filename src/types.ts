/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'parent' | 'driver' | 'hostess' | 'accounting' | 'operation';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  username: string;
  password?: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  schoolId?: string; // For backward compatibility
  vehicleId?: string; // For driver or hostess
  assignedSchools?: string[]; // Multi-assignment for schools
  assignedAreas?: string[]; // Multi-assignment for working areas (e.g. Avrupa Yakası, Tuzla, etc.)
  assignedVehicles?: string[]; // Multi-assignment for vehicles
  assignedDrivers?: string[]; // Multi-assignment for drivers
  assignedHostesses?: string[]; // Multi-assignment for hostesses
  mustChangePassword?: boolean;
  tcNo?: string;
  monthlySalary?: number; // Optional salary info
  dailyWage?: number; // Optional daily wage info
  bonus?: number; // Optional bonus info
  licenseClass?: string;
  src?: string;
  psychotechnic?: string;
  criminalRecord?: string;
  healthReport?: string;
  address?: string;
  iban?: string;
  notes?: string;
  documents?: string[];
  photo?: string;
  supplierId?: string;
  birthDate?: string;
  idCard?: string;
  tc?: string;
  isCompany?: boolean;
}

export interface SchoolKmRate {
  id?: string;
  schoolId?: string;
  minKm: number;
  maxKm: number;
  monthlyFee: number;
  annualFee?: number;
}

export interface SchoolRegionRate {
  id?: string;
  schoolId?: string;
  regionName: string;
  monthlyFee: number;
  annualFee?: number;
  description?: string;
}

export interface StudentInstallment {
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  description?: string;
}

export interface Student {
  id: string;
  name: string;
  studentNumber: string;
  classLevel: string;
  schoolId: string;
  schoolName: string;
  schoolType?: 'devlet' | 'kolej';
  regionName?: string;
  distanceKm?: number;
  assignedFee?: number;
  monthlyFee?: number;
  installmentCount?: number;
  paymentPlan?: StudentInstallment[] | string;
  parentName: string;
  parentPhone: string;
  routeId?: string;
  routeName?: string;
  morningStatus: 'pending' | 'on_bus' | 'at_school' | 'absent';
  eveningStatus: 'pending' | 'on_bus' | 'at_home' | 'absent';
  registrationStatus?: 'Potansiyel' | 'Sözleşme Bekliyor' | 'İmzalandı' | 'Aktif' | 'Pasif' | 'Ayrıldı' | 'Mezun';
  latitude?: number;
  longitude?: number;
  tags?: string[];
  academicYear?: string;
  isDeleted?: boolean;
}

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  academicYear?: string;
  type?: 'devlet' | 'kolej' | 'state' | 'private' | 'college';
  kmRates?: SchoolKmRate[];
  regionRates?: SchoolRegionRate[];
  city?: string;
  district?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  authorizedPerson?: string;
  assignedCoordinators?: string[]; // IDs of assigned Okul Sorumluları (UserRole = 'coordinator')
  assignedManagers?: string[]; // IDs of assigned Proje Müdürleri (UserRole = 'manager')
  isDeleted?: boolean;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  capacity: number;
  driverId?: string;
  hostessId?: string;
  status: 'active' | 'service' | 'inactive';
  academicYear?: string;
  seating?: Record<string, string>;
  isDeleted?: boolean;
  
  // Custom vehicle fields
  vehicleType?: 'company' | 'supplier';
  modelYear?: string;
  licence?: string;
  inspectionDate?: string;
  insuranceDate?: string;
  exhaustDate?: string;
  photo?: string;
  notes?: string;
  schoolId?: string;
  supplierId?: string;
  fuelType?: string;
  vehiclePhone?: string;
  gps?: boolean;
  airCond?: boolean;
  camera?: boolean;
  firstAid?: boolean;
  compInsuranceDate?: string;
  fireExtinguisherDate?: string;
  maintenanceDate?: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  authorized: string;
  phone: string;
  address: string;
  taxOffice: string;
  taxNo: string;
  iban: string;
  email: string;
  plate: string;
  vehicleType: 'company' | 'supplier';
  capacity: number;
  driverInfo: string;
  hostessInfo: string;
  pricingType: 'hostess_included' | 'hostess_excluded';
  monthlyPrice: number;
  assignedHostessId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRoles: (UserRole | 'all')[];
  createdAt: string;
  authorName: string;
  channels: ('notification' | 'whatsapp' | 'pdf')[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'school' | 'holiday' | 'event' | 'maintenance' | 'insurance' | 'payment' | 'payout' | 'other';
  description: string;
  color: string;
}

export interface FavoritePage {
  id: string;
  userId: string;
  title: string;
  path: string;
  iconName: string;
}

export interface BusRoute {
  id: string;
  name: string;
  schoolId: string;
  driverId: string;
  hostessId: string;
  vehicleId: string;
  status: 'idle' | 'morning_active' | 'evening_active' | 'completed';
  currentLat?: number;
  currentLng?: number;
  stops: RouteStop[];
}

export interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  estimatedTime: string;
  type: 'school' | 'student';
  studentId?: string;
  status: 'pending' | 'visited' | 'skipped';
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  category: 'Tahsilat' | 'Hakediş' | 'Muhasebe';
  description?: string;
}

export interface DocumentArchive {
  id: string;
  name: string;
  category: 
    | 'Öğrenci'
    | 'Veli'
    | 'Araç'
    | 'Şoför'
    | 'Hostes'
    | 'Muhasebe'
    | 'Hakediş'
    | 'Tahsilat'
    | 'Sözleşmeler'
    | 'Dekontlar'
    | 'Etkinlikler'
    | 'Denetimler'
    | 'Raporlar';
  fileUrl: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  device?: string;
  oldValue?: string;
  newValue?: string;
}

export interface SystemSettings {
  companyName?: string;
  systemTitle?: string;
  googleSheetsUrl: string;
  googleDriveFolderId: string;
  whatsappGreetingTemplate: string;
  whatsappDelayTemplate: string;
  whatsappSosTemplate: string;
  whatsappDriverTemplate?: string;
  whatsappHostessTemplate?: string;
  whatsappSupplierTemplate?: string;
  lastBackupTime: string;
  autoBackupIntervalHours: number;
  audioWelcomeEnabled?: boolean;
}
