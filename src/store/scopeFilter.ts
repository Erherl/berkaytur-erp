/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, Student, School, Vehicle, BusRoute, Payment, 
  DocumentArchive, ActivityLog, Announcement, CalendarEvent, Supplier
} from '../types';

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

export const updateStateAndFilter = (set: any, get: any, rawChanges: any) => {
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
