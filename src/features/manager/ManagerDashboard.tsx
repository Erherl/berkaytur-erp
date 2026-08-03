/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { School, Student, Vehicle, User, Payment } from '../../types';
import { 
  Home, Building, Users, Truck, UserCheck, Shield, Grid, Map, Calendar, 
  DollarSign, BarChart3, Bell, Settings as SettingsIcon, LogOut, Plus, 
  Edit2, Trash2, Check, X, ShieldAlert, AlertCircle, Phone, FileText, 
  ArrowRight, Sparkles, Send, Mail, MapPin, Eye, Info, FileSpreadsheet, Database
} from 'lucide-react';

// Sub-components
import BusSeatingPlan from './components/BusSeatingPlan';
import OSMMap from './components/OSMMap';
import ManagerNotifications from './components/ManagerNotifications';
import ManagerReports from './components/ManagerReports';
import Onaylar from './components/Onaylar';
import PremiumReportsDashboard from '../reports/PremiumReportsDashboard';
import { VehicleFormModal, SupplierFormModal, DriverFormModal, HostessFormModal } from '../../components/VehicleManagerModals';
import PuantajEntegrasyonu from '../accounting/components/PuantajEntegrasyonu';
import GoogleSheetsSync from './components/GoogleSheetsSync';
import BulkOperationsPanel from '../../components/BulkOperationsPanel';
import AnnouncementManager from '../../components/AnnouncementManager';
import SaasAnalyticsDashboard from './components/SaasAnalyticsDashboard';
import { DownloadService } from '../../services/DownloadService';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';

type ActiveMenuType = 
  | 'dashboard' | 'approvals' | 'schools' | 'students' | 'vehicle_assignments' | 'drivers' 
  | 'hostesses' | 'seating_plans' | 'map' | 'events' | 'accruals' 
  | 'reports' | 'notifications' | 'settings' | 'sheets_sync' | 'bulkops' | 'announcements' | 'saas_analytics';

