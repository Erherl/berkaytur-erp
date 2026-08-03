/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { 
  User, Student, School, Vehicle, BusRoute, Payment, 
  DocumentArchive, ActivityLog, SystemSettings, UserRole,
  Announcement, CalendarEvent, FavoritePage, Supplier
} from './types';
import { APP_CONFIG } from './config/appConfig';
import { storage } from './infrastructure/storage/StorageAdapter';
import { ApiClient } from './infrastructure/api/apiClient';
import { AuditService } from './services/AuditService';

// Standardized Scope Filtering Engine
export function filterDataByScope(currentUser: User | null, raw: {
  users: User[];
  students: Student[];
  schools: School[];
  vehicles: Vehicle[];
  routes: BusRoute[];
  payments: Payment[];
  documents: DocumentArchive[];
  logs: ActivityLog[];
  suppliers: Supplier[];
  announcements: Announcement[];
  calendarEvents: CalendarEvent[];
}) {
  if (!currentUser) {
    return {
      users: [], students: [], schools: [], vehicles: [], routes: [],
      payments: [], documents: [], logs: [], suppliers: [], announcements: [], calendarEvents: []
    };
  }

  const role = currentUser.role;

  // 1. Admin sees everything
  if (role === 'admin') {
    return { ...raw };
  }

  // Helper to check if a school matches the user's assigned schools or areas
  const isSchoolAllowed = (schoolId?: string, schoolName?: string, schoolObj?: School) => {
    if (!schoolId && !schoolName && !schoolObj) return false;
    
    // Resolve schoolObj if not provided
    const school = schoolObj || raw.schools.find(s => s.id === schoolId || s.name === schoolName);
    if (!school) {
      // Fallback: check if schoolId is explicitly assigned to user
      if (schoolId && currentUser.assignedSchools?.includes(schoolId)) return true;
      return false;
    }

    // Okul Sorumlusu (coordinator) check
    if (role === 'coordinator') {
      const allowed = 
        currentUser.schoolId === school.id ||
        currentUser.assignedSchools?.includes(school.id) ||
        school.assignedCoordinators?.includes(currentUser.id);
      return !!allowed;
    }

    // Proje Müdürü (manager) check
    if (role === 'manager') {
      const isAssignedSchool = 
        currentUser.assignedSchools?.includes(school.id) ||
        school.assignedManagers?.includes(currentUser.id);
      
      const isAssignedArea = currentUser.assignedAreas?.some(area => {
        const cleanArea = area.toLowerCase().trim();
        return (
          school.district?.toLowerCase().includes(cleanArea) ||
          school.city?.toLowerCase().includes(cleanArea) ||
          school.neighborhood?.toLowerCase().includes(cleanArea) ||
          school.name?.toLowerCase().includes(cleanArea)
        );
      });

      return !!(isAssignedSchool || isAssignedArea);
    }

    // Muhasebe (accounting) check
    if (role === 'accounting') {
      const allowed = 
        currentUser.assignedSchools?.includes(school.id) ||
        (school as any).assignedAccounting?.includes(currentUser.id) ||
        school.assignedCoordinators?.includes(currentUser.id); // fallback
      return !!allowed;
    }

    // Operasyon Personeli (operation) check
    if (role === 'operation') {
      const allowed = 
        currentUser.assignedSchools?.includes(school.id) ||
        currentUser.assignedAreas?.some(area => {
          const cleanArea = area.toLowerCase().trim();
          return (
            school.district?.toLowerCase().includes(cleanArea) ||
            school.city?.toLowerCase().includes(cleanArea) ||
            school.name?.toLowerCase().includes(cleanArea)
          );
        });
      return !!allowed;
    }

    return true; // Default for other roles
  };

  // Determine allowed school IDs
  const allowedSchoolIds = new Set<string>();
  raw.schools.forEach(s => {
    if (isSchoolAllowed(s.id, s.name, s)) {
      allowedSchoolIds.add(s.id);
    }
  });

  // Filter Schools
  const filteredSchools = raw.schools.filter(s => allowedSchoolIds.has(s.id));

  // Filter Students
  const filteredStudents = raw.students.filter(st => {
    if (role === 'parent') {
      return st.parentPhone === currentUser.phone || st.id === (currentUser as any).studentId;
    }
    return allowedSchoolIds.has(st.schoolId || '');
  });

  const allowedStudentIds = new Set(filteredStudents.map(st => st.id));

  // Filter Routes
  const filteredRoutes = raw.routes.filter(r => {
    if (role === 'driver' || role === 'hostess') {
      return r.driverId === currentUser.id || r.hostessId === currentUser.id || currentUser.vehicleId === r.vehicleId;
    }
    return allowedSchoolIds.has(r.schoolId || '');
  });

  const allowedRouteIds = new Set(filteredRoutes.map(r => r.id));

  // Filter Vehicles
  const filteredVehicles = raw.vehicles.filter(v => {
    if (role === 'driver' || role === 'hostess') {
      return v.driverId === currentUser.id || v.hostessId === currentUser.id || v.id === currentUser.vehicleId;
    }
    // Check if vehicle is assigned to an allowed school or route
    const isAssignedToAllowedSchool = v.schoolId ? allowedSchoolIds.has(v.schoolId) : false;
    const isAssignedToAllowedRoute = raw.routes.some(r => r.vehicleId === v.id && allowedSchoolIds.has(r.schoolId || ''));
    
    return isAssignedToAllowedSchool || isAssignedToAllowedRoute || !v.schoolId; 
  });

  const allowedVehicleIds = new Set(filteredVehicles.map(v => v.id));

  // Filter Users
  const filteredUsers = raw.users.filter(u => {
    if (u.id === currentUser.id) return true; // always see oneself
    
    if (role === 'coordinator' || role === 'manager' || role === 'accounting' || role === 'operation') {
      if (u.role === 'driver' || u.role === 'hostess') {
        const isDriverOrHostessOnAllowedVehicle = u.vehicleId ? allowedVehicleIds.has(u.vehicleId) : false;
        const isDriverOrHostessOnAllowedRoute = raw.routes.some(r => (r.driverId === u.id || r.hostessId === u.id) && allowedSchoolIds.has(r.schoolId || ''));
        return isDriverOrHostessOnAllowedVehicle || isDriverOrHostessOnAllowedRoute || !u.vehicleId;
      }
      if (u.role === 'coordinator' || u.role === 'accounting' || u.role === 'operation' || u.role === 'manager') {
        return u.assignedSchools?.some(sId => allowedSchoolIds.has(sId)) || u.schoolId ? allowedSchoolIds.has(u.schoolId!) : false;
      }
      return false; 
    }
    
    if (role === 'driver' || role === 'hostess') {
      return u.role === 'manager' || u.role === 'coordinator';
    }

    return false;
  });

  // Filter Payments
  const filteredPayments = raw.payments.filter(p => {
    if (role === 'parent') {
      return p.studentName && filteredStudents.some(s => s.name === p.studentName);
    }
    if (p.studentId) {
      return allowedStudentIds.has(p.studentId);
    }
    if (p.studentName) {
      const student = raw.students.find(s => s.name === p.studentName);
      return student ? allowedSchoolIds.has(student.schoolId || '') : false;
    }
    return false;
  });

  // Filter Documents
  const filteredDocuments = raw.documents.filter(d => {
    if (role === 'driver' || role === 'hostess') {
      return d.uploadedBy === currentUser.name;
    }
    const cleanDocName = d.name.toLowerCase();
    const isRelatedToAllowedVehicle = filteredVehicles.some(v => cleanDocName.includes(v.plate.toLowerCase().replace(/\s+/g, '')));
    const isRelatedToAllowedSchool = filteredSchools.some(s => cleanDocName.includes(s.name.toLowerCase()));
    
    return isRelatedToAllowedVehicle || isRelatedToAllowedSchool || d.uploadedBy === currentUser.name;
  });

  // Filter Suppliers
  const filteredSuppliers = raw.suppliers.filter(sup => {
    const hasAllowedVehicle = raw.vehicles.some(v => v.plate === sup.plate && allowedVehicleIds.has(v.id));
    return hasAllowedVehicle || !sup.plate; 
  });

  // Filter Logs
  const filteredLogs = raw.logs.filter(l => {
    if (role === 'coordinator' || role === 'manager' || role === 'accounting') {
      return l.userId === currentUser.id || filteredUsers.some(u => u.id === l.userId);
    }
    return l.userId === currentUser.id;
  });

  // Filter Announcements
  const filteredAnnouncements = raw.announcements.filter(ann => {
    return ann.targetRoles.includes('all') || ann.targetRoles.includes(role);
  });

  return {
    users: filteredUsers,
    students: filteredStudents,
    schools: filteredSchools,
    vehicles: filteredVehicles,
    routes: filteredRoutes,
    payments: filteredPayments,
    documents: filteredDocuments,
    logs: filteredLogs,
    suppliers: filteredSuppliers,
    announcements: filteredAnnouncements,
    calendarEvents: raw.calendarEvents
  };
}

