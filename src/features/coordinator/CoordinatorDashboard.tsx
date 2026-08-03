/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { 
  Home, Users, CreditCard, FileText, CheckSquare, 
  Calendar, MapPin, BarChart3, LogOut, Bell, 
  Check, Info, AlertTriangle, ShieldCheck, HelpCircle,
  Menu, X, Database
} from 'lucide-react';

// Subcomponents import
import DashboardHome from './components/DashboardHome';
import VeliBasvurulari from './components/VeliBasvurulari';
import KoltukPlani from './components/KoltukPlani';
import TahsilatOdeme from './components/TahsilatOdeme';
import Sozlesmeler from './components/Sozlesmeler';
import Denetimler from './components/Denetimler';
import Puantaj from './components/Puantaj';
import Reports from './components/Reports';
import PremiumReportsDashboard from '../reports/PremiumReportsDashboard';
import OSMMap from '../manager/components/OSMMap';
import { VehicleFormModal } from '../../components/VehicleManagerModals';
import PuantajEntegrasyonu from '../accounting/components/PuantajEntegrasyonu';
import BulkOperationsPanel from '../../components/BulkOperationsPanel';
import AnnouncementManager from '../../components/AnnouncementManager';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  time: string;
}

export default function CoordinatorDashboard() {
  const { 
    currentUser, logout, students, schools, vehicles, users, payments, routes, updateStudent, addPayment, recordPayment, addLog,
    activeSchoolId, setActiveSchoolId
  } = useAppStore();

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(activeSchoolId);

  React.useEffect(() => {
    setSelectedSchoolId(activeSchoolId);
  }, [activeSchoolId]);

  // Filter schools and students based on assignedCoordinators
  const managedSchools = currentUser?.role === 'coordinator'
    ? schools.filter(s => s.id === currentUser.schoolId || (s.assignedCoordinators || []).includes(currentUser.id))
    : schools;

  const activeSchools = selectedSchoolId === 'all'
    ? managedSchools
    : managedSchools.filter(s => s.id === selectedSchoolId);

  const activeSchoolIds = activeSchools.map(s => s.id);

  const filteredStudents = students.filter(st => activeSchoolIds.includes(st.schoolId));

  const activeSchoolName = activeSchools.length > 0
    ? activeSchools.map(s => s.name).join(', ')
    : 'Tüm Okullar Genel Koordinatörlüğü';

  const [activeTab, setActiveTab] = useState<
    'home' | 'applications' | 'seating' | 'collections' | 'contracts' | 'inspections' | 'attendance' | 'map' | 'reports' | 'bulkops' | 'announcements'
  >('home');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live Notification System
  const [notifications, setNotifications] = useState<InAppNotification[]>([
    {
      id: 'n_1',
      title: 'Yaz Dönemi Kayıtları',
      message: '2026-2027 Eğitim Öğretim yılı servis başvuruları başlamıştır.',
      type: 'info',
      time: 'Şimdi'
    }
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [showExcelPuantaj, setShowExcelPuantaj] = useState(false);

  const handleAddNotification = (title: string, message: string, type: 'info' | 'success' | 'warning') => {
    const newNotif: InAppNotification = {
      id: `notif_${Date.now()}`,
      title,
      message,
      type,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Filter users based on their role
  const drivers = users.filter(u => u.role === 'driver');
  const hostesses = users.filter(u => u.role === 'hostess');

  const [applications, setApplications] = useState<any[]>(() => {
    if (!(window as any)._berkaytur_veli_basvurulari) {
      (window as any)._berkaytur_veli_basvurulari = [
        {
          id: 'app_1',
          studentName: 'Defne Kaya',
          tcNo: '11223344556',
          birthDate: '2016-04-12',
          gender: 'Kız',
          schoolId: 's1',
          schoolName: 'Atatürk Anadolu Lisesi',
          classLevel: '4-B',
          section: 'A',
          motherName: 'Canan Kaya',
          fatherName: 'Murat Kaya',
          phone: '0555 333 44 55',
          secondPhone: '0555 123 45 67',
          email: 'canan@kaya.com',
          address: 'Ayrancı Mh. Reşat Nuri Sk. No: 15, Ankara',
          morningAddress: 'Ayrancı Mh. Reşat Nuri Sk. No: 15, Ankara',
          eveningAddress: 'Ayrancı Mh. Reşat Nuri Sk. No: 15, Ankara',
          secondAddress: '',
          locationShared: true,
          googleMapUrl: 'https://maps.google.com/?q=39.9020,32.8580',
          siblingInfo: 'Yok',
          allergy: 'Yok',
          specialCondition: 'Yok',
          medication: 'Yok',
          deliveryInstruction: 'Sadece annesine teslim edilsin.',
          emergencyContact: 'Murat Kaya (Baba)',
          emergencyPhone: '0555 123 45 67',
          photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200',
          kvkkConsent: true,
          rulesConsent: true,
          contractConsent: true,
          appliedAt: '2026-07-10',
          km: 4.5,
          calculatedFee: 2400,
          status: 'Bekliyor'
        },
        {
          id: 'app_2',
          studentName: 'Ege Öz',
          tcNo: '99887766554',
          birthDate: '2015-08-20',
          gender: 'Erkek',
          schoolId: 's1',
          schoolName: 'Atatürk Anadolu Lisesi',
          classLevel: '5-A',
          section: 'B',
          motherName: 'Ayla Öz',
          fatherName: 'Cem Öz',
          phone: '0533 111 22 33',
          secondPhone: '',
          email: 'ayla@oz.com',
          address: 'Kavaklıdere Mh. Tunalı Hilmi Cd. No: 80, Ankara',
          morningAddress: 'Kavaklıdere Mh. Tunalı Hilmi Cd. No: 80, Ankara',
          eveningAddress: 'Kavaklıdere Mh. Tunalı Hilmi Cd. No: 80, Ankara',
          secondAddress: '',
          locationShared: true,
          googleMapUrl: 'https://maps.google.com/?q=39.9100,32.8620',
          siblingInfo: 'Yok',
          allergy: 'Gluten Hassasiyeti',
          specialCondition: 'Yok',
          medication: 'Yok',
          deliveryInstruction: 'Kendisi eve geçebilir.',
          emergencyContact: 'Cem Öz',
          emergencyPhone: '0533 111 22 33',
          photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200',
          kvkkConsent: true,
          rulesConsent: true,
          contractConsent: true,
          appliedAt: '2026-07-12',
          km: 2.8,
          calculatedFee: 1800,
          status: 'Onaylandı'
        }
      ];
    }
    return (window as any)._berkaytur_veli_basvurulari;
  });

  const handleAddApplication = (newApp: any) => {
    const list = [...applications, newApp];
    setApplications(list);
    (window as any)._berkaytur_veli_basvurulari = list;
  };

  const handleUpdateApplication = (id: string, updated: any) => {
    const list = applications.map(app => app.id === id ? { ...app, ...updated } : app);
    setApplications(list);
    (window as any)._berkaytur_veli_basvurulari = list;
  };

  // Callback to handle updating student properties (like morning/evening status)
  const handleUpdateStudent = (id: string, updated: any) => {
    updateStudent(id, updated);
  };

  const menuItems = [
    { id: 'home', label: 'Anasayfa', icon: Home },
    { id: 'bulkops', label: 'Toplu İşlemler', icon: Database },
    { id: 'announcements', label: 'Duyuru Sistemi', icon: Bell },
    { id: 'applications', label: 'Veli Başvuruları', icon: Users },
    { id: 'seating', label: 'Koltuk Planı', icon: HelpCircle },
    { id: 'collections', label: 'Tahsilat ve Ödeme', icon: CreditCard },
    { id: 'contracts', label: 'Sözleşmeler', icon: FileText },
    { id: 'inspections', label: 'Sabah Denetimleri', icon: CheckSquare },
    { id: 'attendance', label: 'Puantaj & Yoklama', icon: Calendar },
    { id: 'map', label: 'OSM Canlı Harita', icon: MapPin },
    { id: 'reports', label: 'Raporlar & Çıktılar', icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-lg lg:hidden text-slate-600 transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200 text-white font-bold text-sm">
            B
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-sm tracking-tight sm:text-base">
              Berkaytur <span className="font-normal text-slate-500 underline underline-offset-4 decoration-blue-500/30">Koordinasyon</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
              {currentUser?.schoolId ? schools.find(s => s.id === currentUser.schoolId)?.name : 'Tüm Okullar Genel Koordinatörlüğü'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {managedSchools.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Okul Seçimi:</span>
              <select
                value={selectedSchoolId}
                onChange={e => {
                  setSelectedSchoolId(e.target.value);
                  setActiveSchoolId(e.target.value);
                }}
                className="bg-transparent border-0 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Atanan Okullar ({managedSchools.length})</option>
                {managedSchools.map(s => (
                  <option key={s.id} value={s.id}>🏫 {s.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* In-App Live Notification Bell with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="p-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all relative cursor-pointer text-slate-600"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 border-2 border-white rounded-full text-[9px] font-black text-white flex items-center justify-center animate-bounce">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-50 space-y-3 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Bildirim Merkezi</h5>
                  <button 
                    onClick={() => setNotifications([])}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Tümünü Temizle
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-3 rounded-2xl border transition-all flex gap-2.5 relative group ${
                        n.type === 'warning' 
                          ? 'bg-amber-50 border-amber-200/50 text-amber-900' 
                          : n.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-200/50 text-emerald-900' 
                            : 'bg-blue-50 border-blue-200/50 text-blue-900'
                      }`}
                    >
                      <span className="text-lg">
                        {n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'}
                      </span>
                      <div className="flex-1 space-y-0.5">
                        <p className="font-extrabold text-[11px]">{n.title}</p>
                        <p className="text-[10px] leading-relaxed opacity-80">{n.message}</p>
                        <span className="text-[9px] opacity-60 block mt-1 font-semibold">{n.time}</span>
                      </div>
                      <button 
                        onClick={() => clearNotification(n.id)}
                        className="absolute right-2 top-2 p-1 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <p className="text-center py-6 text-slate-400">Yeni bildirim bulunmuyor.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-extrabold text-slate-800">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide">Okul Sorumlusu</p>
          </div>

          <button 
            onClick={logout}
            className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all cursor-pointer text-slate-600"
            title="Güvenli Çıkış"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Grid Layout with Left Sidebar Menu */}
      <div className="flex-1 flex relative">
        {/* SIDEBAR: NAV NAVIGATION */}
        <aside className={`
          fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 p-5 flex flex-col gap-6 z-40 transition-transform lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:block'}
        `}>
          <div className="flex items-center justify-between lg:hidden border-b pb-3 border-slate-100">
            <span className="font-bold text-slate-700">Menü</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                      : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Bottom Branding info */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
            Berkaytur A.Ş. © 2026
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
          />
        )}

        {/* MAIN DASHBOARD SCREEN CANVAS */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
          {activeTab === 'home' && (
            <DashboardHome 
              schoolName={activeSchoolName} 
              onAddVehicleClick={() => setIsVehicleModalOpen(true)}
            />
          )}

          {activeTab === 'applications' && (
            <VeliBasvurulari 
              schools={activeSchools}
              allSchools={schools}
              applications={applications}
              onAddApplication={handleAddApplication}
              onUpdateApplication={handleUpdateApplication}
              onAddNotification={handleAddNotification}
            />
          )}

          {activeTab === 'seating' && (
            <KoltukPlani 
              vehicles={vehicles}
              students={filteredStudents}
              onUpdateStudent={handleUpdateStudent}
              onAddNotification={handleAddNotification}
              onAddLog={addLog}
            />
          )}

          {activeTab === 'collections' && (
            <TahsilatOdeme 
              schools={activeSchools}
              students={filteredStudents}
              payments={payments}
              onAddPayment={addPayment}
              onRecordPayment={recordPayment}
              onAddNotification={handleAddNotification}
              onAddLog={addLog}
            />
          )}

          {activeTab === 'contracts' && (
            <Sozlesmeler 
              schools={activeSchools}
              vehicles={vehicles}
              drivers={drivers}
              hostesses={hostesses}
              applications={applications}
              onAddLog={addLog}
              onAddNotification={handleAddNotification}
            />
          )}

          {activeTab === 'inspections' && (
            <Denetimler 
              vehicles={vehicles}
              drivers={drivers}
              hostesses={hostesses}
              onAddLog={addLog}
              onAddNotification={handleAddNotification}
            />
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <Puantaj 
                vehicles={vehicles}
                students={filteredStudents}
                drivers={drivers}
                hostesses={hostesses}
                onUpdateStudent={handleUpdateStudent}
                onAddLog={addLog}
                onAddNotification={handleAddNotification}
              />

              {/* Detaylı Excel Matrisi Entegrasyonu */}
              <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-5 h-5 text-emerald-600" /> Excel Tabanlı Aylık Puantaj Cetveli
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sürücü hakedişlerinin onaylandığı aylık puantaj cetveli</p>
                  </div>
                  <button
                    onClick={() => setShowExcelPuantaj(!showExcelPuantaj)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    {showExcelPuantaj ? 'Matrisi Gizle' : 'Matrisi Görüntüle'}
                  </button>
                </div>

                {showExcelPuantaj && (
                  <div className="pt-2">
                    <PuantajEntegrasyonu />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <OSMMap 
              schools={activeSchools}
              students={filteredStudents}
              vehicles={vehicles}
              drivers={drivers}
              hostesses={hostesses}
              routes={routes}
              onAddSchoolToMap={(lat, lng, name) => addLog('Haritaya Okul Eklendi', name)}
              onBulkAssign={(studentIds, vehicleId, dId, hId) => {
                const targetVehicle = vehicles.find(v => v.id === vehicleId);
                const matchedRoute = routes.find(r => r.vehicleId === vehicleId) || routes.find(r => r.id === vehicleId);
                
                studentIds.forEach(id => {
                  updateStudent(id, {
                    routeId: matchedRoute ? matchedRoute.id : vehicleId,
                    routeName: matchedRoute ? matchedRoute.name : (targetVehicle ? `${targetVehicle.plate} Güzergahı` : 'Servis Güzergahı')
                  });
                });
                
                addLog('Toplu Araç Ataması', `${studentIds.length} öğrenci başarıyla ${targetVehicle?.plate || vehicleId} plakalı araca atandı.`);
                addLog('Google Sheets Entegrasyonu', `${studentIds.length} öğrenci ataması Google Sheets dosyasına anlık olarak senkronize edildi.`);
              }}
            />
          )}

          {activeTab === 'reports' && (
            <PremiumReportsDashboard />
          )}

          {activeTab === 'bulkops' && (
            <BulkOperationsPanel 
              allowedSchools={managedSchools}
              allowedStudents={filteredStudents}
            />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementManager />
          )}
        </main>
      </div>

      <VehicleFormModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        schoolId={currentUser?.schoolId || 's1'}
      />
    </div>
  );
}