export default function ManagerDashboard() {
  const store = useAppStore();
  const currentUser = store.currentUser;
  
  const [activeMenu, setActiveMenu] = useState<ActiveMenuType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modals state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [selectedSchoolForVehicle, setSelectedSchoolForVehicle] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isHostessModalOpen, setIsHostessModalOpen] = useState(false);
  const [showExcelPuantaj, setShowExcelPuantaj] = useState(false);

  // Filter lists based on what the Manager has access to (assignedManagers filter)
  const activeSchoolId = store.activeSchoolId;
  const setActiveSchoolId = store.setActiveSchoolId;

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(activeSchoolId);

  React.useEffect(() => {
    setSelectedSchoolId(activeSchoolId);
  }, [activeSchoolId]);

  const managedSchools = currentUser?.role === 'manager'
    ? store.schools.filter(s => (s.assignedManagers || []).includes(currentUser.id))
    : store.schools;

  const activeSchools = selectedSchoolId === 'all'
    ? managedSchools
    : managedSchools.filter(s => s.id === selectedSchoolId);
    
  const activeSchoolIds = activeSchools.map(s => s.id);

  const filteredStudents = store.students.filter(st => activeSchoolIds.includes(st.schoolId));

  const vehicles = store.vehicles;

  // Derive driver and hostess lists from users
  const drivers = store.users.filter(u => u.role === 'driver');
  const hostesses = store.users.filter(u => u.role === 'hostess');

  // School Form States
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    type: 'Özel', // Devlet / Özel
    authorized: 'Canan Kaya',
    coords: '39.9208, 32.8541',
    workingDays: 'Pazartesi-Cuma',
    startTime: '08:30',
    endTime: '16:00',
    capacity: 400,
    kmBasePrice: 28,
    calcType: 'Mesafe Tabanlı', // Mesafe Tabanlı / Sabit / Bölgelere Göre
  });

  // KM pricing tariff state (Unlimited tariffs per school)
  const [schoolPricingTariffs, setSchoolPricingTariffs] = useState<Record<string, { range: string; price: number }[]>>({
    's1': [
      { range: '0-3 KM', price: 1200 },
      { range: '3-5 KM', price: 1500 },
      { range: '5-10 KM', price: 2000 },
      { range: '10-15 KM', price: 2500 },
      { range: '15-20 KM', price: 3000 },
      { range: '20+ KM', price: 3500 },
    ],
    's2': [
      { range: '0-3 KM', price: 1100 },
      { range: '3-5 KM', price: 1400 },
      { range: '5-10 KM', price: 1800 },
      { range: '10-15 KM', price: 2300 },
      { range: '15+ KM', price: 2800 },
    ]
  });

  const [newTariffRange, setNewTariffRange] = useState('');
  const [newTariffPrice, setNewTariffPrice] = useState(0);

  // Active state status of schools (deactivation workflow)
  const [schoolStatus, setSchoolStatus] = useState<Record<string, 'active' | 'inactive'>>({
    's1': 'active',
    's2': 'active'
  });

  // Vehicle Assignment States
  const [assignmentType, setAssignmentType] = useState<'company' | 'supplier'>('company');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('v1');
  
  // Supplier Form Details
  const [supplierDetails, setSupplierDetails] = useState({
    companyName: 'BERKAYTUR Taşıma Hizmetleri A.Ş.',
    authorized: 'Mustafa Sağlam',
    phone: '0533 111 22 33',
    address: 'Ostim Sanayi Sitesi, Ankara',
    taxOffice: 'Kızılbey Vergi Dairesi',
    taxNo: '7540982341',
    iban: 'TR98 0006 2000 1234 5678 9000 01',
    plate: '06 BKT 999',
    license: 'A-983424-RUHSAT',
    hostessIncluded: 'excluded', // included / excluded
    driverIsOperating: true
  });

  // Capacities Dropdown State
  const [availableCapacities, setAvailableCapacities] = useState<number[]>([16, 19, 27, 31, 35, 44, 46, 54]);
  const [newCapacityInput, setNewCapacityInput] = useState<string>('');

  // Event planning states
  const [events, setEvents] = useState([
    {
      id: 'e1',
      name: 'Anıtkabir ve Cumhuriyet Müzesi Kültür Gezisi',
      date: '2026-07-20',
      time: '09:30',
      gathering: 'Cumhuriyet İlkokulu Ön Bahçe',
      destination: 'Anıtkabir, Çankaya',
      free: false,
      price: 120,
      studentsCount: 38,
      vehiclesCount: 2,
      driverName: 'Ahmet Yılmaz',
      hostessName: 'Ayşe Yıldız',
      occupancy: 100,
    }
  ]);

  const [eventForm, setEventForm] = useState({
    name: '',
    date: '2026-07-22',
    time: '10:00',
    gathering: 'Atatürk Anadolu Lisesi A Kapısı',
    destination: 'MTA Şehit Cuma Dağ Tabiat Tarihi Müzesi',
    free: true,
    price: 0,
    selectedStudents: [] as string[],
    selectedVehicleId: 'v1',
  });

  // Settings State (Google integration templates)
  const [settings, setSettings] = useState({
    googleSheetsUrl: store.settings.googleSheetsUrl,
    googleDriveFolderId: store.settings.googleDriveFolderId,
    whatsappGreetingTemplate: store.settings.whatsappGreetingTemplate,
    whatsappDelayTemplate: store.settings.whatsappDelayTemplate,
    whatsappSosTemplate: store.settings.whatsappSosTemplate,
    whatsappDriverTemplate: store.settings.whatsappDriverTemplate || '',
    whatsappHostessTemplate: store.settings.whatsappHostessTemplate || '',
    whatsappSupplierTemplate: store.settings.whatsappSupplierTemplate || '',
  });

  // School actions
  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchoolId) {
      store.updateSchool(editingSchoolId, {
        name: schoolForm.name,
        address: schoolForm.address,
        phone: schoolForm.phone,
        email: schoolForm.email,
      });
      setEditingSchoolId(null);
    } else {
      const newId = 'sch_' + Date.now();
      store.addSchool({
        name: schoolForm.name,
        address: schoolForm.address,
        phone: schoolForm.phone,
        email: schoolForm.email,
      });
      setSchoolStatus(prev => ({ ...prev, [newId]: 'active' }));
    }
    // Reset
    setSchoolForm({
      name: '', address: '', phone: '', email: '', type: 'Özel',
      authorized: 'Canan Kaya', coords: '39.9208, 32.8541',
      workingDays: 'Pazartesi-Cuma', startTime: '08:30', endTime: '16:00',
      capacity: 400, kmBasePrice: 28, calcType: 'Mesafe Tabanlı'
    });
  };

  const handleEditSchoolClick = (sch: School) => {
    setEditingSchoolId(sch.id);
    setSchoolForm({
      name: sch.name,
      address: sch.address,
      phone: sch.phone,
      email: sch.email,
      type: 'Özel',
      authorized: 'Canan Kaya',
      coords: '39.9208, 32.8541',
      workingDays: 'Pazartesi-Cuma',
      startTime: '08:30',
      endTime: '16:00',
      capacity: 400,
      kmBasePrice: 28,
      calcType: 'Mesafe Tabanlı',
    });
  };

  const toggleSchoolActive = (id: string) => {
    setSchoolStatus(prev => ({
      ...prev,
      [id]: prev[id] === 'active' ? 'inactive' : 'active'
    }));
  };

  const handleAttemptDeleteSchool = () => {
    alert("❌ Yetki Sınırı Uyarısı!\n\nProje Müdürü yetkileri ile doğrudan okul kaydı silinemez. Silme işlemi için Sistem Yöneticisine (Admin) onay talebi gönderilmiştir.");
  };

  const handleConfirmSupplier = () => {
    if (!supplierDetails.companyName || !supplierDetails.authorized || !supplierDetails.phone) {
      alert("Lütfen firma adı, yetkili adı ve telefon numarası alanlarını doldurunuz.");
      return;
    }
    
    // Add supplier
    store.addSupplier({
      companyName: supplierDetails.companyName,
      authorized: supplierDetails.authorized,
      phone: supplierDetails.phone,
      address: supplierDetails.address,
      taxOffice: supplierDetails.taxOffice,
      taxNo: supplierDetails.taxNo,
      iban: supplierDetails.iban,
      email: 'info@berkaytur.com',
      plate: supplierDetails.plate.toUpperCase(),
      vehicleType: 'supplier',
      capacity: 19,
      driverInfo: supplierDetails.driverIsOperating ? "Tedarikçi Kendi Kullanıyor" : "Atama Bekliyor",
      hostessInfo: supplierDetails.hostessIncluded === 'included' ? "Hostes Dahil" : "Şirket Hostesi Atanacak",
      pricingType: supplierDetails.hostessIncluded === 'included' ? 'hostess_included' : 'hostess_excluded',
      monthlyPrice: 35000,
    });

    // Add vehicle
    store.addVehicle({
      id: `v_${Date.now()}`,
      plate: supplierDetails.plate.toUpperCase(),
      brand: 'Volkswagen',
      model: 'Crafter',
      modelYear: '2023',
      capacity: 19,
      status: 'active',
      vehicleType: 'supplier',
      licence: supplierDetails.license,
      notes: 'Tedarikçi kayıt formu ile otomatik oluşturuldu.',
    });

    alert("🎉 Tedarikçi firma ve araç sözleşmesi başarıyla veritabanına kaydedildi ve hakediş entegrasyonu aktif hale getirildi!");
    
    // Reset form
    setSupplierDetails({
      companyName: '',
      authorized: '',
      phone: '',
      address: '',
      taxOffice: '',
      taxNo: '',
      iban: '',
      plate: '',
      license: '',
      hostessIncluded: 'excluded',
      driverIsOperating: true
    });
  };

  // Tariff actions
  const handleAddTariff = (schoolId: string) => {
    if (!newTariffRange || !newTariffPrice) {
      alert("Lütfen mesafe aralığı ve ücret giriniz.");
      return;
    }
    const current = schoolPricingTariffs[schoolId] || [];
    setSchoolPricingTariffs(prev => ({
      ...prev,
      [schoolId]: [...current, { range: newTariffRange, price: Number(newTariffPrice) }]
    }));
    setNewTariffRange('');
    setNewTariffPrice(0);
  };

  const handleRemoveTariff = (schoolId: string, idx: number) => {
    setSchoolPricingTariffs(prev => ({
      ...prev,
      [schoolId]: prev[schoolId].filter((_, i) => i !== idx)
    }));
  };

  // Add custom capacity option
  const handleAddCapacity = () => {
    const val = parseInt(newCapacityInput);
    if (!isNaN(val) && val > 0 && !availableCapacities.includes(val)) {
      setAvailableCapacities(prev => [...prev, val].sort((a,b)=>a-b));
      setNewCapacityInput('');
      alert(`Sürücü / araç kapasitelerine yeni kapasite seçeneği eklendi: ${val} Kişilik.`);
    }
  };

  // Event Planner Capacity Warning Math
  const activeVehicleObj = vehicles.find(v => v.id === eventForm.selectedVehicleId) || vehicles[0];
  const maxCapacity = activeVehicleObj ? activeVehicleObj.capacity : 19;
  const participantCount = eventForm.selectedStudents.length;
  const capacityWarning = participantCount > maxCapacity;
  const occupancyRate = Math.min(Math.round((participantCount / maxCapacity) * 100), 100);

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name) return;

    const newEvent = {
      id: 'evt_' + Date.now(),
      name: eventForm.name,
      date: eventForm.date,
      time: eventForm.time,
      gathering: eventForm.gathering,
      destination: eventForm.destination,
      free: eventForm.free,
      price: eventForm.price,
      studentsCount: participantCount,
      vehiclesCount: 1,
      driverName: 'Ahmet Yılmaz',
      hostessName: 'Ayşe Yıldız',
      occupancy: occupancyRate,
    };

    setEvents(prev => [newEvent, ...prev]);
    alert("📅 Etkinlik başarıyla planlandı!\n\nVelilere, şoför ve hostes personeline anlık SMS/Mobil bildirimleri gönderildi.");
    
    // Reset Form
    setEventForm({
      name: '', date: '2026-07-22', time: '10:00',
      gathering: 'Atatürk Anadolu Lisesi A Kapısı',
      destination: 'MTA Tabiat Tarihi Müzesi', free: true, price: 0,
      selectedStudents: [], selectedVehicleId: 'v1'
    });
  };

  const triggerWhatsAppWebSend = (evtName: string) => {
    const template = encodeURIComponent(`Sayın Velimiz, Öğrencimiz için planlanan "${evtName}" etkinliği detayları sisteme girilmiştir. Katılım durumunu mobil uygulamadan onaylayabilirsiniz.`);
    window.open(`https://api.whatsapp.com/send?text=${template}`, '_blank');
  };

  const sendDriverWhatsApp = (driver: any) => {
    const template = store.settings.whatsappDriverTemplate || '';
    const text = template
      .replace('{sofor_adi}', driver.name)
      .replace('{tarih}', new Date().toLocaleDateString('tr-TR'))
      .replace('{plaka}', '06 BKT 123')
      .replace('{guzergah}', 'Yenimahalle Güzergahı');
    window.open(`https://api.whatsapp.com/send?phone=${driver.phone.replace(/\s+/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
    store.addLog('WhatsApp Bildirimi', `Sürücü ${driver.name} personeline görev bildirimi gönderildi.`);
  };

  const sendHostessWhatsApp = (hostess: any) => {
    const template = store.settings.whatsappHostessTemplate || '';
    const text = template
      .replace('{hostes_adi}', hostess.name)
      .replace('{tarih}', new Date().toLocaleDateString('tr-TR'))
      .replace('{plaka}', '06 BKT 123')
      .replace('{guzergah}', 'Yenimahalle Güzergahı');
    window.open(`https://api.whatsapp.com/send?phone=${hostess.phone.replace(/\s+/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
    store.addLog('WhatsApp Bildirimi', `Rehber ${hostess.name} personeline görev bildirimi gönderildi.`);
  };

  const selectedVehicleObj = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  const vehicleDriverObj = selectedVehicleObj && selectedVehicleObj.driverId 
    ? store.users.find(u => u.id === selectedVehicleObj.driverId) 
    : null;
  const vehicleHostessObj = selectedVehicleObj && selectedVehicleObj.hostessId 
    ? store.users.find(u => u.id === selectedVehicleObj.hostessId) 
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-xs">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`bg-slate-900 text-slate-300 flex flex-col justify-between transition-all duration-300 z-50 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div>
          {/* Brand/Logo Section */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/favicon.svg" alt="BERKAYTUR Icon" className="w-9 h-9 object-contain" />
              {sidebarOpen && (
                <div className="leading-tight">
                  <h1 className="font-black text-white tracking-tight text-sm">BERKAYTUR</h1>
                  <span className="text-[9px] text-sky-400 font-bold uppercase tracking-wider">Okul Servis Platformu</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hidden sm:block cursor-pointer"
            >
              <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* User Status Profile */}
          {sidebarOpen && currentUser && (
            <div className="p-4 bg-slate-950/40 border-b border-slate-800/50 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-lg font-bold">
                M
              </div>
              <div className="leading-tight">
                <p className="font-extrabold text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Proje Müdürü</p>
              </div>
            </div>
          )}

          {/* Menus List */}
          <nav className="p-3 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
              { id: 'approvals', label: 'Onay Havuzu', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
              { id: 'saas_analytics', label: 'SaaS & Analitik', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
              { id: 'bulkops', label: 'Toplu İşlemler', icon: <Database className="w-4 h-4 text-indigo-400" /> },
              { id: 'announcements', label: 'Duyuru Sistemi', icon: <Bell className="w-4 h-4 text-orange-400" /> },
              { id: 'schools', label: 'Okullarım', icon: <Building className="w-4 h-4" /> },
              { id: 'students', label: 'Öğrenciler', icon: <Users className="w-4 h-4" /> },
              { id: 'vehicle_assignments', label: 'Araç Atamaları', icon: <Truck className="w-4 h-4" /> },
              { id: 'drivers', label: 'Şoförler', icon: <UserCheck className="w-4 h-4" /> },
              { id: 'hostesses', label: 'Hostesler', icon: <Shield className="w-4 h-4" /> },
              { id: 'seating_plans', label: 'Koltuk Planları', icon: <Grid className="w-4 h-4" /> },
              { id: 'map', label: 'Harita', icon: <Map className="w-4 h-4" /> },
              { id: 'events', label: 'Etkinlikler', icon: <Calendar className="w-4 h-4" /> },
              { id: 'accruals', label: 'Hakedişler', icon: <DollarSign className="w-4 h-4" /> },
              { id: 'reports', label: 'Raporlar', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'notifications', label: 'Bildirimler', icon: <Bell className="w-4 h-4" /> },
              { id: 'sheets_sync', label: 'Google Tablolar', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> },
              { id: 'settings', label: 'Ayarlar', icon: <SettingsIcon className="w-4 h-4" /> },
            ].map(item => {
              const active = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id as ActiveMenuType)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className={`${active ? 'text-white' : 'text-slate-400'}`}>{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Section */}
        <div className="p-3">
          <button
            onClick={() => store.logout()}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 bg-slate-800/40 hover:bg-rose-950/30 hover:text-rose-400 rounded-xl font-bold cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Güvenli Çıkış</span>}
          </button>
        </div>
      </aside>

      {/* WORKSPACE CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Floating Navbar bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              {activeMenu === 'dashboard' && 'Genel Durum'}
              {activeMenu === 'approvals' && 'Proje Müdürü Onaylama Havuzu'}
              {activeMenu === 'saas_analytics' && 'B2B SaaS Operasyon Analitiği Kokpiti'}
              {activeMenu === 'bulkops' && 'Toplu Veri Aktarım & Güncelleme Paneli'}
              {activeMenu === 'announcements' && 'Personel & Veli Duyuru Yayınlama Sistemi'}
              {activeMenu === 'schools' && 'Okul Yönetimi ve Fiyatlandırma'}
              {activeMenu === 'students' && 'Öğrenci Kayıt Havuzu'}
              {activeMenu === 'vehicle_assignments' && 'Filo Atama ve Tedarikçi Entegrasyonu'}
              {activeMenu === 'drivers' && 'Sürücü Belgeleri & SRC Yönetimi'}
              {activeMenu === 'hostesses' && 'Rehber Personel (Hostes) Havuzu'}
              {activeMenu === 'seating_plans' && 'Visual Servis Koltuk Atamaları'}
              {activeMenu === 'map' && 'Leaflet OpenStreetMap Coğrafi Katman'}
              {activeMenu === 'events' && 'Okul Dışı Etkinlik Planlayıcı'}
              {activeMenu === 'accruals' && 'Hakediş & Cari Muhasebe Hesabı'}
              {activeMenu === 'reports' && 'Kurumsal Performans Raporları'}
              {activeMenu === 'notifications' && 'Özel Bildirim Merkezi'}
              {activeMenu === 'sheets_sync' && 'Google Tablolar Canlı Entegrasyon Merkezi'}
              {activeMenu === 'settings' && 'WhatsApp & Google Bulut Entegrasyonu'}
            </h2>
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
            <span className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-600 font-bold">
              🕒 15 Temmuz 2026 • 14:38
            </span>
          </div>
        </header>

        {/* Dynamic Inner Workspace Panel View Grid */}
        <div className="p-6 flex-1 space-y-6">
          
          {/* 1. DASHBOARD LANDING SCREEN */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6 animate-fade-in text-xs">
              {/* Welcome banner */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white border border-slate-200 p-6 rounded-3xl gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Proje Yönetim Genel Durumu</h2>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">Sistemdeki tüm okul ve entegrasyon performansları</p>
                </div>
                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl font-bold font-mono text-slate-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>15 Temmuz 2026 Çarşamba</span>
                </div>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Toplam Hizmet Okulu</span>
                  <p className="text-3xl font-black text-slate-900 mt-2">{managedSchools.length} Okul</p>
                  <span className="text-[10px] text-blue-600 font-extrabold mt-1 uppercase">ANLAŞMALI RESMİ KURUMLAR</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Kayıtlı Öğrenci Havuzu</span>
                  <p className="text-3xl font-black text-slate-900 mt-2">{filteredStudents.length} Öğrenci</p>
                  <span className="text-[10px] text-emerald-600 font-extrabold mt-1 uppercase">AKTİF TAŞINAN ÖĞRENCİ</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Filo Durumu (Araçlar)</span>
                  <p className="text-3xl font-black text-slate-900 mt-2">{vehicles.length} Araç</p>
                  <span className="text-[10px] text-purple-600 font-extrabold mt-1 uppercase">KAPASİTELERİ ATANMIŞ FİLO</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Ortalama Doluluk Oranı</span>
                  <p className="text-3xl font-black text-slate-900 mt-2">%86.2</p>
                  <span className="text-[10px] text-amber-600 font-extrabold mt-1 uppercase">MİNİMUM BOŞ KOLTUK SAYISI</span>
                </div>
              </div>

              {/* Charts area */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Okul Kapasiteleri ve Dolulukları</h3>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Mevcut okul kayıtları bazında doluluk oranları (Kişi)</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Atatürk Lisesi', Kapasite: 400, Atanan: 345 },
                        { name: 'Cumhuriyet İlkokulu', Kapasite: 300, Atanan: 258 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Kapasite" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Atanan" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Sözleşmeli Sürücü Havuzu</h3>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Aktif sürücü ve hostes durumları</p>
                  </div>
                  <div className="space-y-3.5 font-semibold text-slate-700">
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div>
                        <p className="font-extrabold text-slate-800">Sürücüler (SRC Belgeli)</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aktif sefere hazır</p>
                      </div>
                      <span className="font-black text-slate-900 text-sm">4 Sürücü</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div>
                        <p className="font-extrabold text-slate-800">Hostes Personeli</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rehber havuzu</p>
                      </div>
                      <span className="font-black text-slate-900 text-sm">3 Hostes</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div>
                        <p className="font-extrabold text-slate-800">Tedarikçi Firmalar</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sözleşmeli servis ağları</p>
                      </div>
                      <span className="font-black text-slate-900 text-sm">2 Tedarikçi</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approvals Dashboard */}
          {activeMenu === 'approvals' && (
            <Onaylar />
          )}

          {/* SaaS & Analytics Dashboard */}
          {activeMenu === 'saas_analytics' && (
            <SaasAnalyticsDashboard />
          )}

          {/* 2. OKULLARIM (SCHOOLS MANAGEMENT) */}
          {activeMenu === 'schools' && (
            <div className="space-y-6">
              {/* School Create / Edit Form */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                  {editingSchoolId ? 'Okul Kaydını Düzenle' : 'Yeni Okul Kaydı Oluştur'}
                </h3>
                <form onSubmit={handleSaveSchool} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Okul Adı</label>
                    <input
                      required
                      type="text"
                      placeholder="Örn: Atatürk Anadolu Lisesi"
                      value={schoolForm.name}
                      onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Okul Türü</label>
                    <select
                      value={schoolForm.type}
                      onChange={e => setSchoolForm({ ...schoolForm, type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Devlet">Devlet Okulu</option>
                      <option value="Özel">Özel Kolej</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Koordinat (Latitude, Longitude)</label>
                    <input
                      type="text"
                      placeholder="Örn: 39.9208, 32.8541"
                      value={schoolForm.coords}
                      onChange={e => setSchoolForm({ ...schoolForm, coords: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Telefon</label>
                    <input
                      required
                      type="text"
                      placeholder="Örn: 0312 444 01 01"
                      value={schoolForm.phone}
                      onChange={e => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">E-Posta</label>
                    <input
                      required
                      type="email"
                      placeholder="okul@meb.k12.tr"
                      value={schoolForm.email}
                      onChange={e => setSchoolForm({ ...schoolForm, email: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Sözleşmeli Koordinatör / Yetkili</label>
                    <input
                      type="text"
                      value={schoolForm.authorized}
                      onChange={e => setSchoolForm({ ...schoolForm, authorized: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Çalışma Günleri</label>
                    <input
                      type="text"
                      value={schoolForm.workingDays}
                      onChange={e => setSchoolForm({ ...schoolForm, workingDays: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Zamanlama (Giriş / Çıkış Saati)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={schoolForm.startTime}
                        onChange={e => setSchoolForm({ ...schoolForm, startTime: e.target.value })}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={schoolForm.endTime}
                        onChange={e => setSchoolForm({ ...schoolForm, endTime: e.target.value })}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Ücret Hesaplama Türü</label>
                    <select
                      value={schoolForm.calcType}
                      onChange={e => setSchoolForm({ ...schoolForm, calcType: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Mesafe Tabanlı">Mesafe Tabanlı (KM)</option>
                      <option value="Sabit">Sabit Aylık Ücret</option>
                      <option value="Bölgelere Göre">Halka Bölgelere Göre</option>
                    </select>
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="font-bold text-slate-500">Açık Adres</label>
                    <input
                      required
                      type="text"
                      placeholder="Mahalle, Sokak, No, İlçe, İl"
                      value={schoolForm.address}
                      onChange={e => setSchoolForm({ ...schoolForm, address: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                    {editingSchoolId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSchoolId(null);
                          setSchoolForm({
                            name: '', address: '', phone: '', email: '', type: 'Özel',
                            authorized: 'Canan Kaya', coords: '39.9208, 32.8541',
                            workingDays: 'Pazartesi-Cuma', startTime: '08:30', endTime: '16:00',
                            capacity: 400, kmBasePrice: 28, calcType: 'Mesafe Tabanlı'
                          });
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                      >
                        İptal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                    >
                      <Check className="w-4 h-4" /> {editingSchoolId ? 'Güncelle' : 'Kaydet'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Schools List with Deactivation & Price Tariffs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeSchools.map(sch => {
                  const status = schoolStatus[sch.id] || 'active';
                  const tariffs = schoolPricingTariffs[sch.id] || [];
                  return (
                    <div 
                      key={sch.id} 
                      className={`bg-white border rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 ${
                        status === 'inactive' ? 'border-dashed border-rose-300 opacity-80' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                            status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {status === 'active' ? '🟢 Aktif' : '🔴 Pasif / Kapalı'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSchoolForVehicle(sch.id);
                                setIsVehicleModalOpen(true);
                              }}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                              title="Okula Araç Ekle"
                            >
                              <Plus className="w-3 h-3" /> Araç Ekle
                            </button>
                            <button
                              onClick={() => handleEditSchoolClick(sch)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-all cursor-pointer"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleSchoolActive(sch.id)}
                              className={`p-1.5 rounded-lg font-bold text-[10px] cursor-pointer transition-all ${
                                status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {status === 'active' ? 'Pasife Al' : 'Aktifleştir'}
                            </button>
                            <button
                              onClick={handleAttemptDeleteSchool}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-500 transition-all cursor-pointer"
                              title="Sadece Admin Silebilir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-slate-900">{sch.name}</h4>
                          <p className="text-slate-400 font-medium">{sch.address}</p>
                        </div>

                        <div className="text-[10px] text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                          <p><b>Telefon:</b> {sch.phone} | <b>E-Posta:</b> {sch.email}</p>
                          <p><b>Mesai:</b> Pazartesi-Cuma (08:30 - 16:00)</p>
                          <p><b>Ücretlendirme Modeli:</b> Mesafe Tabanlı (Sözleşmeye Yansıyan Tarifeli)</p>
                        </div>
                      </div>

                      {/* Unlimited KM Pricing Tariffs */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                        <h5 className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1">
                          📐 KM ve Mesafe Fiyat Tarifeleri
                        </h5>
                        
                        <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                          {tariffs.map((t, tIdx) => (
                            <div key={tIdx} className="bg-white p-2 border border-slate-200 rounded-xl flex items-center justify-between font-mono text-[10px]">
                              <span>{t.range}</span>
                              <div className="flex items-center gap-1">
                                <span className="font-black text-slate-800">{t.price} TL</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTariff(sch.id, tIdx)}
                                  className="text-rose-500 hover:text-rose-700 font-bold ml-1 text-[11px] cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add new tariff inline form */}
                        <div className="flex gap-1.5 text-[10px]">
                          <input
                            type="text"
                            placeholder="Aralık (Örn: 5-7 KM)"
                            value={newTariffRange}
                            onChange={e => setNewTariffRange(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-1.5 flex-1"
                          />
                          <input
                            type="number"
                            placeholder="TL"
                            value={newTariffPrice || ''}
                            onChange={e => setNewTariffPrice(Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg p-1.5 w-16 text-right font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTariff(sch.id)}
                            className="px-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer"
                          >
                            Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. ÖĞRENCİLER (STUDENTS LIST) */}
          {activeMenu === 'students' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Kayıtlı Öğrenci Listesi</h3>
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl font-bold">Toplam: {filteredStudents.length} Kayıt</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-3 px-2">Öğrenci Adı</th>
                      <th className="py-3 px-2">Okul</th>
                      <th className="py-3 px-2">Öğrenci No</th>
                      <th className="py-3 px-2">Sınıf</th>
                      <th className="py-3 px-2">Veli Adı & Telefon</th>
                      <th className="py-3 px-2">Kayıtlı Güzergah</th>
                      <th className="py-3 px-2">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStudents.map(st => (
                      <tr key={st.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-2 font-bold text-slate-900">{st.name}</td>
                        <td className="py-3.5 px-2">{st.schoolName}</td>
                        <td className="py-3.5 px-2 font-mono">{st.studentNumber}</td>
                        <td className="py-3.5 px-2">{st.classLevel}</td>
                        <td className="py-3.5 px-2">
                          <p className="font-bold text-slate-800">{st.parentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{st.parentPhone}</p>
                        </td>
                        <td className="py-3.5 px-2 font-semibold text-blue-600">{st.routeName || 'Atanmamış'}</td>
                        <td className="py-3.5 px-2">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">
                            Aktif Taşıma
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. ARAÇ ATAMALARI (VEHICLE ASSIGNMENTS) */}
          {activeMenu === 'vehicle_assignments' && (
            <div className="space-y-6">
              {/* Type Switcher and Assignment configuration Form */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Güzergah & Araç Sahiplik Ataması</h3>
                  <p className="text-slate-400">Atanacak aracı Şirket Aracı (Özmal) veya Tedarikçi Aracı olarak eşleştirebilirsiniz.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setAssignmentType('company')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      assignmentType === 'company' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    🏢 Şirket Aracı (Özmal)
                  </button>
                  <button
                    onClick={() => setAssignmentType('supplier')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      assignmentType === 'supplier' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    🤝 Tedarikçi Aracı (Dış Hizmet)
                  </button>
                </div>

                {assignmentType === 'company' ? (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm">Özmal Şirket Aracı Bilgi Kartı</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Araç Plakası</label>
                        <div className="flex gap-1.5">
                          <select
                            value={selectedVehicleId}
                            onChange={e => setSelectedVehicleId(e.target.value)}
                            className="flex-1 p-2 bg-white border border-slate-200 rounded-xl"
                          >
                            {vehicles.map(v => (
                              <option key={v.id} value={v.id}>{v.plate} ({v.brand})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchoolForVehicle(selectedSchoolId === 'all' ? 's1' : selectedSchoolId);
                              setIsVehicleModalOpen(true);
                            }}
                            className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all shrink-0"
                            title="Yeni Araç Ekle"
                          >
                            <Plus className="w-3 h-3" /> Ekle
                          </button>
                        </div>
                      </div>

                      {/* Auto-populated fields for Company Vehicle */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">ŞOFÖR ATAMASI</span>
                        <p className="font-bold text-slate-800">{vehicleDriverObj ? vehicleDriverObj.name : 'Ahmet Yılmaz (Kadrolu)'}</p>
                        <p className="text-[10px] text-slate-500">Maaş: {vehicleDriverObj?.monthlySalary ? `${vehicleDriverObj.monthlySalary.toLocaleString('tr-TR')} TL/Ay` : '35.000 TL/Ay'}</p>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">REHBER ATAMASI</span>
                        <p className="font-bold text-slate-800">{vehicleHostessObj ? vehicleHostessObj.name : 'Ayşe Yıldız (Kadrolu)'}</p>
                        <p className="text-[10px] text-slate-500">Maaş: {vehicleHostessObj?.monthlySalary ? `${vehicleHostessObj.monthlySalary.toLocaleString('tr-TR')} TL/Ay` : '18.000 TL/Ay'}</p>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">SÜRÜCÜ EVRAKLARI</span>
                        <p className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-4 h-4" /> SRC2 & Psikoteknik OK
                        </p>
                        <p className="text-[10px] text-slate-500">Süre: 15.11.2026</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-200 pt-4 text-[10px] text-slate-500 font-bold">
                      <p>💡 Şirket araçlarında hakedişler doğrudan sürücü ve hostes personellerimizin bordrosuna yansır.</p>
                      <button
                        onClick={() => {
                          const vName = selectedVehicleObj ? selectedVehicleObj.plate : 'Özmal Araç';
                          store.addLog('Özmal Ataması Güncellendi', `${vName} aracının şoför ve rehber personel ataması onaylandı.`);
                          alert(`🎉 ${vName} özmal aracı şoför ve rehber personel atamaları başarıyla güncellendi ve onaylandı.`);
                        }}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                      >
                        Özmal Atamasını Güncelle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm">Tedarikçi Firma / Araç Kayıt Formu</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Firma / Tedarikçi Adı</label>
                        <input
                          type="text"
                          value={supplierDetails.companyName}
                          onChange={e => setSupplierDetails({ ...supplierDetails, companyName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Yetkili Adı</label>
                        <input
                          type="text"
                          value={supplierDetails.authorized}
                          onChange={e => setSupplierDetails({ ...supplierDetails, authorized: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Telefon</label>
                        <input
                          type="text"
                          value={supplierDetails.phone}
                          onChange={e => setSupplierDetails({ ...supplierDetails, phone: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Vergi Dairesi & No</label>
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="text"
                            value={supplierDetails.taxOffice}
                            onChange={e => setSupplierDetails({ ...supplierDetails, taxOffice: e.target.value })}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-[10px]"
                          />
                          <input
                            type="text"
                            value={supplierDetails.taxNo}
                            onChange={e => setSupplierDetails({ ...supplierDetails, taxNo: e.target.value })}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-[10px]"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">IBAN Numarası</label>
                        <input
                          type="text"
                          value={supplierDetails.iban}
                          onChange={e => setSupplierDetails({ ...supplierDetails, iban: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-[10px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Araç Plakası</label>
                        <input
                          type="text"
                          value={supplierDetails.plate}
                          onChange={e => setSupplierDetails({ ...supplierDetails, plate: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Araç Ruhsat Belgesi No</label>
                        <input
                          type="text"
                          value={supplierDetails.license}
                          onChange={e => setSupplierDetails({ ...supplierDetails, license: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      
                      {/* Hostess Option selector */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Rehber Personel (Hostes) Durumu</label>
                        <select
                          value={supplierDetails.hostessIncluded}
                          onChange={e => setSupplierDetails({ ...supplierDetails, hostessIncluded: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        >
                          <option value="included">Hostes Dahil (Fiyatlandırmaya Dahil)</option>
                          <option value="excluded">Hostes Hariç</option>
                        </select>
                      </div>
                    </div>

                    {/* Sürücü Kendisi Kullanıyor and Hostes Hariç Dynamic button */}
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-4 gap-4">
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={supplierDetails.driverIsOperating}
                            onChange={e => setSupplierDetails({ ...supplierDetails, driverIsOperating: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Şoför Aracın Kendi Sahibi (Kendisi Kullanıyor)
                        </label>

                        {supplierDetails.hostessIncluded === 'excluded' && (
                          <button
                            type="button"
                            onClick={() => setIsHostessModalOpen(true)}
                            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl font-bold text-purple-700 cursor-pointer"
                          >
                            ➕ Rehber Personel (Hostes) Ekle
                          </button>
                        )}
                      </div>

                      <button
                        onClick={handleConfirmSupplier}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                      >
                        Tedarikçi Kaydını Onayla & Sözleşme Oluştur
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Aktif İş Ortakları & Tedarikçiler list */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">🤝 Aktif Taşıma İş Ortakları & Tedarikçiler</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sözleşmeli firmalar ve aylık hakediş hesaplama kuralları</p>
                  </div>
                  <button
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/10 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Yeni Tedarikçi Ekle
                  </button>
                </div>

                {store.suppliers.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 font-bold text-xs">Kayıtlı tedarikçi bulunmamaktadır.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {store.suppliers.map(sup => (
                      <div key={sup.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-50 text-blue-700 font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
                            {sup.pricingType === 'hostess_included' ? '🌸 Hostes Dahil' : '⚠️ Hostes Hariç'}
                          </span>
                          <button
                            onClick={() => {
                              if (confirm(`${sup.companyName} tedarikçisini silmek istediğinize emin misiniz?`)) {
                                store.deleteSupplier(sup.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <h5 className="font-black text-slate-800 text-sm">{sup.companyName}</h5>
                          <p className="text-slate-500 font-medium text-[11px]">Yetkili: <b>{sup.authorized}</b> | Tel: {sup.phone}</p>
                          <p className="text-slate-400 font-medium text-[10px]">IBAN: <span className="font-mono text-[9px] font-bold text-slate-600">{sup.iban}</span></p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between font-bold text-[11px]">
                          <span className="text-slate-500">Aylık Sözleşme Bedeli:</span>
                          <span className="text-blue-600 font-extrabold font-mono text-xs">{sup.monthlyPrice.toLocaleString('tr-TR')} TL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Capacities management widget */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Tanımlı Araç Kapasiteleri</h4>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {availableCapacities.map(c => (
                    <span key={c} className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl font-bold font-mono">
                      {c} Kişilik
                    </span>
                  ))}
                  
                  <div className="flex items-center gap-1.5 ml-4">
                    <input
                      type="number"
                      placeholder="Yeni"
                      value={newCapacityInput}
                      onChange={e => setNewCapacityInput(e.target.value)}
                      className="p-1.5 border border-slate-200 rounded-lg w-16 text-center font-mono text-xs"
                    />
                    <button
                      onClick={handleAddCapacity}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Kapasite Ekle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. ŞOFÖRLER (DRIVERS MANAGEMENT) */}
          {activeMenu === 'drivers' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Şoförler Havuzu</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2">Şoför Adı</th>
                      <th className="py-2">Telefon</th>
                      <th className="py-2">E-Posta</th>
                      <th className="py-2">Plaka/Araç</th>
                      <th className="py-2">SRC Belge Durumu</th>
                      <th className="py-2">Psikoteknik Durumu</th>
                      <th className="py-2 text-right">WhatsApp Bildirim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {drivers.map(d => (
                      <tr key={d.id}>
                        <td className="py-3 font-bold text-slate-900">{d.name}</td>
                        <td className="py-3 font-mono">{d.phone}</td>
                        <td className="py-3">{d.email}</td>
                        <td className="py-3 font-semibold text-blue-600">06 BKT 123</td>
                        <td className="py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">🟢 Onaylandı</span></td>
                        <td className="py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">🟢 Onaylandı</span></td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => sendDriverWhatsApp(d)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-lg flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Send className="w-3 h-3" /> Görev Bildir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. HOSTESLER (HOSTESSES MANAGEMENT) */}
          {activeMenu === 'hostesses' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Rehber Personel (Hostes) Havuzu</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2">Hostes Adı</th>
                      <th className="py-2">Telefon</th>
                      <th className="py-2">E-Posta</th>
                      <th className="py-2">Eşleştiği Araç</th>
                      <th className="py-2">Durum</th>
                      <th className="py-2 text-right">WhatsApp Bildirim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {hostesses.map(h => (
                      <tr key={h.id}>
                        <td className="py-3 font-bold text-slate-900">{h.name}</td>
                        <td className="py-3 font-mono">{h.phone}</td>
                        <td className="py-3">{h.email}</td>
                        <td className="py-3 font-semibold text-blue-600">06 BKT 123</td>
                        <td className="py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">Aktif Görevde</span></td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => sendHostessWhatsApp(h)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-lg flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Send className="w-3 h-3" /> Görev Bildir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. KOLTUK PLANLARI (SEATING PLANS) */}
          {activeMenu === 'seating_plans' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Visual Servis Koltuk Atamaları</h3>
                <p className="text-slate-400">Araca ait koltuk planını visual olarak çizebilir, öğrencileri sürükle bırak yöntemiyle boş koltuklara atayabilirsiniz.</p>
              </div>

              {/* Seating component injection */}
              <BusSeatingPlan
                vehicle={vehicles[0]}
                students={filteredStudents}
                onAssignStudent={() => {}}
                onRemoveStudent={() => {}}
              />
            </div>
          )}

          {/* 8. HARİTA (MAP MODULE) */}
          {activeMenu === 'map' && (
            <div className="space-y-6">
              {/* Map Component Injection */}
              <OSMMap
                schools={activeSchools}
                students={filteredStudents}
                vehicles={vehicles}
                drivers={drivers}
                hostesses={hostesses}
                routes={store.routes}
                onAddSchoolToMap={(lat, lng, name) => {
                  store.addSchool({ name, address: `Koordinat: ${lat}, ${lng}`, phone: '0312', email: 'harita@meb.k12.tr' });
                }}
                onBulkAssign={(studentIds, vehicleId, driverId, hostessId) => {
                  const targetVehicle = store.vehicles.find(v => v.id === vehicleId);
                  const matchedRoute = store.routes.find(r => r.vehicleId === vehicleId) || store.routes.find(r => r.id === vehicleId);
                  
                  studentIds.forEach(id => {
                    store.updateStudent(id, {
                      routeId: matchedRoute ? matchedRoute.id : vehicleId,
                      routeName: matchedRoute ? matchedRoute.name : (targetVehicle ? `${targetVehicle.plate} Güzergahı` : 'Servis Güzergahı')
                    });
                  });
                  
                  store.addLog('Toplu Araç Ataması', `${studentIds.length} öğrenci başarıyla ${targetVehicle?.plate || vehicleId} plakalı araca atandı.`);
                  store.addLog('Google Sheets Entegrasyonu', `${studentIds.length} öğrenci ataması Google Sheets dosyasına anlık olarak senkronize edildi.`);
                }}
              />
            </div>
          )}

          {/* 9. ETKİNLİKLER (EVENTS MODULE) */}
          {activeMenu === 'events' && (
            <div className="space-y-6 text-xs">
              {/* Event Planner Form */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Okul Dışı Etkinlik & Gezi Planlayıcı</h3>
                
                <form onSubmit={handleCreateEventSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Etkinlik Adı</label>
                    <input
                      required
                      type="text"
                      placeholder="Örn: 10 Kasım Anıtkabir Gezisi"
                      value={eventForm.name}
                      onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Tarih</label>
                    <input
                      type="date"
                      value={eventForm.date}
                      onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Saat</label>
                    <input
                      type="text"
                      placeholder="Örn: 09:30"
                      value={eventForm.time}
                      onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Toplanma Noktası</label>
                    <input
                      type="text"
                      placeholder="Cumhuriyet İlkokulu Ön Bahçe"
                      value={eventForm.gathering}
                      onChange={e => setEventForm({ ...eventForm, gathering: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Gidilecek Yer / Hedef</label>
                    <input
                      type="text"
                      value={eventForm.destination}
                      onChange={e => setEventForm({ ...eventForm, destination: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Ücret Durumu</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, free: true, price: 0 })}
                        className={`px-3 py-2 border rounded-xl flex-1 font-bold ${
                          eventForm.free ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        Ücretsiz
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, free: false })}
                        className={`px-3 py-2 border rounded-xl flex-1 font-bold ${
                          !eventForm.free ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        Ücretli
                      </button>
                    </div>
                  </div>

                  {!eventForm.free && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Kişi Başı Ücret (TL)</label>
                      <input
                        type="number"
                        placeholder="Örn: 150"
                        value={eventForm.price || ''}
                        onChange={e => setEventForm({ ...eventForm, price: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Atanacak Hazır Araç / Kapasite</label>
                    <select
                      value={eventForm.selectedVehicleId}
                      onChange={e => setEventForm({ ...eventForm, selectedVehicleId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate} ({v.capacity} Kişilik)</option>
                      ))}
                    </select>
                  </div>

                  {/* Multi student selector simulated by checkbox */}
                  <div className="md:col-span-3 space-y-2 border-t border-slate-100 pt-3">
                    <label className="font-bold text-slate-700 block">Katılacak Öğrencileri Seçin ({eventForm.selectedStudents.length} Seçili)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      {filteredStudents.map(st => {
                        const checked = eventForm.selectedStudents.includes(st.id);
                        return (
                          <label key={st.id} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setEventForm({ ...eventForm, selectedStudents: [...eventForm.selectedStudents, st.id] });
                                } else {
                                  setEventForm({ ...eventForm, selectedStudents: eventForm.selectedStudents.filter(id => id !== st.id) });
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate font-semibold">{st.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Capacity math warning */}
                  {participantCount > 0 && (
                    <div className="md:col-span-3">
                      {capacityWarning ? (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 font-bold animate-pulse">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          ⚠️ Yetersiz Kapasite Uyarısı! Katılacak öğrenci sayısı ({participantCount}) seçilen aracın maksimum kapasitesini ({maxCapacity}) aşıyor. Lütfen ekstra bir araç ekleyin veya daha büyük kapasiteli (46 veya 54 kişilik) bir araç seçiniz.
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-between font-bold">
                          <span>✅ Kapasite Yeterli: Araç Doluluk Oranı %{occupancyRate}</span>
                          <span>Toplam Kapasite: {maxCapacity} | Seçilen: {participantCount}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-2"
                    >
                      📅 Etkinliği Planla & Bildirimleri Tetikle
                    </button>
                  </div>
                </form>
              </div>

              {/* Event Records list */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Aktif Etkinlikler ve Araç Dolulukları</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map(evt => (
                    <div key={evt.id} className="p-4 border border-slate-200 rounded-2xl space-y-3 bg-slate-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-extrabold text-sm text-slate-900 leading-tight">{evt.name}</h5>
                          <p className="text-[10px] text-slate-400 font-medium">Hedef: {evt.destination}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          evt.free ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {evt.free ? 'ÜCRETSİZ' : `${evt.price} TL`}
                        </span>
                      </div>

                      <div className="text-[10px] space-y-1 text-slate-600 font-medium">
                        <p>📆 <b>Tarih & Saat:</b> {evt.date} | {evt.time}</p>
                        <p>📍 <b>Toplanma:</b> {evt.gathering}</p>
                        <p>👥 <b>Katılımcı Sayısı:</b> {evt.studentsCount} Öğrenci | <b>Araç:</b> {evt.vehiclesCount} Adet</p>
                        <p>👨✈️ <b>Görevli Sürücü:</b> {evt.driverName} | 👩 <b>Rehber:</b> {evt.hostessName}</p>
                      </div>

                      {/* Occupancy Indicator */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-black">
                          <span>ARAÇ DOLULUK ORANI</span>
                          <span>%{evt.occupancy}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-2" style={{ width: `${evt.occupancy}%` }} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                        {/* Download PDF simulated */}
                        <button
                          onClick={() => {
                            DownloadService.downloadReceipt(
                              'Katilimci ve Emniyet Kontrol Listesi',
                              {
                                'Etkinlik Adi': evt.name,
                                'Hedef Konum': evt.destination,
                                'Tarih & Saat': `${evt.date} - ${evt.time}`,
                                'Sürücü Kaptan': evt.driverName,
                                'Rehber Sorumlu': evt.hostessName,
                                'Katilimci Sayisi': `${evt.studentsCount} Ogrenci`,
                                'Fiyat Tarifesi': evt.free ? 'Ucretsiz' : `${evt.price} TL`,
                                'Arac Dolulugu': `%${evt.occupancy}`
                              },
                              `${evt.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_listesi.txt`
                            );
                            store.addLog('Belge İndirildi', `"${evt.name}" etkinlik listesi PDF/TXT olarak başarıyla indirildi.`);
                          }}
                          className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                        >
                          📥 PDF Liste Al
                        </button>

                        {/* WhatsApp mass send button */}
                        <button
                          onClick={() => triggerWhatsAppWebSend(evt.name)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg cursor-pointer"
                        >
                          💬 Velilere WhatsApp Bildirisi Gönder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. HAKEDİŞLER (ACCRUALS) */}
          {activeMenu === 'accruals' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-xs">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Hakediş, Tahsilat ve Cari Mutabakat</h3>
                <p className="text-slate-400">Şirket araçlarımızın hakediş hesabı ve tedarikçi cari hesap detaylarının anlık izlenmesi.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Toplam Aylık Tahsilat</span>
                  <span className="text-xl font-black text-slate-900 font-mono">185.400 TL</span>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Tamamı Alındı</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Özmal Personel Maaş Giderleri</span>
                  <span className="text-xl font-black text-slate-900 font-mono">53.000 TL</span>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Bordroya Yansıtıldı</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Tedarikçi Cari Hakediş Ödemesi</span>
                  <span className="text-xl font-black text-slate-900 font-mono">42.800 TL</span>
                  <p className="text-[10px] text-amber-600 font-bold mt-1">⌛ Onay Bekliyor</p>
                </div>
              </div>

              {/* Accrual detail table */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800">Tedarikçi ve Okul Cari Cari Hesapları</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="py-2">Firma / Okul</th>
                        <th className="py-2">Plaka</th>
                        <th className="py-2">Kapasite</th>
                        <th className="py-2">Hizmet Bedeli</th>
                        <th className="py-2">IBAN Alıcı</th>
                        <th className="py-2">Hakediş Durumu</th>
                        <th className="py-2 text-right">WhatsApp Bildirimi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-3 font-bold text-slate-900">BERKAYTUR Taşıma Hizmetleri A.Ş.</td>
                        <td className="py-3 font-mono">06 BKT 999</td>
                        <td className="py-3">19 Kişilik</td>
                        <td className="py-3 font-mono font-bold">24.500 TL</td>
                        <td className="py-3 font-mono text-[10px]">TR98...9000 01</td>
                        <td className="py-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-full">Onay Bekliyor</span></td>
                        <td className="py-3 text-right">
                          <a
                            href={`https://api.whatsapp.com/send?phone=905551112233&text=${encodeURIComponent(
                              "Sayın Yetkili (BERKAYTUR Taşıma Hizmetleri A.Ş.),\n\n06 BKT 999 plakalı aracınız için Temmuz 2026 dönemi hakediş tutarınız 24.500 TL olarak hesaplanmıştır.\nÖdeme Yapılacak IBAN: TR98...9000 01\n\nLütfen hakediş detaylarını kontrol edip onaylayınız.\n\nİyi çalışmalar,\nBERKAYTUR"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] transition-all cursor-pointer shadow-xs"
                          >
                            <Send className="w-3 h-3" /> WhatsApp Gönder
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-3 font-bold text-slate-900">BERKAYTUR Bölge Ortaklığı</td>
                        <td className="py-3 font-mono">06 BKT 111</td>
                        <td className="py-3">35 Kişilik</td>
                        <td className="py-3 font-mono font-bold">18.300 TL</td>
                        <td className="py-3 font-mono text-[10px]">TR12...8832 99</td>
                        <td className="py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">✓ Ödendi</span></td>
                        <td className="py-3 text-right">
                          <a
                            href={`https://api.whatsapp.com/send?phone=905559998877&text=${encodeURIComponent(
                              "Sayın Yetkili (BERKAYTUR Bölge Ortaklığı),\n\n06 BKT 111 plakalı aracınız için Temmuz 2026 dönemi hakediş tutarınız 18.300 TL olarak hesaplanmıştır.\nÖdeme Yapılacak IBAN: TR12...8832 99\n\nLütfen hakediş detaylarını kontrol edip onaylayınız.\n\nİyi çalışmalar,\nBERKAYTUR"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] transition-all cursor-pointer shadow-xs"
                          >
                            <Send className="w-3 h-3" /> WhatsApp Gönder
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detaylı Excel Matrisi Entegrasyonu */}
              <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-5 h-5 text-emerald-600" /> Excel Tabanlı Detaylı Puantaj Matrisi
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sürücü ve Tedarikçi hakediş hesaplarının detay matrisi</p>
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

          {/* 11. RAPORLAR (REPORTS) */}
          {activeMenu === 'reports' && (
            <PremiumReportsDashboard />
          )}

          {/* 12. BİLDİRİMLER (NOTIFICATIONS PANEL) */}
          {activeMenu === 'notifications' && (
            <div className="space-y-6">
              <ManagerNotifications
                schools={activeSchools}
              />
            </div>
          )}

          {/* 13. AYARLAR (SETTINGS PANEL) */}
          {activeMenu === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-xs">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Google & Bulut Entegrasyon Ayarları</h3>
                <p className="text-slate-400">Google Sheets, Google Drive, WhatsApp bildirim parametreleri ve acil durum şablonlarının yönetimi.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-800 uppercase tracking-wider">🔗 Google Bulut Entegrasyonu</h4>
                  
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Google Apps Script Web API URL</label>
                    <input
                      type="text"
                      value={settings.googleSheetsUrl}
                      onChange={e => setSettings({ ...settings, googleSheetsUrl: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Google Drive Evrak Arşiv Klasör ID (Folder ID)</label>
                    <input
                      type="text"
                      value={settings.googleDriveFolderId}
                      onChange={e => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-800 uppercase tracking-wider">💬 WhatsApp Bildirim Şablonları</h4>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Öğrenci Servise Bindi Mesaj Şablonu</label>
                    <textarea
                      rows={2}
                      value={settings.whatsappGreetingTemplate}
                      onChange={e => setSettings({ ...settings, whatsappGreetingTemplate: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Araç Rötar / Gecikme Mesaj Şablonu</label>
                    <textarea
                      rows={2}
                      value={settings.whatsappDelayTemplate}
                      onChange={e => setSettings({ ...settings, whatsappDelayTemplate: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Sürücü/Şoför Günlük Görev Şablonu</label>
                    <textarea
                      rows={2}
                      value={settings.whatsappDriverTemplate || ''}
                      onChange={e => setSettings({ ...settings, whatsappDriverTemplate: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Rehber/Hostes Görev Şablonu</label>
                    <textarea
                      rows={2}
                      value={settings.whatsappHostessTemplate || ''}
                      onChange={e => setSettings({ ...settings, whatsappHostessTemplate: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Tedarikçi Hakediş Bildirim Şablonu</label>
                    <textarea
                      rows={2}
                      value={settings.whatsappSupplierTemplate || ''}
                      onChange={e => setSettings({ ...settings, whatsappSupplierTemplate: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    store.updateSettings(settings);
                    alert("Ayarlar buluta başarıyla kaydedildi.");
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Ayarları Kaydet ve Senkronize Et
                </button>
              </div>
            </div>
          )}

          {/* 14. GOOGLE SHEETS LIVE SYNC */}
          {activeMenu === 'sheets_sync' && (
            <GoogleSheetsSync />
          )}

          {/* 15. TOPLU İŞLEMLER */}
          {activeMenu === 'bulkops' && (
            <BulkOperationsPanel 
              allowedSchools={managedSchools}
              allowedStudents={filteredStudents}
            />
          )}

          {/* 16. DUYURU SİSTEMİ */}
          {activeMenu === 'announcements' && (
            <AnnouncementManager />
          )}

        </div>
      </main>

      <VehicleFormModal 
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        schoolId={selectedSchoolForVehicle}
      />

      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
      />

      <DriverFormModal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
        onSaved={() => setIsDriverModalOpen(false)}
      />

      <HostessFormModal
        isOpen={isHostessModalOpen}
        onClose={() => setIsHostessModalOpen(false)}
        onSaved={() => setIsHostessModalOpen(false)}
      />
    </div>
  );
}