// Store setter wrapper helper
const updateStateAndFilter = (set: any, get: any, rawChanges: Partial<AppState>) => {
  set(rawChanges);
  
  const state = get();
  const currentUser = state.currentUser;
  
  const raw = {
    users: state.rawUsers || [],
    students: state.rawStudents || [],
    schools: state.rawSchools || [],
    vehicles: state.rawVehicles || [],
    routes: state.rawRoutes || [],
    payments: state.rawPayments || [],
    documents: state.rawDocuments || [],
    logs: state.rawLogs || [],
    suppliers: state.rawSuppliers || [],
    announcements: state.rawAnnouncements || [],
    calendarEvents: state.rawCalendarEvents || []
  };

  const filtered = filterDataByScope(currentUser, raw);
  
  set({
    users: filtered.users,
    students: filtered.students,
    schools: filtered.schools,
    vehicles: filtered.vehicles,
    routes: filtered.routes,
    payments: filtered.payments,
    documents: filtered.documents,
    logs: filtered.logs,
    suppliers: filtered.suppliers,
    announcements: filtered.announcements,
    calendarEvents: filtered.calendarEvents
  });
};

interface AppState {
  // Filtered lists shown on UI
  users: User[];
  students: Student[];
  schools: School[];
  vehicles: Vehicle[];
  routes: BusRoute[];
  payments: Payment[];
  documents: DocumentArchive[];
  logs: ActivityLog[];
  settings: SystemSettings;
  suppliers: Supplier[];
  announcements: Announcement[];
  calendarEvents: CalendarEvent[];
  favorites: FavoritePage[];
  academicYears: string[];
  activeAcademicYear: string;
  activeSchoolId: string;
  currentUser: User | null;
  activeStudentForParent: Student | null;

  // Unfiltered raw master databases
  rawUsers: User[];
  rawStudents: Student[];
  rawSchools: School[];
  rawVehicles: Vehicle[];
  rawRoutes: BusRoute[];
  rawPayments: Payment[];
  rawDocuments: DocumentArchive[];
  rawLogs: ActivityLog[];
  rawSuppliers: Supplier[];
  rawAnnouncements: Announcement[];
  rawCalendarEvents: CalendarEvent[];

  // Actions
  login: (role: UserRole, username?: string, password?: string, studentName?: string, parentPhone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addStudent: (student: Omit<Student, 'id' | 'morningStatus' | 'eveningStatus'>) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  updateAttendance: (id: string, type: 'morning' | 'evening', status: Student['morningStatus'] | Student['eveningStatus']) => void;
  addSchool: (school: Omit<School, 'id'>) => void;
  updateSchool: (id: string, school: Partial<School>) => void;
  deleteSchool: (id: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'> & { id?: string }) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addRoute: (route: Omit<BusRoute, 'id' | 'status'>) => void;
  updateRoute: (id: string, route: Partial<BusRoute>) => void;
  deleteRoute: (id: string) => void;
  startRoute: (id: string, type: 'morning' | 'evening') => void;
  stopRoute: (id: string) => void;
  updateRouteLocation: (id: string, lat: number, lng: number) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'status'>) => void;
  recordPayment: (id: string, amount: number) => void;
  addDocument: (doc: Omit<DocumentArchive, 'id' | 'uploadDate'>) => void;
  deleteDocument: (id: string) => void;
  addAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt'>) => void;
  deleteAnnouncement: (id: string) => void;
  addCalendarEvent: (evt: Omit<CalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (id: string) => void;
  toggleFavorite: (userId: string, title: string, path: string, iconName: string) => void;
  setActiveAcademicYear: (year: string) => void;
  setActiveSchoolId: (id: string) => void;
  archiveAndCloneToNewYear: (sourceYear: string, targetYear: string) => void;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  syncWithGoogleSheets: () => Promise<boolean>;
  fetchSystemData: () => Promise<void>;
  addLog: (action: string, details: string, oldValue?: string, newValue?: string) => void;
  checkDocumentExpiries: () => void;
  clearDatabase: () => void;
}

// System initial master accounts
const DEFAULT_USERS: User[] = [];

const DEFAULT_VEHICLES: Vehicle[] = [];

const DEFAULT_STUDENTS: Student[] = [];

const DEFAULT_ROUTES: BusRoute[] = [];

const DEFAULT_PAYMENTS: Payment[] = [];

const DEFAULT_DOCUMENTS: DocumentArchive[] = [];

const DEFAULT_SETTINGS: SystemSettings = {
  googleSheetsUrl: '',
  googleDriveFolderId: '',
  whatsappGreetingTemplate: 'Sayın *{veli_adi}*, öğrencimiz *{ogrenci_adi}* servis aracına biniş yapmıştır. İyi günler dileriz. - Berkaytur',
  whatsappDelayTemplate: 'Sayın *{veli_adi}*, servis aracımız güzergahtaki yoğunluktan dolayı yaklaşık *{dakika} dakika* rötarlıdır. Anlayışınız için teşekkür ederiz. - Berkaytur',
  whatsappSosTemplate: 'DİKKAT: *{plaka}* plakalı servisimiz *{konum}* mevkisinde acil durum bildirdi. Sürücü: *{sofor_adi}*.',
  whatsappDriverTemplate: 'Sayın Kaptan *{sofor_adi}*, *{tarih}* tarihindeki servis göreviniz: *{plaka}* plakalı araç ile *{guzergah}* rotasıdır. Lütfen zamanında hareket ediniz. Kazasız sürüşler dileriz. - Berkaytur',
  whatsappHostessTemplate: 'Sayın Rehber *{hostes_adi}*, *{tarih}* tarihindeki görev planınız: *{plaka}* plakalı araç ile *{guzergah}* rotasındaki öğrencilerin refakatidir. İyi çalışmalar dileriz. - Berkaytur',
  whatsappSupplierTemplate: 'Sayın Tedarikçimiz *{firma_adi}*, *{donem}* dönemine ait hakediş özetiniz hazırlanmıştır. Plaka: *{plaka}*, Net Hakediş: *{net_tutar}*. Detayları ekteki PDF dosyasından veya web panelimizden inceleyebilirsiniz. - Berkaytur',
  lastBackupTime: '',
  autoBackupIntervalHours: 24,
  audioWelcomeEnabled: true
};

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [];

const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [];

const DEFAULT_SUPPLIERS: Supplier[] = [];

const setLocalStorage = (key: string, value: any) => {
  storage.setItem(key, value);
};

export const useAppStore = create<AppState>((set, get) => {
  const initialRawUsers = storage.getItem('bkt_users', DEFAULT_USERS);
  const initialRawStudents = storage.getItem('bkt_students', DEFAULT_STUDENTS);
  const initialRawSchools: School[] = storage.getItem('bkt_schools', []);
  const initialRawVehicles = storage.getItem('bkt_vehicles', DEFAULT_VEHICLES);
  const initialRawRoutes = storage.getItem('bkt_routes', DEFAULT_ROUTES);
  const initialRawPayments = storage.getItem('bkt_payments', DEFAULT_PAYMENTS);
  const initialRawDocuments = storage.getItem('bkt_documents', DEFAULT_DOCUMENTS);
  const initialRawAnnouncements = storage.getItem('bkt_announcements', DEFAULT_ANNOUNCEMENTS);
  const initialRawCalendarEvents = storage.getItem('bkt_calendar_events', DEFAULT_CALENDAR_EVENTS);
  const initialRawSuppliers = storage.getItem('bkt_suppliers', DEFAULT_SUPPLIERS);
  const initialRawLogs: ActivityLog[] = storage.getItem('bkt_logs', [
    { id: 'log_init', userId: 'system', userName: 'System', userRole: 'admin', action: 'Sistem Başlatıldı', details: 'Berkaytur Servis Yönetim Sistemi başarıyla yüklendi.', timestamp: new Date().toLocaleString(), ipAddress: '192.168.1.100', device: 'Sistem Sunucusu' }
  ]);

  const initialCurrentUser = storage.getItem('bkt_current_user', null);
  const filtered = filterDataByScope(initialCurrentUser, {
    users: initialRawUsers,
    students: initialRawStudents,
    schools: initialRawSchools,
    vehicles: initialRawVehicles,
    routes: initialRawRoutes,
    payments: initialRawPayments,
    documents: initialRawDocuments,
    logs: initialRawLogs,
    suppliers: initialRawSuppliers,
    announcements: initialRawAnnouncements,
    calendarEvents: initialRawCalendarEvents
  });

  return {
    // UI Filtered Database lists
    users: filtered.users,
    students: filtered.students,
    schools: filtered.schools,
    vehicles: filtered.vehicles,
    routes: filtered.routes,
    payments: filtered.payments,
    documents: filtered.documents,
    logs: filtered.logs,
    suppliers: filtered.suppliers,
    announcements: filtered.announcements,
    calendarEvents: filtered.calendarEvents,

    // Raw databases
    rawUsers: initialRawUsers,
    rawStudents: initialRawStudents,
    rawSchools: initialRawSchools,
    rawVehicles: initialRawVehicles,
    rawRoutes: initialRawRoutes,
    rawPayments: initialRawPayments,
    rawDocuments: initialRawDocuments,
    rawLogs: initialRawLogs,
    rawSuppliers: initialRawSuppliers,
    rawAnnouncements: initialRawAnnouncements,
    rawCalendarEvents: initialRawCalendarEvents,

    settings: storage.getItem('bkt_settings', DEFAULT_SETTINGS),
    favorites: storage.getItem('bkt_favorites', []),
    academicYears: storage.getItem('bkt_academic_years', APP_CONFIG.DEFAULT_ACADEMIC_YEARS),
    activeAcademicYear: storage.getItem('bkt_active_academic_year', APP_CONFIG.ACTIVE_ACADEMIC_YEAR),
    activeSchoolId: 'all',

    currentUser: initialCurrentUser,
    activeStudentForParent: storage.getItem('bkt_active_student_parent', null),

    // Actions - Authentication
    login: async (role, username, password, studentName, parentPhone) => {
      if (role === 'parent') {
        if (!studentName || !parentPhone) {
          return { success: false, error: 'Lütfen öğrenci adı ve veli telefon numarasını giriniz.' };
        }
        
        const res = await ApiClient.login('parent', parentPhone, studentName);
        if (res.success && res.data?.user) {
          const { rawStudents } = get();
          const cleanPhone = parentPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
          const foundStudent = rawStudents.find(s => {
            const matchName = s.name.toLowerCase().trim() === studentName.toLowerCase().trim();
            const sPhone = (s.parentPhone || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
            return matchName && (sPhone.includes(cleanPhone) || cleanPhone.includes(sPhone));
          });

          if (foundStudent) {
            set({ activeStudentForParent: foundStudent });
            setLocalStorage('bkt_active_student_parent', foundStudent);
          }
          
          set({ currentUser: res.data.user });
          setLocalStorage('bkt_current_user', res.data.user);
          updateStateAndFilter(set, get, { currentUser: res.data.user });
          get().addLog('Giriş Yapıldı', `Veli Girişi Başarılı: ${res.data.user.name} (Öğrenci: ${studentName})`);
          await get().fetchSystemData();
          return { success: true };
        }
        get().addLog('Giriş Başarısız', `Veli Giriş Denemesi Başarısız: Öğrenci: "${studentName}", Telefon: "${parentPhone}"`);
        return { success: false, error: res.error || 'Öğrenci adı veya telefon numarası bulunamadı!' };
      }

      if (!username || !password) {
        return { success: false, error: 'Kullanıcı adı ve şifre zorunludur.' };
      }

      const res = await ApiClient.login(role, username, password);
      if (res.success && res.data?.user) {
        set({ currentUser: res.data.user });
        setLocalStorage('bkt_current_user', res.data.user);
        updateStateAndFilter(set, get, { currentUser: res.data.user });
        get().addLog('Giriş Yapıldı', `Kullanıcı Girişi: ${res.data.user.name} (${res.data.user.role.toUpperCase()})`);
        await get().fetchSystemData();
        return { success: true };
      }

      get().addLog('Giriş Başarısız', `Giriş Denemesi Başarısız - Rol: ${role.toUpperCase()}, Kullanıcı: ${username}`);
      return { success: false, error: res.error || 'Geçersiz kullanıcı adı veya şifre!' };
    },

    logout: async () => {
      const { currentUser } = get();
      if (currentUser) {
        get().addLog('Çıkış Yapıldı', `Kullanıcı Çıkış Yaptı: ${currentUser.name}`);
      }
      await ApiClient.logout();
      storage.removeItem('bkt_active_student_parent');
      storage.removeItem('bkt_current_user');
      set({ activeStudentForParent: null });
      updateStateAndFilter(set, get, { currentUser: null });
    },

    verifySession: async () => {
      const res = await ApiClient.verifySession();
      if (res.success && res.data) {
        set({ currentUser: res.data });
        updateStateAndFilter(set, get, { currentUser: res.data });
        
        // Restore parent's active student if needed
        if (res.data.role === 'parent') {
          const { rawStudents } = get();
          const cleanPhone = res.data.phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
          const foundStudent = rawStudents.find(s => {
            const sPhone = (s.parentPhone || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
            return sPhone.includes(cleanPhone) || cleanPhone.includes(sPhone);
          });
          if (foundStudent) {
            set({ activeStudentForParent: foundStudent });
            setLocalStorage('bkt_active_student_parent', foundStudent);
          }
        }
        await get().fetchSystemData();
        return true;
      } else {
        set({ currentUser: null, activeStudentForParent: null });
        updateStateAndFilter(set, get, { currentUser: null, activeStudentForParent: null });
        return false;
      }
    },

    fetchSystemData: async () => {
      const { currentUser } = get();
      if (!currentUser) return;

      try {
        // Fetch vehicles
        const vRes = await ApiClient.fetchVehicles();
        if (vRes.success && vRes.data) {
          updateStateAndFilter(set, get, { rawVehicles: vRes.data });
        }

        // Fetch payments
        const pRes = await ApiClient.fetchPayments();
        if (pRes.success && pRes.data) {
          updateStateAndFilter(set, get, { rawPayments: pRes.data });
        }

        // Fetch documents
        const dRes = await ApiClient.fetchDocuments();
        if (dRes.success && dRes.data) {
          updateStateAndFilter(set, get, { rawDocuments: dRes.data });
        }

        // Fetch logs
        const lRes = await ApiClient.fetchLogs();
        if (lRes.success && lRes.data) {
          updateStateAndFilter(set, get, { rawLogs: lRes.data });
        }

        // Fetch users (if admin/manager/coordinator)
        if (['admin', 'manager', 'coordinator'].includes(currentUser.role)) {
          const uRes = await ApiClient.fetchUsers();
          if (uRes.success && uRes.data) {
            updateStateAndFilter(set, get, { rawUsers: uRes.data });
          }
        }
      } catch (err) {
        console.error('fetchSystemData failed:', err);
      }
    },

    // Actions - Users
    addUser: (userData) => {
      const { rawUsers, currentUser } = get();
      
      // Authorization Check
      if (currentUser && currentUser.role !== 'admin') {
        alert("❌ Yetki Sınırı!\n\nYeni kullanıcı oluşturma yetkisi yalnızca Sistem Yöneticisine (Admin) aittir.");
        return;
      }

      const newUser: User = {
        ...userData,
        id: `u_${Date.now()}`
      };
      const updated = [...rawUsers, newUser];
      setLocalStorage('bkt_users', updated);
      updateStateAndFilter(set, get, { rawUsers: updated });
      
      // Format logging of assignments if any
      const assignmentsText = [
        newUser.assignedSchools && newUser.assignedSchools.length > 0 ? `Okullar: ${newUser.assignedSchools.join(', ')}` : '',
        newUser.assignedAreas && newUser.assignedAreas.length > 0 ? `Bölgeler: ${newUser.assignedAreas.join(', ')}` : ''
      ].filter(Boolean).join(' | ');

      get().addLog(
        'Kullanıcı Eklendi', 
        `${newUser.name} (${newUser.role.toUpperCase()}) sisteme kaydedildi. ${assignmentsText ? `Atamalar: ${assignmentsText}` : ''}`
      );
    },

    updateUser: (id, updatedFields) => {
      const { rawUsers, currentUser } = get();
      const updated = rawUsers.map(u => u.id === id ? { ...u, ...updatedFields } : u);
      setLocalStorage('bkt_users', updated);
      
      const targetUser = rawUsers.find(u => u.id === id);
      
      // Check if assignments changed to log specifically
      let logDetails = `${targetUser?.name || 'Kullanıcı'} bilgileri güncellendi.`;
      if (updatedFields.assignedSchools || updatedFields.assignedAreas) {
        logDetails = `Yetki/Atama Güncellendi: ${targetUser?.name || 'Kullanıcı'} (${targetUser?.role.toUpperCase()}) için yeni atamalar -> ` + 
          [
            updatedFields.assignedSchools ? `Okullar: [${updatedFields.assignedSchools.join(', ')}]` : '',
            updatedFields.assignedAreas ? `Bölgeler: [${updatedFields.assignedAreas.join(', ')}]` : ''
          ].filter(Boolean).join(' | ');
      }

      if (targetUser) {
        get().addLog('Kullanıcı Güncellendi', logDetails, JSON.stringify(targetUser), JSON.stringify(updated.find(u => u.id === id)));
      }

      // Refresh session if active
      let nextCurrentUser = currentUser;
      if (currentUser && currentUser.id === id) {
        nextCurrentUser = updated.find(u => u.id === id) || null;
        setLocalStorage('bkt_current_user', nextCurrentUser);
      }

      updateStateAndFilter(set, get, { rawUsers: updated, currentUser: nextCurrentUser });
    },

    deleteUser: (id) => {
      const { rawUsers } = get();
      const targetUser = rawUsers.find(u => u.id === id);
      const updated = rawUsers.filter(u => u.id !== id);
      setLocalStorage('bkt_users', updated);
      
      if (targetUser) {
        get().addLog('Kullanıcı Silindi', `${targetUser.name} sistemden silindi.`);
      }

      updateStateAndFilter(set, get, { rawUsers: updated });
    },

    // Actions - Students
    addStudent: (studentData) => {
      const { rawStudents } = get();
      const newStudent: Student = {
        ...studentData,
        id: `st_${Date.now()}`,
        morningStatus: 'pending',
        eveningStatus: 'pending'
      };
      const updated = [...rawStudents, newStudent];
      setLocalStorage('bkt_students', updated);
      get().addLog('Öğrenci Eklendi', `Öğrenci ${newStudent.name} sisteme eklendi.`);
      
      updateStateAndFilter(set, get, { rawStudents: updated });
    },

    updateStudent: (id, updatedFields) => {
      const { rawStudents, activeStudentForParent } = get();
      const updated = rawStudents.map(s => s.id === id ? { ...s, ...updatedFields } : s);
      setLocalStorage('bkt_students', updated);
      
      const target = rawStudents.find(s => s.id === id);
      if (target) {
        get().addLog('Öğrenci Güncellendi', `${target.name} bilgileri güncellendi.`);
      }

      let nextActiveStudent = activeStudentForParent;
      if (activeStudentForParent && activeStudentForParent.id === id) {
        nextActiveStudent = updated.find(s => s.id === id) || null;
        setLocalStorage('bkt_active_student_parent', nextActiveStudent);
      }

      updateStateAndFilter(set, get, { rawStudents: updated, activeStudentForParent: nextActiveStudent });
    },

    deleteStudent: (id) => {
      const { rawStudents } = get();
      const target = rawStudents.find(s => s.id === id);
      const updated = rawStudents.filter(s => s.id !== id);
      setLocalStorage('bkt_students', updated);
      
      if (target) {
        get().addLog('Öğrenci Silindi', `${target.name} sistemden silindi.`);
      }

      updateStateAndFilter(set, get, { rawStudents: updated });
    },

    updateAttendance: (id, type, status) => {
      const { rawStudents, activeStudentForParent } = get();
      const updated = rawStudents.map(s => {
        if (s.id === id) {
          return type === 'morning' 
            ? { ...s, morningStatus: status as any } 
            : { ...s, eveningStatus: status as any };
        }
        return s;
      });
      
      setLocalStorage('bkt_students', updated);

      const target = rawStudents.find(s => s.id === id);
      if (target) {
        get().addLog('Yoklama Güncellendi', `${target.name} yoklama durumu: ${status}`);
      }

      let nextActiveStudent = activeStudentForParent;
      if (activeStudentForParent && activeStudentForParent.id === id) {
        nextActiveStudent = updated.find(s => s.id === id) || null;
        setLocalStorage('bkt_active_student_parent', nextActiveStudent);
      }

      updateStateAndFilter(set, get, { rawStudents: updated, activeStudentForParent: nextActiveStudent });
    },

    // Actions - Schools
    addSchool: (schoolData) => {
      const { rawSchools } = get();
      const newSchool: School = {
        ...schoolData,
        id: `s_${Date.now()}`
      };
      const updated = [...rawSchools, newSchool];
      setLocalStorage('bkt_schools', updated);
      get().addLog('Okul Eklendi', `${newSchool.name} sisteme eklendi.`);

      updateStateAndFilter(set, get, { rawSchools: updated });
    },

    updateSchool: (id, updatedFields) => {
      const { rawSchools } = get();
      const updated = rawSchools.map(s => s.id === id ? { ...s, ...updatedFields } : s);
      setLocalStorage('bkt_schools', updated);
      
      const target = rawSchools.find(s => s.id === id);
      if (target) {
        get().addLog('Okul Güncellendi', `${target.name} bilgileri güncellendi.`);
      }

      updateStateAndFilter(set, get, { rawSchools: updated });
    },

    deleteSchool: (id) => {
      const { rawSchools } = get();
      const target = rawSchools.find(s => s.id === id);
      const updated = rawSchools.filter(s => s.id !== id);
      setLocalStorage('bkt_schools', updated);
      
      if (target) {
        get().addLog('Okul Silindi', `${target.name} silindi.`);
      }

      updateStateAndFilter(set, get, { rawSchools: updated });
    },

    // Actions - Vehicles
    addVehicle: (vehicleData) => {
      const { rawVehicles, currentUser } = get();
      
      // Rule verification: only manager, coordinator, or admin can add vehicles
      if (currentUser && currentUser.role !== 'manager' && currentUser.role !== 'coordinator' && currentUser.role !== 'admin') {
        alert("❌ Yetki Sınırı!\n\nBu işlemi yapmaya yetkiniz bulunmamaktadır. Sadece Proje Müdürü ve Okul Sorumlusu araç ekleyebilir.");
        return;
      }

      const newVehicle: Vehicle = {
        ...vehicleData,
        id: vehicleData.id || `v_${Date.now()}`
      };
      const updated = [...rawVehicles, newVehicle];
      setLocalStorage('bkt_vehicles', updated);
      get().addLog('Araç Eklendi', `${newVehicle.plate} plakalı araç eklendi.`);

      updateStateAndFilter(set, get, { rawVehicles: updated });
    },

    updateVehicle: (id, updatedFields) => {
      const { rawVehicles, currentUser } = get();
      
      if (currentUser && currentUser.role !== 'manager' && currentUser.role !== 'coordinator' && currentUser.role !== 'admin') {
        alert("❌ Yetki Sınırı!\n\nBu işlemi yapmaya yetkiniz bulunmamaktadır.");
        return;
      }

      const updated = rawVehicles.map(v => v.id === id ? { ...v, ...updatedFields } : v);
      setLocalStorage('bkt_vehicles', updated);
      
      const target = rawVehicles.find(v => v.id === id);
      if (target) {
        get().addLog('Araç Güncellendi', `${target.plate} plakalı araç bilgileri güncellendi.`);
      }

      updateStateAndFilter(set, get, { rawVehicles: updated });
    },

    deleteVehicle: (id) => {
      const { rawVehicles, currentUser } = get();
      
      if (currentUser && currentUser.role !== 'manager' && currentUser.role !== 'coordinator' && currentUser.role !== 'admin') {
        alert("❌ Yetki Sınırı!\n\nBu işlemi yapmaya yetkiniz bulunmamaktadır.");
        return;
      }

      const target = rawVehicles.find(v => v.id === id);
      const updated = rawVehicles.filter(v => v.id !== id);
      setLocalStorage('bkt_vehicles', updated);
      
      if (target) {
        get().addLog('Araç Silindi', `${target.plate} plakalı araç silindi.`);
      }

      updateStateAndFilter(set, get, { rawVehicles: updated });
    },

    // Actions - Suppliers
    addSupplier: (supplierData) => {
      const { rawSuppliers, currentUser } = get();
      
      if (currentUser && currentUser.role !== 'manager' && currentUser.role !== 'coordinator' && currentUser.role !== 'admin') {
        alert("❌ Yetki Sınırı!\n\nBu işlemi yapmaya yetkiniz bulunmamaktadır. Sadece Proje Müdürü ve Okul Sorumlusu tedarikçi ekleyebilir.");
        return;
      }

      const newSupplier: Supplier = {
        ...supplierData,
        id: `sup_${Date.now()}`
      };
      const updated = [...rawSuppliers, newSupplier];
      setLocalStorage('bkt_suppliers', updated);
      get().addLog('Tedarikçi Eklendi', `${newSupplier.companyName} tedarikçisi eklendi.`);

      updateStateAndFilter(set, get, { rawSuppliers: updated });
    },

    updateSupplier: (id, updatedFields) => {
      const { rawSuppliers, currentUser } = get();
      
      if (currentUser && currentUser.role !== 'manager' && currentUser.role !== 'coordinator' && currentUser.role !== 'admin') {
        alert("❌ Yetki Sınırı!\n\nBu işlemi yapmaya yetkiniz bulunmamaktadır.");
        return;
      }

      const updated = rawSuppliers.map(s => s.id === id ? { ...s, ...updatedFields } : s);
      setLocalStorage('bkt_suppliers', updated);
      
      const target = rawSuppliers.find(s => s.id === id);
      if (target) {
        get().addLog('Tedarikçi Güncellendi', `${target.companyName} bilgileri güncellendi.`);
      }

      updateStateAndFilter(set, get, { rawSuppliers: updated });
    },

    deleteSupplier: (id) => {
      const { rawSuppliers, currentUser } = get();
      
      if (currentUser && currentUser.role !== 'manager' && currentUser.role !== 'coordinator' && currentUser.role !== 'admin') {
        alert("❌ Yetki Sınırı!\n\nBu işlemi yapmaya yetkiniz bulunmamaktadır.");
        return;
      }

      const target = rawSuppliers.find(s => s.id === id);
      const updated = rawSuppliers.filter(s => s.id !== id);
      setLocalStorage('bkt_suppliers', updated);
      
      if (target) {
        get().addLog('Tedarikçi Silindi', `${target.companyName} silindi.`);
      }

      updateStateAndFilter(set, get, { rawSuppliers: updated });
    },

    // Actions - Routes
    addRoute: (routeData) => {
      const { rawRoutes } = get();
      const newRoute: BusRoute = {
        ...routeData,
        id: `r_${Date.now()}`,
        status: 'idle'
      };
      const updated = [...rawRoutes, newRoute];
      setLocalStorage('bkt_routes', updated);
      get().addLog('Güzergah Eklendi', `${newRoute.name} güzergahı eklendi.`);

      updateStateAndFilter(set, get, { rawRoutes: updated });
    },

    updateRoute: (id, updatedFields) => {
      const { rawRoutes } = get();
      const updated = rawRoutes.map(r => r.id === id ? { ...r, ...updatedFields } : r);
      setLocalStorage('bkt_routes', updated);
      
      const target = rawRoutes.find(r => r.id === id);
      if (target) {
        get().addLog('Güzergah Güncellendi', `${target.name} güzergahı güncellendi.`);
      }

      updateStateAndFilter(set, get, { rawRoutes: updated });
    },

    deleteRoute: (id) => {
      const { rawRoutes } = get();
      const target = rawRoutes.find(r => r.id === id);
      const updated = rawRoutes.filter(r => r.id !== id);
      setLocalStorage('bkt_routes', updated);
      
      if (target) {
        get().addLog('Güzergah Silindi', `${target.name} silindi.`);
      }

      updateStateAndFilter(set, get, { rawRoutes: updated });
    },

    startRoute: (id, type) => {
      const { rawRoutes } = get();
      const status = (type === 'morning' ? 'morning_active' : 'evening_active') as any;
      const updated = rawRoutes.map(r => r.id === id ? { 
        ...r, 
        status,
        stops: r.stops.map(s => ({ ...s, status: 'pending' as const }))
      } : r);
      
      setLocalStorage('bkt_routes', updated);
      
      const target = rawRoutes.find(r => r.id === id);
      if (target) {
        get().addLog('Servis Başlatıldı', `${target.name} güzergahı başlatıldı (${type === 'morning' ? 'Sabah' : 'Akşam'}).`);
      }

      updateStateAndFilter(set, get, { rawRoutes: updated });
    },

    stopRoute: (id) => {
      const { rawRoutes } = get();
      const updated = rawRoutes.map(r => r.id === id ? { ...r, status: 'completed' as const } : r);
      setLocalStorage('bkt_routes', updated);
      
      const target = rawRoutes.find(r => r.id === id);
      if (target) {
        get().addLog('Servis Tamamlandı', `${target.name} güzergahı sonlandırıldı.`);
      }

      updateStateAndFilter(set, get, { rawRoutes: updated });
    },

    updateRouteLocation: (id, lat, lng) => {
      const { rawRoutes } = get();
      const updated = rawRoutes.map(r => r.id === id ? { ...r, currentLat: lat, currentLng: lng } : r);
      setLocalStorage('bkt_routes', updated);

      updateStateAndFilter(set, get, { rawRoutes: updated });
    },

    // Actions - Payments
    addPayment: (paymentData) => {
      const { rawPayments } = get();
      const newPayment: Payment = {
        ...paymentData,
        id: `p_${Date.now()}`,
        status: 'pending'
      };
      const updated = [...rawPayments, newPayment];
      setLocalStorage('bkt_payments', updated);
      get().addLog('Ödeme Talebi', `${newPayment.studentName} için ${newPayment.amount} TL ödeme talebi oluşturuldu.`);

      updateStateAndFilter(set, get, { rawPayments: updated });
    },

    recordPayment: (id, amount) => {
      const { rawPayments } = get();
      const updated = rawPayments.map(p => p.id === id ? { 
        ...p, 
        status: 'paid' as const, 
        paymentDate: new Date().toISOString().split('T')[0] 
      } : p);
      setLocalStorage('bkt_payments', updated);
      
      const target = rawPayments.find(p => p.id === id);
      if (target) {
        get().addLog('Ödeme Alındı', `${target.studentName} için ${amount} TL tahsilat yapıldı.`);
      }

      updateStateAndFilter(set, get, { rawPayments: updated });
    },

    // Actions - Documents
    addDocument: (docData) => {
      const { rawDocuments, currentUser } = get();
      const newDoc: DocumentArchive = {
        ...docData,
        id: `doc_${Date.now()}`,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: currentUser?.name || 'Sistem'
      };
      const updated = [newDoc, ...rawDocuments];
      setLocalStorage('bkt_documents', updated);
      get().addLog('Belge Yüklendi', `${newDoc.name} belgesi ${newDoc.category} arşivine yüklendi.`);

      updateStateAndFilter(set, get, { rawDocuments: updated });
    },

    deleteDocument: (id) => {
      const { rawDocuments } = get();
      const target = rawDocuments.find(d => d.id === id);
      const updated = rawDocuments.filter(d => d.id !== id);
      setLocalStorage('bkt_documents', updated);
      
      if (target) {
        get().addLog('Belge Silindi', `${target.name} arşivden kaldırıldı.`);
      }

      updateStateAndFilter(set, get, { rawDocuments: updated });
    },

    // Actions - Common logger
    addLog: (action, details, oldValue?, newValue?) => {
      const { rawLogs, currentUser } = get();
      const newLog = AuditService.createLogEntry(action, details, currentUser, oldValue, newValue);
      const updated = AuditService.appendLog(rawLogs, newLog, APP_CONFIG.MAX_LOG_ENTRIES);
      setLocalStorage('bkt_logs', updated);
      
      // Fire-and-forget persistent server-side mirroring of crucial audit trails
      ApiClient.postLog({
        action,
        details,
        userName: currentUser?.name || 'Sistem',
        userRole: currentUser?.role || 'admin',
        userId: currentUser?.id || 'system'
      }).catch(err => console.warn('Server audit log sync ignored:', err));

      updateStateAndFilter(set, get, { rawLogs: updated });
    },

    // Settings & Sync Functions
    updateSettings: (newSettings) => {
      const { settings } = get();
      const updated = { ...settings, ...newSettings };
      set({ settings: updated });
      setLocalStorage('bkt_settings', updated);
      get().addLog('Ayarlar Güncellendi', 'Sistem entegrasyon ayarları güncellendi.');
    },

    syncWithGoogleSheets: async () => {
      const { settings } = get();
      if (!settings.googleSheetsUrl) {
        get().addLog('Google Sheets Hatası', 'Entegrasyon URL adresi tanımlı değil.');
        return false;
      }

      get().addLog('Senkronizasyon Başladı', 'Google Sheets ve Drive verileri senkronize ediliyor...');
      
      const result = await ApiClient.syncGoogleSheets(settings.googleSheetsUrl);
      if (result.success && result.data) {
        const newSettings = { ...settings, lastBackupTime: result.data.timestamp };
        set({ settings: newSettings });
        setLocalStorage('bkt_settings', newSettings);
        
        get().addLog(
          'Senkronizasyon Başarılı', 
          `Veriler Google Sheets ile senkronize edildi. ${result.data.syncedCount} satır/kayıt güncellendi.`
        );
        return true;
      } else {
        get().addLog('Senkronizasyon Hatası', result.error || 'Google Apps Script bağlantı hatası oluştu.');
        return false;
      }
    },

    // Actions - Announcements
    addAnnouncement: (ann) => {
      const { rawAnnouncements } = get();
      const newAnn: Announcement = {
        ...ann,
        id: `ann_${Date.now()}`,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      const updated = [newAnn, ...rawAnnouncements];
      setLocalStorage('bkt_announcements', updated);
      get().addLog('Duyuru Yayınlandı', `"${newAnn.title}" başlıklı duyuru yayınlandı.`);

      updateStateAndFilter(set, get, { rawAnnouncements: updated });
    },

    deleteAnnouncement: (id) => {
      const { rawAnnouncements } = get();
      const target = rawAnnouncements.find(a => a.id === id);
      const updated = rawAnnouncements.filter(a => a.id !== id);
      setLocalStorage('bkt_announcements', updated);
      if (target) {
        get().addLog('Duyuru Kaldırıldı', `"${target.title}" başlıklı duyuru silindi.`);
      }

      updateStateAndFilter(set, get, { rawAnnouncements: updated });
    },

    // Actions - Calendar
    addCalendarEvent: (evt) => {
      const { rawCalendarEvents } = get();
      const newEvt: CalendarEvent = {
        ...evt,
        id: `evt_${Date.now()}`
      };
      const updated = [...rawCalendarEvents, newEvt];
      setLocalStorage('bkt_calendar_events', updated);
      get().addLog('Etkinlik Eklendi', `Takvime "${newEvt.title}" görevi/etkinliği eklendi.`);

      updateStateAndFilter(set, get, { rawCalendarEvents: updated });
    },

    deleteCalendarEvent: (id) => {
      const { rawCalendarEvents } = get();
      const target = rawCalendarEvents.find(e => e.id === id);
      const updated = rawCalendarEvents.filter(e => e.id !== id);
      setLocalStorage('bkt_calendar_events', updated);
      if (target) {
        get().addLog('Etkinlik Kaldırıldı', `Takvimden "${target.title}" görevi silindi.`);
      }

      updateStateAndFilter(set, get, { rawCalendarEvents: updated });
    },

    // Actions - Favorites
    toggleFavorite: (userId, title, path, iconName) => {
      const { favorites } = get();
      const exists = favorites.find(f => f.userId === userId && f.path === path);
      let updated: FavoritePage[] = [];
      if (exists) {
        updated = favorites.filter(f => !(f.userId === userId && f.path === path));
      } else {
        updated = [...favorites, { id: `fav_${Date.now()}`, userId, title, path, iconName }];
      }
      set({ favorites: updated });
      setLocalStorage('bkt_favorites', updated);
    },

    // Actions - Academic Year
    setActiveAcademicYear: (year) => {
      set({ activeAcademicYear: year });
      setLocalStorage('bkt_active_academic_year', year);
      get().addLog('Dönem Değiştirildi', `Aktif çalışma dönemi "${year}" olarak seçildi.`);
    },

    setActiveSchoolId: (id) => {
      set({ activeSchoolId: id });
    },

    archiveAndCloneToNewYear: (sourceYear, targetYear) => {
      const { rawStudents, rawSchools, rawVehicles, rawRoutes, academicYears } = get();
      
      let newYears = [...academicYears];
      if (!newYears.includes(targetYear)) {
        newYears.push(targetYear);
      }

      const clonedSchools = rawSchools.map(s => ({
        ...s,
        id: `${s.id}_${targetYear}`,
        academicYear: targetYear
      }));

      const clonedVehicles = rawVehicles.map(v => ({
        ...v,
        id: `${v.id}_${targetYear}`,
        academicYear: targetYear
      }));

      const clonedStudents = rawStudents.map(st => ({
        ...st,
        id: `${st.id}_${targetYear}`,
        schoolId: `${st.schoolId}_${targetYear}`,
        routeId: st.routeId ? `${st.routeId}_${targetYear}` : undefined,
        academicYear: targetYear,
        morningStatus: 'pending' as const,
        eveningStatus: 'pending' as const
      }));

      const clonedRoutes = rawRoutes.map(r => ({
        ...r,
        id: `${r.id}_${targetYear}`,
        schoolId: `${r.schoolId}_${targetYear}`,
        vehicleId: `${r.vehicleId}_${targetYear}`,
        status: 'idle' as const,
        stops: r.stops.map(st => ({
          ...st,
          id: `${st.id}_${targetYear}`,
          studentId: st.studentId ? `${st.studentId}_${targetYear}` : undefined,
          status: 'pending' as const
        }))
      }));

      const nextSchools = [...rawSchools, ...clonedSchools];
      const nextVehicles = [...rawVehicles, ...clonedVehicles];
      const nextStudents = [...rawStudents, ...clonedStudents];
      const nextRoutes = [...rawRoutes, ...clonedRoutes];

      setLocalStorage('bkt_academic_years', newYears);
      setLocalStorage('bkt_active_academic_year', targetYear);
      setLocalStorage('bkt_schools', nextSchools);
      setLocalStorage('bkt_vehicles', nextVehicles);
      setLocalStorage('bkt_students', nextStudents);
      setLocalStorage('bkt_routes', nextRoutes);

      updateStateAndFilter(set, get, {
        academicYears: newYears,
        activeAcademicYear: targetYear,
        rawSchools: nextSchools,
        rawVehicles: nextVehicles,
        rawStudents: nextStudents,
        rawRoutes: nextRoutes,
      });

      get().addLog(
        'Yeni Dönem Başlatıldı', 
        `"${sourceYear}" dönemine ait kayıtlar başarıyla "${targetYear}" dönemine kopyalandı ve aktif dönem yapıldı.`
      );
    },

    checkDocumentExpiries: () => {
      const { vehicles, users, announcements, addAnnouncement, addLog } = get();
      const today = new Date();
      today.setHours(0,0,0,0);

      const checkDateAndAlert = (
        dateStr: string | undefined, 
        subjectName: string, 
        docTypeName: string, 
        category: 'Araç' | 'Şoför' | 'Hostes'
      ) => {
        if (!dateStr) return;
        const targetDate = new Date(dateStr);
        if (isNaN(targetDate.getTime())) return;
        targetDate.setHours(0,0,0,0);
        
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if ([30, 15, 7, 1].includes(diffDays)) {
          const title = `⚠️ Evrak Uyarı: ${subjectName} - ${docTypeName} Son ${diffDays} Gün!`;
          if (!announcements.some(a => a.title === title)) {
            const content = `${category} kategorisindeki "${subjectName}" için tanımlı "${docTypeName}" belgesinin süresi ${diffDays} gün sonra (${dateStr}) dolacaktır. Lütfen belgeleri güncelleyiniz.`;
            addAnnouncement({
              title,
              content,
              targetRoles: ['admin', 'manager', 'coordinator'],
              authorName: 'Sistem Evrak Denetçisi',
              channels: ['notification', 'whatsapp']
            });
            addLog(
              'Evrak Süresi Yaklaşıyor', 
              `[${category}] ${subjectName} - ${docTypeName} bitimine ${diffDays} gün kaldı. WhatsApp/Sistem uyarısı gönderildi.`
            );
          }
        }
      };

      vehicles.forEach(v => {
        checkDateAndAlert(v.inspectionDate, v.plate, 'Muayene Geçerlilik', 'Araç');
        checkDateAndAlert(v.insuranceDate, v.plate, 'Trafik Sigortası', 'Araç');
        checkDateAndAlert(v.exhaustDate, v.plate, 'Egzoz Emisyon Muayenesi', 'Araç');
        
        const extra = v as any;
        if (extra.compInsuranceDate) {
          checkDateAndAlert(extra.compInsuranceDate, v.plate, 'Kasko', 'Araç');
        }
        if (extra.fireExtinguisherDate) {
          checkDateAndAlert(extra.fireExtinguisherDate, v.plate, 'Yangın Tüpü Kontrolü', 'Araç');
        }
        if (extra.maintenanceDate) {
          checkDateAndAlert(extra.maintenanceDate, v.plate, 'Periyodik Bakım', 'Araç');
        }
      });

      users.forEach(u => {
        if (u.role === 'driver') {
          checkDateAndAlert(u.psychotechnic, u.name, 'Psikoteknik Belgesi', 'Şoför');
          checkDateAndAlert(u.healthReport, u.name, 'Sağlık Raporu', 'Şoför');
          checkDateAndAlert(u.criminalRecord, u.name, 'Sabıka Kaydı', 'Şoför');
        } else if (u.role === 'hostess') {
          checkDateAndAlert(u.healthReport, u.name, 'Sağlık Raporu', 'Hostes');
          checkDateAndAlert(u.criminalRecord, u.name, 'Sabıka Kaydı', 'Hostes');
        }
      });
    },

    clearDatabase: () => {
      const defaultAdmin = DEFAULT_USERS.filter(u => u.role === 'admin');
      
      setLocalStorage('bkt_users', defaultAdmin);
      setLocalStorage('bkt_students', []);
      setLocalStorage('bkt_schools', []);
      setLocalStorage('bkt_vehicles', []);
      setLocalStorage('bkt_routes', []);
      setLocalStorage('bkt_payments', []);
      setLocalStorage('bkt_documents', []);
      setLocalStorage('bkt_logs', [{ id: 'log_clear', userId: 'system', userName: 'System', userRole: 'admin', action: 'Veritabanı Sıfırlandı', details: 'Veritabanı temizlendi.', timestamp: new Date().toLocaleString(), ipAddress: '192.168.1.100', device: 'Sistem Sunucusu' }]);
      storage.removeItem('bkt_current_user');
      storage.removeItem('bkt_active_student_parent');

      updateStateAndFilter(set, get, {
        rawUsers: defaultAdmin,
        rawStudents: [],
        rawSchools: [],
        rawVehicles: [],
        rawRoutes: [],
        rawPayments: [],
        rawDocuments: [],
        rawLogs: [{ id: 'log_clear', userId: 'system', userName: 'System', userRole: 'admin', action: 'Veritabanı Sıfırlandı', details: 'Veritabanı temizlendi.', timestamp: new Date().toLocaleString(), ipAddress: '192.168.1.100', device: 'Sistem Sunucusu' }],
        currentUser: null,
        activeStudentForParent: null
      });
    }
  };
});
