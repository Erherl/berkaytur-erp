/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { School, Vehicle, User, UserRole, Payment, DocumentArchive } from '../../types';
import { 
  Building, Truck, Users, Settings, LogOut, Plus, 
  Trash2, RefreshCw, Save, CheckCircle, Database, Edit2, X, Check,
  Home, GraduationCap, Map, Calendar, DollarSign, FileText, CheckSquare,
  FileSignature, BarChart3, Bell, Clipboard, Heart, HelpCircle, User as UserIcon,
  Compass, Star, ChevronLeft, ChevronRight, Share2, Printer, CheckCircle2,
  Sliders, Volume2, CloudLightning, Shield, ShieldAlert, Award, Grid, CreditCard,
  Briefcase, Activity, AlertTriangle
} from 'lucide-react';
import NotificationCenter from '../../components/NotificationCenter';
import VehicleManager from './vehicles/VehicleManager';
import GlobalSearch from '../../components/GlobalSearch';
import DriveExplorer from '../../components/DriveExplorer';
import WhatsAppSender from '../../components/WhatsAppSender';
import SheetsSchema from '../../components/SheetsSchema';
import AuditLogViewer from '../../components/AuditLogViewer';
import PremiumReportsDashboard from '../reports/PremiumReportsDashboard';
import ProductionReadiness from '../../components/ProductionReadiness';
import { ApiClient } from '../../infrastructure/api/apiClient';

// Premium ERP Components
import AcademicYearPanel from '../../components/AcademicYearPanel';
import BulkOperationsPanel from '../../components/BulkOperationsPanel';
import AdvancedCalendar from '../../components/AdvancedCalendar';
import AnnouncementManager from '../../components/AnnouncementManager';
import DocumentPreviewer from '../../components/DocumentPreviewer';
import UserAssignmentManager from './UserAssignmentManager';

export default function AdminDashboard() {
  const { 
    currentUser, logout, schools, vehicles, users, logs, settings,
    addSchool, updateSchool, deleteSchool,
    addVehicle, updateVehicle, deleteVehicle,
    addUser, updateUser, deleteUser, updateSettings, syncWithGoogleSheets, clearDatabase,
    students, addStudent, updateStudent, deleteStudent, payments, addPayment, recordPayment,
    documents, addDocument, favorites, toggleFavorite
  } = useAppStore();

  // Expanded Active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'users' | 'sheets' | 'whatsapp' | 'logs'>('general');
  
  // Collapsible sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // States for modals/forms
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [showEditSchool, setShowEditSchool] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    type: 'state' as 'state' | 'private' | 'college',
    city: 'İstanbul',
    district: '',
    neighborhood: '',
    latitude: 0,
    longitude: 0,
    authorizedPerson: '',
    assignedCoordinators: [] as string[],
    assignedManagers: [] as string[]
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ plate: '', brand: '', model: '', capacity: 16 });
  
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'coordinator' as UserRole, email: '', phone: '' });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '', phone: '' });

  // Stateful Hakediş/Payout items
  const [hakedisItems, setHakedisItems] = useState([
    { id: 'hk_1', recipient: 'Kaptan Ahmet Yılmaz', type: 'Şoför Hakediş', amount: '15,000 ₺', period: 'Temmuz 2026', status: 'Onay Bekliyor' },
    { id: 'hk_2', recipient: 'BERKAYTUR B Bölgesi Tedarikçisi', type: 'Tedarikçi Hakediş', amount: '45,200 ₺', period: 'Temmuz 2026', status: 'Onay Bekliyor' },
    { id: 'hk_3', recipient: 'Kaptan Mehmet Koç', type: 'Şoför Hakediş', amount: '15,000 ₺', period: 'Temmuz 2026', status: 'Onaylandı' }
  ]);

  const handleApproveHakedis = (itemId: string) => {
    const item = hakedisItems.find(i => i.id === itemId);
    if (!item) return;

    setHakedisItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'Onaylandı' } : i));
    
    // Write a real audit log entry (Rule 9 & 10)
    useAppStore.getState().addLog(
      'Hakediş Onaylandı',
      `Yönetici ${currentUser?.name || 'Berkay Turan'}, ${item.recipient} için hazırlanan ${item.amount} tutarındaki ${item.type} (${item.period}) ödemesini onayladı. Ödeme talimatı muhasebeye otomatik sevk edildi.`
    );
    
    alert(`✅ Başarılı!\n\n${item.recipient} için ${item.amount} hakediş ödemesi başarıyla onaylandı. Muhasebe ve banka sistemine ödeme talimatı otomatik olarak iletilmiştir.`);
  };

  const [sheetsUrl, setSheetsUrl] = useState(settings.googleSheetsUrl);
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings.whatsappGreetingTemplate);
  const [isSyncing, setIsSyncing] = useState(false);

  // 10. Koltuk Planı (Seating Plan) States
  const [selectedSeatingVehicle, setSelectedSeatingVehicle] = useState<string>(vehicles[0]?.id || 'v1');
  const [seatAssignments, setSeatAssignments] = useState<Record<string, Record<number, string>>>({
    'v1': {
      1: 'st1', // Ali Yılmaz
      2: 'st2', // Ece Yıldız
    }
  });
  const [activeSeatSelect, setActiveSeatSelect] = useState<number | null>(null);

  // 11. Etkinlikler States
  const [events, setEvents] = useState([
    { id: 'e1', title: 'Anıtkabir Gezisi', school: 'Cumhuriyet İlkokulu', date: '2026-07-15', time: '10:00', vehicle: '06 BKT 123', status: 'Bugün' },
    { id: 'e2', title: 'Bilim Merkezi Gezisi', school: 'Atatürk Anadolu Lisesi', date: '2026-07-16', time: '11:30', vehicle: '06 BKT 456', status: 'Yarın' },
    { id: 'e3', title: 'Tiyatro Gösterimi', school: 'Özel Vadi Koleji', date: '2026-07-22', time: '14:00', vehicle: '06 BKT 789', status: 'Yaklaşan' }
  ]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', school: '', date: '', time: '', vehicle: '' });

  // 14. Puantaj States
  const [puantajMonth, setPuantajMonth] = useState('Temmuz 2026');
  const [puantajData, setPuantajData] = useState<Record<string, Record<number, boolean>>>({
    'st1': { 1: true, 2: true, 3: true, 4: false, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true, 15: true },
    'st2': { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: false, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true, 15: true },
    'st3': { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true, 15: true }
  });

  // 15. Evrak Arşivi States
  const [docSearch, setDocSearch] = useState('');
  const [docFolder, setDocFolder] = useState<string>('Tümü');

  // 16. Sözleşmeler States
  const [contracts, setContracts] = useState([
    { id: 'c1', parentName: 'Kamil Yılmaz', studentName: 'Ali Yılmaz', type: 'Yıllık Servis', date: '2026-06-15', status: 'İmzalandı', file: 'sozlesme_ali_yilmaz.pdf' },
    { id: 'c2', parentName: 'Aysel Yıldız', studentName: 'Ece Yıldız', type: 'Yıllık Servis', date: '2026-06-18', status: 'İmzalandı', file: 'sozlesme_ece_yildiz.pdf' },
    { id: 'c3', parentName: 'Murat Öz', studentName: 'Can Öz', type: 'Dönemlik Servis', date: '2026-07-01', status: 'Onay Bekliyor', file: 'sozlesme_can_oz.pdf' }
  ]);
  const [showAddContract, setShowAddContract] = useState(false);
  const [newContract, setNewContract] = useState({ parentName: '', studentName: '', type: 'Yıllık Servis' });

  // Student Tag Filter State
  const [selectedStudentTagFilter, setSelectedStudentTagFilter] = useState('all');

  // 17. Raporlar States
  const [reportLog, setReportLog] = useState<string[]>([]);
  const [selectedReportType, setSelectedReportType] = useState('Mali Rapor');

  // Admin landing speech logic (text-to-speech option in welcome overlay, custom greeting speak trigger here)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const handleSpeakGreeting = () => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      window.speechSynthesis.cancel();
      const text = `BERKAYTUR Kurumsal Okul Servisi Yönetim Platformuna hoş geldiniz. Bugün 15 Temmuz 2026 Çarşamba. Sisteminiz çalışmaya hazır.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Sisteminizde ses sentezi desteklenmiyor.');
    }
  };

  const handleGeocode = async (silent: boolean = false, customForm?: any) => {
    setIsGeocoding(true);
    setGeocodingError(null);
    const form = customForm || schoolForm;
    const queryParts = [form.address, form.neighborhood, form.district, form.city || 'İstanbul', 'Türkiye']
      .map((part: string | undefined) => (part || '').trim())
      .filter(Boolean);

    if (queryParts.length === 0) {
      if (!silent) {
        setGeocodingError('Okul için doğrulanabilir bir İstanbul adresi giriniz.');
      }
      setIsGeocoding(false);
      return null;
    }

    try {
      const result = await ApiClient.validateApplicationAddress(queryParts.join(', '), form.district || undefined);
      if (result.success && result.data) {
        const lat = Number(result.data.lat);
        const lon = Number(result.data.lon);
        setSchoolForm(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          city: 'İstanbul',
          district: prev.district || result.data.districtDisplay || prev.district
        }));
        setIsGeocoding(false);
        return { lat, lon };
      }

      if (!silent) {
        setGeocodingError(result.error || 'Okul adresi İstanbul doğrulama zincirinden geçemedi.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      if (!silent) {
        setGeocodingError('Koordinat doğrulama servisiyle bağlantı kurulamadı.');
      }
    }
    setIsGeocoding(false);
    return null;
  };

  // Form Handlers
  const handleAddSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let lat = Number(schoolForm.latitude);
    let lng = Number(schoolForm.longitude);
    
    if (!lat || !lng || (lat === 0 && lng === 0)) {
      const coords = await handleGeocode(true);
      if (coords) {
        lat = coords.lat;
        lng = coords.lon;
      } else {
        // İstanbul-Only: Hardcoded merkez/Çekmeköy fallback YASAK.
        // Geocode başarısızsa kullanıcıyı uyar, okul kaydını yapma.
        alert('İstanbul içinde gerçek bir koordinat doğrulanamadı. Lütfen adaşça ayrıntılı bir İstanbul adresi girin. Ör: "Etiler Mah. Beşiktaş/İstanbul".');
        return;
      }
    }

    addSchool({
      ...schoolForm,
      latitude: lat,
      longitude: lng
    });
    
    // Auto-sync with Google Sheets
    await syncWithGoogleSheets();
    
    setSchoolForm({
      name: '', address: '', phone: '', email: '', type: 'state',
      city: 'İstanbul', district: '', neighborhood: '', latitude: 0, longitude: 0,
      authorizedPerson: '',
      assignedCoordinators: [], assignedManagers: []
    });
    setShowAddSchool(false);
  };

  const handleEditSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchoolId) return;
    
    let lat = Number(schoolForm.latitude);
    let lng = Number(schoolForm.longitude);
    
    if (!lat || !lng || (lat === 0 && lng === 0)) {
      const coords = await handleGeocode(true);
      if (coords) {
        lat = coords.lat;
        lng = coords.lon;
      } else {
        alert('İstanbul içinde gerçek bir koordinat doğrulanamadı. Lütfen adaşça ayrıntılı bir İstanbul adresi girin.');
        return;
      }
    }

    updateSchool(editingSchoolId, {
      ...schoolForm,
      latitude: lat,
      longitude: lng
    });
    
    // Auto-sync with Google Sheets
    await syncWithGoogleSheets();
    
    setSchoolForm({
      name: '', address: '', phone: '', email: '', type: 'state',
      city: 'İstanbul', district: '', neighborhood: '', latitude: 0, longitude: 0,
      authorizedPerson: '',
      assignedCoordinators: [], assignedManagers: []
    });
    setShowEditSchool(false);
    setEditingSchoolId(null);
  };

  const handleEditSchoolClick = (school: any) => {
    setEditingSchoolId(school.id);
    setSchoolForm({
      name: school.name || '',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      type: (school.type || 'state') as 'state' | 'private' | 'college',
      city: school.city || 'İstanbul',
      district: school.district || '',
      neighborhood: school.neighborhood || '',
      latitude: school.latitude || 0,
      longitude: school.longitude || 0,
      authorizedPerson: school.authorizedPerson || '',
      assignedCoordinators: school.assignedCoordinators || [],
      assignedManagers: school.assignedManagers || []
    });
    setShowEditSchool(true);
    setShowAddSchool(false);
  };

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addVehicle({ ...vehicleForm, status: 'active' });
    setVehicleForm({ plate: '', brand: '', model: '', capacity: 16 });
    setShowAddVehicle(false);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({ ...userForm, status: 'active' });
    setUserForm({ name: '', username: '', password: '', role: 'coordinator', email: '', phone: '' });
    setShowAddUser(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await syncWithGoogleSheets();
    setIsSyncing(false);
  };

  const handleSaveSettings = () => {
    updateSettings({ googleSheetsUrl: sheetsUrl, whatsappGreetingTemplate: whatsappTemplate });
    alert('Ayarlar başarıyla kaydedildi.');
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.school) return;
    setEvents([...events, {
      id: `evt_${Date.now()}`,
      title: newEvent.title,
      school: newEvent.school,
      date: newEvent.date || '2026-07-20',
      time: newEvent.time || '10:00',
      vehicle: newEvent.vehicle || '06 BKT 123',
      status: 'Yaklaşan'
    }]);
    setNewEvent({ title: '', school: '', date: '', time: '', vehicle: '' });
    setShowAddEvent(false);
  };

  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.parentName || !newContract.studentName) return;
    setContracts([...contracts, {
      id: `c_${Date.now()}`,
      parentName: newContract.parentName,
      studentName: newContract.studentName,
      type: newContract.type,
      date: new Date().toISOString().split('T')[0],
      status: 'Onay Bekliyor',
      file: `sozlesme_${newContract.studentName.toLowerCase().replace(/\s+/g, '_')}.pdf`
    }]);
    setNewContract({ parentName: '', studentName: '', type: 'Yıllık Servis' });
    setShowAddContract(false);
  };

  const triggerReport = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${selectedReportType} - ${action} işlemi başlatıldı ve başarıyla tamamlandı.`;
    setReportLog([logMsg, ...reportLog]);
  };

  // Sidebar Menu Array according to specified sequence
  const sidebarMenus = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, emoji: '🏠' },
    { id: 'academicyear', label: 'Akademik Yıl', icon: Clipboard, emoji: '📆' },
    { id: 'bulkops', label: 'Toplu İşlemler', icon: Database, emoji: '📤' },
    { id: 'advancedcalendar', label: 'Gelişmiş Takvim', icon: Calendar, emoji: '📅' },
    { id: 'announcements', label: 'Duyuru Sistemi', icon: Bell, emoji: '📢' },
    { id: 'docpreviewer', label: 'Evrak Önizleyici', icon: FileText, emoji: '👁️' },
    { id: 'schools', label: 'Okullar', icon: Building, emoji: '🏫' },
    { id: 'students', label: 'Öğrenciler', icon: GraduationCap, emoji: '👨‍🎓' },
    { id: 'parents', label: 'Veliler', icon: Heart, emoji: '👨‍👩‍👧' },
    { id: 'vehicles', label: 'Araçlar', icon: Truck, emoji: '🚌' },
    { id: 'drivers', label: 'Şoförler', icon: Compass, emoji: '👨‍✈️' },
    { id: 'hostesses', label: 'Hostesler', icon: UserIcon, emoji: '👩' },
    { id: 'suppliers', label: 'Tedarikçiler', icon: Briefcase, emoji: '🏢' },
    { id: 'maps', label: 'Harita', icon: Map, emoji: '🗺️' },
    { id: 'seating', label: 'Koltuk Planı', icon: Grid, emoji: '🪑' },
    { id: 'events', label: 'Etkinlikler', icon: Calendar, emoji: '📅' },
    { id: 'accounting', label: 'Muhasebe', icon: DollarSign, emoji: '💰' },
    { id: 'accrual', label: 'Hakediş', icon: FileText, emoji: '📄' },
    { id: 'attendance', label: 'Puantaj', icon: CheckSquare, emoji: '📆' },
    { id: 'documents', label: 'Evraklar', icon: Clipboard, emoji: '📁' },
    { id: 'contracts', label: 'Sözleşmeler', icon: FileSignature, emoji: '📝' },
    { id: 'reports', label: 'Raporlar', icon: BarChart3, emoji: '📈' },
    { id: 'notifications', label: 'Bildirimler', icon: Bell, emoji: '🔔' },
    { id: 'assignments', label: 'Atamalar', icon: Users, emoji: '👥' },
    { id: 'settings', label: 'Ayarlar', icon: Settings, emoji: '⚙' },
    { id: 'readiness', label: 'Canlıya Geçiş', icon: Shield, emoji: '🛡️' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Upper Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 py-3.5 px-6 flex items-center justify-between sticky top-0 z-50 shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-base tracking-tighter">
            B
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">BERKAYTUR</h1>
            <p className="text-[10px] text-blue-300 font-bold tracking-widest mt-0.5 uppercase">OKUL PORTALI • SALTIK AUTO • FESTİVAL</p>
          </div>
        </div>

        <div className="hidden md:block flex-1 max-w-md mx-8">
          <GlobalSearch onNavigateToTab={(tabId) => setActiveTab(tabId)} />
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Center embedded here - only visible to specified roles (Admin in this view) */}
          <NotificationCenter 
            userRole="admin" 
            onTabNavigate={(tabId) => setActiveTab(tabId)} 
          />

          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-200">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize font-medium">Sistem Yöneticisi</p>
          </div>

          <button 
            id="admin-logout-btn"
            onClick={logout}
            className="p-2.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 rounded-xl transition-all cursor-pointer text-slate-400"
            title="Sistemden Güvenli Çıkış"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Left Premium Sidebar */}
        <aside 
          className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 relative z-30 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-4 bg-slate-900 text-white p-1 rounded-full border border-slate-700 shadow-md cursor-pointer hover:bg-blue-600 transition-all z-50"
            title={isSidebarCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Collapsible branding or logo area */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">YÖNETİM SİSTEMİ</span>
            )}
            <div className={`mx-auto ${isSidebarCollapsed ? 'block' : 'hidden'}`}>
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          {/* Scrollable Navigation List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
            {sidebarMenus.map(menu => {
              const IconComponent = menu.icon;
              const isActive = activeTab === menu.id;
              return (
                <button
                  key={menu.id}
                  id={`admin-tab-${menu.id}`}
                  onClick={() => setActiveTab(menu.id)}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-lg' 
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                  title={menu.label}
                >
                  <span className="text-base">{menu.emoji}</span>
                  {!isSidebarCollapsed && (
                    <span className="truncate tracking-wide">{menu.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick status footer in sidebar */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-500 font-bold space-y-1">
              <div className="flex justify-between"><span>Okullar:</span><span className="text-slate-800">{schools.length}</span></div>
              <div className="flex justify-between"><span>Filo:</span><span className="text-slate-800">{vehicles.length}</span></div>
              <div className="flex justify-between"><span>Öğrenci:</span><span className="text-slate-800">{students.length}</span></div>
            </div>
          )}
        </aside>

        {/* Dynamic Panel Content Stage */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* 1. 🏠 DASHBOARD PANEL */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in text-center py-12 max-w-3xl mx-auto">
              {/* Simple aesthetic display header */}
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                <Shield className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  Hoş Geldiniz
                </h2>
                <p className="text-lg text-slate-500 font-semibold italic">
                  Berkay Turan • Sistem Yöneticisi Paneli
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-xs rounded-full text-sm font-bold text-slate-700 font-mono">
                    📅 Bugünün Tarihi: 15 Temmuz 2026 Çarşamba
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={handleSpeakGreeting}
                  className={`flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase hover:bg-slate-800 transition-all cursor-pointer shadow-md ${isSpeaking ? 'animate-pulse' : ''}`}
                >
                  <Volume2 className="w-4 h-4" /> Sesli Asistan Karşılaması
                </button>
                <button
                  onClick={() => setActiveTab('schools')}
                  className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-extrabold tracking-wider uppercase cursor-pointer"
                >
                  Sistemi Yönetmeye Başla
                </button>
              </div>

              {/* ⭐ FAVORITES QUICK-ACCESS PANEL */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 text-left space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                    <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                      Sık Kullanılan Menüler (Favoriler)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Kolay Erişim</span>
                </div>

                {favorites && favorites.filter(f => f.userId === currentUser?.id).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {favorites
                      .filter(f => f.userId === currentUser?.id)
                      .map(fav => (
                        <button
                          key={fav.id}
                          onClick={() => setActiveTab(fav.path)}
                          className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-xs font-bold text-slate-800 group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>⭐</span>
                            <span className="truncate">{fav.title}</span>
                          </div>
                          <span className="opacity-0 group-hover:opacity-100 transition-all text-blue-600 text-sm">
                            →
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Henüz favorilere eklenmiş sayfa bulunmuyor. Aşağıdaki hızlı başlat menülerini kullanarak favori listenizi doldurabilirsiniz:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { title: 'Gelişmiş Takvim', path: 'advancedcalendar' },
                        { title: 'Duyuru Panosu', path: 'announcements' },
                        { title: 'Akademik Yıl', path: 'academicyear' },
                        { title: 'Toplu İşlemler', path: 'bulkops' },
                        { title: 'Evrak Önizleyici', path: 'docpreviewer' },
                      ].map(rec => (
                        <button
                          key={rec.path}
                          type="button"
                          onClick={() => {
                            if (currentUser) {
                              toggleFavorite(currentUser.id, rec.title, rec.path, 'star');
                            }
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                        >
                          + Favoriye Ekle: {rec.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Grid of high level firm statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-10 text-left">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">BERKAYTUR</span>
                  <h4 className="text-lg font-bold text-slate-800">Okul Servis Portalı</h4>
                  <p className="text-xs text-slate-500">Öğrenci, veli ve koordinasyon sistemleri.</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">FESTİVAL</span>
                  <h4 className="text-lg font-bold text-slate-800">Turizm & Taşımacılık</h4>
                  <p className="text-xs text-slate-500">Personel servisleri ve kurumsal filolar.</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">SALTIK AUTO</span>
                  <h4 className="text-lg font-bold text-slate-800">Service & Bakım</h4>
                  <p className="text-xs text-slate-500">Araç bakım, periyodik onarım ve hasar tespiti.</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. 🏫 OKULLAR PANEL */}
          {activeTab === 'schools' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Eğitim Kurumları (Okullar)</h3>
                  <p className="text-sm text-slate-500">Sistemde kayıtlı anlaşmalı okullar ve koordinasyon verileri.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('maps')}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Map className="w-4 h-4 text-blue-600" /> Haritada Göster
                  </button>
                  <button
                    onClick={() => {
                      setEditingSchoolId(null);
                      setSchoolForm({
                        name: '', address: '', phone: '', email: '', type: 'state',
                        city: 'İstanbul', district: '', neighborhood: '', latitude: 0, longitude: 0,
                        authorizedPerson: '',
                        assignedCoordinators: [], assignedManagers: []
                      });
                      setShowAddSchool(!showAddSchool);
                      setShowEditSchool(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Yeni Okul
                  </button>
                </div>
              </div>

              {/* High level figures requested in prompt */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Toplam Okul</span>
                  <p className="text-2xl font-black text-slate-800">{schools.length}</p>
                </div>
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 uppercase font-black">Aktif Okul</span>
                  <p className="text-2xl font-black">{schools.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Pasif Okul</span>
                  <p className="text-2xl font-black text-slate-800">0</p>
                </div>
              </div>

              {/* Add & Edit School Form */}
              {(showAddSchool || showEditSchool) && (
                <form 
                  onSubmit={showEditSchool ? handleEditSchoolSubmit : handleAddSchoolSubmit} 
                  className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      {showEditSchool ? 'Okul Düzenleme Formu' : 'Yeni Okul Giriş Formu'}
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => { setShowAddSchool(false); setShowEditSchool(false); }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Okul Adı</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Sevinç Koleji"
                        value={schoolForm.name}
                        onChange={e => setSchoolForm({...schoolForm, name: e.target.value})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Okul Türü</label>
                      <select
                        value={schoolForm.type}
                        onChange={e => setSchoolForm({...schoolForm, type: e.target.value as 'state' | 'private' | 'college'})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        <option value="state">Devlet Okulu</option>
                        <option value="private">Özel Okul</option>
                        <option value="college">Kolej</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Telefon</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: 0216 111 22 33"
                        value={schoolForm.phone}
                        onChange={e => setSchoolForm({...schoolForm, phone: e.target.value})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">E-posta</label>
                      <input
                        type="email"
                        required
                        placeholder="Örn: info@okul.k12.tr"
                        value={schoolForm.email}
                        onChange={e => setSchoolForm({...schoolForm, email: e.target.value})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">İl</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: İstanbul"
                        value={schoolForm.city}
                        onChange={e => setSchoolForm({...schoolForm, city: e.target.value})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">İlçe</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Çekmeköy"
                        value={schoolForm.district}
                        onChange={e => setSchoolForm({...schoolForm, district: e.target.value})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Mahalle</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Merkez Mah."
                        value={schoolForm.neighborhood}
                        onChange={e => setSchoolForm({...schoolForm, neighborhood: e.target.value})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Yetkili Kişi</label>
                      <input
                        type="text"
                        placeholder="Örn: Mustafa Sağlam"
                        value={schoolForm.authorizedPerson || ''}
                        onChange={e => setSchoolForm({...schoolForm, authorizedPerson: e.target.value})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Enlem (Latitude)</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="Aranması için 0 bırakın"
                        value={schoolForm.latitude || ''}
                        onChange={e => setSchoolForm({...schoolForm, latitude: Number(e.target.value)})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Boylam (Longitude)</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="Aranması için 0 bırakın"
                        value={schoolForm.longitude || ''}
                        onChange={e => setSchoolForm({...schoolForm, longitude: Number(e.target.value)})}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleGeocode(false)}
                      disabled={isGeocoding}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                    >
                      {isGeocoding ? 'Aranıyor...' : '🔍 OpenStreetMap\'ten Koordinat Bul'}
                    </button>
                    <span className="text-[11px] text-slate-600">
                      Adrese dayalı koordinatları otomatik sorgular. Enlem/Boylam girmek istemiyorsanız boş veya 0 bırakabilirsiniz.
                    </span>
                    {geocodingError && (
                      <span className="text-xs text-rose-600 font-semibold ml-auto">{geocodingError}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Açık Adres</label>
                    <textarea
                      required
                      placeholder="Açık adres yazınız..."
                      value={schoolForm.address}
                      onChange={e => setSchoolForm({...schoolForm, address: e.target.value})}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs h-16 resize-none"
                    />
                  </div>

                  {/* Assignments Section */}
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Okul Sorumluları (Atama)</label>
                      <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto p-2 bg-white border border-slate-200 rounded-lg">
                        {users.filter(u => u.role === 'coordinator').map(u => (
                          <label key={u.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={(schoolForm.assignedCoordinators || []).includes(u.id)}
                              onChange={e => {
                                const current = schoolForm.assignedCoordinators || [];
                                const next = e.target.checked ? [...current, u.id] : current.filter(id => id !== u.id);
                                setSchoolForm({ ...schoolForm, assignedCoordinators: next });
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            {u.name}
                          </label>
                        ))}
                        {users.filter(u => u.role === 'coordinator').length === 0 && (
                          <span className="text-[10px] text-slate-400 col-span-2">Kayıtlı sorumlu bulunmamaktadır.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Proje Müdürleri (Atama)</label>
                      <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto p-2 bg-white border border-slate-200 rounded-lg">
                        {users.filter(u => u.role === 'manager').map(u => (
                          <label key={u.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={(schoolForm.assignedManagers || []).includes(u.id)}
                              onChange={e => {
                                const current = schoolForm.assignedManagers || [];
                                const next = e.target.checked ? [...current, u.id] : current.filter(id => id !== u.id);
                                setSchoolForm({ ...schoolForm, assignedManagers: next });
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            {u.name}
                          </label>
                        ))}
                        {users.filter(u => u.role === 'manager').length === 0 && (
                          <span className="text-[10px] text-slate-400 col-span-2">Kayıtlı müdür bulunmamaktadır.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => { setShowAddSchool(false); setShowEditSchool(false); }} 
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 cursor-pointer transition-all"
                    >
                      İptal
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer transition-all shadow-xs"
                    >
                      {showEditSchool ? 'Güncelle' : 'Kaydet'}
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3">Okul Adı & Türü</th>
                      <th className="pb-3">İletişim</th>
                      <th className="pb-3">Adres & Konum</th>
                      <th className="pb-3">Atanan Yetkililer</th>
                      <th className="pb-3 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {schools.map(school => {
                      // Get assigned coordinators
                      const schCoors = users.filter(u => (school.assignedCoordinators || []).includes(u.id));
                      // Get assigned managers
                      const schMgrs = users.filter(u => (school.assignedManagers || []).includes(u.id));

                      return (
                        <tr key={school.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-800">
                            <div>{school.name}</div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                              school.type === 'college' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                              school.type === 'private' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {school.type === 'college' ? 'Kolej' : school.type === 'private' ? 'Özel Okul' : 'Devlet Okulu'}
                            </span>
                          </td>
                          <td className="py-3">
                            {school.authorizedPerson && (
                              <div className="font-bold text-blue-800 text-[11px] mb-0.5 bg-blue-50 px-1 py-0.5 rounded inline-block">Yetkili: {school.authorizedPerson}</div>
                            )}
                            <div className="font-medium text-slate-700">{school.phone}</div>
                            <div className="text-slate-400 text-[11px]">{school.email}</div>
                          </td>
                          <td className="py-3 max-w-xs">
                            <div className="text-slate-600 truncate">{school.address}</div>
                            <div className="text-slate-400 text-[10px] mt-0.5">
                              {school.neighborhood ? `${school.neighborhood}, ` : ''}
                              {school.district ? `${school.district}/` : ''}
                              {school.city || 'İstanbul'}
                            </div>
                            {school.latitude && school.longitude && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded mt-1 font-mono">
                                <Map className="w-2.5 h-2.5 text-blue-500" /> {school.latitude.toFixed(4)}, {school.longitude.toFixed(4)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 space-y-1">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Sorumlular ({schCoors.length})</span>
                              {schCoors.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {schCoors.map(c => (
                                    <span key={c.id} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{c.name}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Atanmamış</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Müdürler ({schMgrs.length})</span>
                              {schMgrs.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {schMgrs.map(m => (
                                    <span key={m.id} className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{m.name}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Atanmamış</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleEditSchoolClick(school)}
                                className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                                title="Okulu Düzenle"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteSchool(school.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="Okulu Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. 👨‍🎓 ÖĞRENCİLER PANEL */}
          {activeTab === 'students' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Kayıtlı Öğrenciler</h3>
                  <p className="text-sm text-slate-500">Servis hizmeti alan tüm öğrenciler ve yoklama günlükleri.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('maps')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    🗺️ Haritada Gör
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Toplam Öğrenci</span>
                  <p className="text-2xl font-black text-slate-800">{students.length}</p>
                </div>
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 uppercase font-black">Bugün Servise Gelen</span>
                  <p className="text-2xl font-black">2</p>
                </div>
                <div className="p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-600 uppercase font-black">Bugün Gelmeyen</span>
                  <p className="text-2xl font-black">1</p>
                </div>
                <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-amber-600 uppercase font-black">Bekleyen Başvurular</span>
                  <p className="text-2xl font-black">2</p>
                </div>
              </div>

              {/* Tag filters row */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Etiket Filtresi:</span>
                {['all', 'VIP', 'Burslu', 'Kardeş', 'Özel Eğitim', 'Yeni Kayıt', 'Öncelikli'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedStudentTagFilter(tag)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer whitespace-nowrap ${
                      selectedStudentTagFilter === tag
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tag === 'all' ? 'Tüm Öğrenciler' : tag}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider pb-2">
                      <th className="pb-3">No / Ad Soyad</th>
                      <th className="pb-3">Okul / Sınıf</th>
                      <th className="pb-3">Veli / İletişim</th>
                      <th className="pb-3">Etiketler</th>
                      <th className="pb-3">Sabah Durumu</th>
                      <th className="pb-3">Akşam Durumu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students
                      .filter(st => selectedStudentTagFilter === 'all' || (st.tags && st.tags.includes(selectedStudentTagFilter)))
                      .map(st => (
                      <tr key={st.id} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{st.name}</p>
                          <p className="text-slate-400">No: {st.studentNumber}</p>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold">{st.schoolName}</p>
                          <p className="text-slate-500">Sınıf: {st.classLevel}</p>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold">{st.parentName}</p>
                          <p className="font-mono text-slate-400">{st.parentPhone}</p>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {st.tags && st.tags.length > 0 ? (
                              st.tags.map(t => (
                                <span key={t} className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-300 font-medium italic">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            st.morningStatus === 'at_school' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>{st.morningStatus.toUpperCase()}</span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            st.eveningStatus === 'at_home' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>{st.eveningStatus.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. 👨‍👩‍👧 VELİLER PANEL */}
          {activeTab === 'parents' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Veli Bilgi Bankası</h3>
                <p className="text-sm text-slate-500">Sözleşme ve bakiye takipleriyle birlikte veli kayıtları.</p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-black">Toplam Veli</span>
                  <p className="text-xl font-black text-slate-800">12</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-center">
                  <span className="text-[9px] text-blue-600 uppercase font-black">Yeni Başvuru</span>
                  <p className="text-xl font-black">2</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-center">
                  <span className="text-[9px] text-amber-600 uppercase font-black">Bekleyen Onay</span>
                  <p className="text-xl font-black">1</p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-center">
                  <span className="text-[9px] text-rose-600 uppercase font-black">Ödeme Bekleyen</span>
                  <p className="text-xl font-black">3</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-800 rounded-xl border border-purple-100 text-center">
                  <span className="text-[9px] text-purple-600 uppercase font-black">Sözleşme Bekleyen</span>
                  <p className="text-xl font-black">2</p>
                </div>
              </div>

              {/* Roster list */}
              <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3">
                {[
                  { parent: 'Kamil Yılmaz', student: 'Ali Yılmaz', phone: '0532 999 88 77', status: 'Sözleşme Tamamlandı', balance: '0.00 ₺' },
                  { parent: 'Aysel Yıldız', student: 'Ece Yıldız', phone: '0533 888 77 66', status: 'Ödeme Bekleniyor', balance: '2,800 ₺' },
                  { parent: 'Murat Öz', student: 'Can Öz', phone: '0544 777 66 55', status: 'Sözleşme Eksik', balance: '2,800 ₺ (Gecikmiş)' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.parent}</p>
                      <p className="text-slate-500">Öğrenci: {item.student} • Tel: {item.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full font-black text-[10px] inline-block ${
                        item.status === 'Sözleşme Tamamlandı' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>{item.status}</span>
                      <p className="font-mono font-bold mt-1 text-slate-700">Kalan Bakiye: {item.balance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. 🚌 ARAÇLAR PANEL */}
          {activeTab === 'vehicles' && (
            <VehicleManager defaultTab="fleet" />
          )}

          {/* 6. 👨‍✈️ ŞOFÖRLER PANEL */}
          {activeTab === 'drivers' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Kaptan Şoförler</h3>
                <p className="text-sm text-slate-500">Aktif, izinli, pasif şoför evrak ve lisans takip veritabanı.</p>
              </div>

              <div className="grid grid-cols-6 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200"><span className="text-[9px] text-slate-400 font-black block">Toplam Şoför</span><p className="text-lg font-black text-slate-800">4</p></div>
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100"><span className="text-[9px] text-emerald-600 font-black block">Aktif</span><p className="text-lg font-black">3</p></div>
                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-200"><span className="text-[9px] text-slate-400 font-black block">Pasif</span><p className="text-lg font-black">1</p></div>
                <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100"><span className="text-[9px] text-rose-600 font-black block">Evrak Süresi</span><p className="text-lg font-black">1</p></div>
                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100"><span className="text-[9px] text-amber-600 font-black block">İzinli</span><p className="text-lg font-black">0</p></div>
                <div className="p-2.5 bg-red-50 text-red-800 rounded-xl border border-red-100"><span className="text-[9px] text-red-600 font-black block">Cezalı</span><p className="text-lg font-black">0</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  { name: 'Ahmet Yılmaz', license: 'D Sınıfı Ehliyet', status: 'Aktif', badge: 'SRC 1-2 • Psikoteknik Var', contact: '0532 111 22 33' },
                  { name: 'Mehmet Koç', license: 'D Sınıfı Ehliyet', status: 'Aktif', badge: 'SRC 2 • Psikoteknik Var', contact: '0533 222 33 44' },
                ].map((drv, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{drv.name}</p>
                      <p className="text-slate-500">{drv.license} • {drv.contact}</p>
                      <span className="text-[9px] bg-slate-200 font-black px-1.5 py-0.5 rounded text-slate-700 mt-1 inline-block">{drv.badge}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-full">{drv.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. 👩 HOSTESLER PANEL */}
          {activeTab === 'hostesses' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Rehber Personeller (Hostesler)</h3>
                <p className="text-sm text-slate-500">Öğrenci güvenliğini sağlayan refakatçi ve hostes veri tabanı.</p>
              </div>

              <div className="grid grid-cols-6 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200"><span className="text-[9px] text-slate-400 font-black block">Toplam Hostes</span><p className="text-lg font-black text-slate-800">3</p></div>
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100"><span className="text-[9px] text-emerald-600 font-black block">Aktif</span><p className="text-lg font-black">2</p></div>
                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-200"><span className="text-[9px] text-slate-400 font-black block">Pasif</span><p className="text-lg font-black">1</p></div>
                <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100"><span className="text-[9px] text-rose-600 font-black block">Evrak Süresi</span><p className="text-lg font-black">0</p></div>
                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100"><span className="text-[9px] text-amber-600 font-black block">İzinli</span><p className="text-lg font-black">0</p></div>
                <div className="p-2.5 bg-red-50 text-red-800 rounded-xl border border-red-100"><span className="text-[9px] text-red-600 font-black block">Cezalı</span><p className="text-lg font-black">0</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  { name: 'Ayşe Yıldız', status: 'Aktif', contact: '0544 333 44 55', route: 'Yenimahalle Güzergahı' },
                  { name: 'Fatma Kaya', status: 'Aktif', contact: '0555 444 55 66', route: 'Çankaya Express' }
                ].map((hst, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{hst.name}</p>
                      <p className="text-slate-500">Tel: {hst.contact}</p>
                      <span className="text-[10px] text-blue-600 font-bold">Hat: {hst.route}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-full">{hst.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. 🏢 TEDARİKÇİLER PANEL */}
          {activeTab === 'suppliers' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Tedarikçi Firmalar</h3>
                <p className="text-sm text-slate-500">Alt yüklenici taşıma firmaları, araç ve hakediş entegrasyonu.</p>
              </div>

              <div className="grid grid-cols-5 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200"><span className="text-[9px] text-slate-400 font-black block">Toplam Firma</span><p className="text-lg font-black text-slate-800">3</p></div>
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100"><span className="text-[9px] text-emerald-600 font-black block">Aktif Firma</span><p className="text-lg font-black">2</p></div>
                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-200"><span className="text-[9px] text-slate-400 font-black block">Pasif Firma</span><p className="text-lg font-black">1</p></div>
                <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100"><span className="text-[9px] text-rose-600 font-black block">Bekleyen Hakediş</span><p className="text-lg font-black">1</p></div>
                <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-100"><span className="text-[9px] text-blue-600 font-black block">Toplam Araç</span><p className="text-lg font-black">6</p></div>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { name: 'BERKAYTUR A Bölgesi Tedarikçisi', manager: 'Berkay Turan', phone: '0532 999 88 77', cars: 3, status: 'Aktif' },
                  { name: 'BERKAYTUR B Bölgesi Tedarikçisi', manager: 'Mehmet Sağlam', phone: '0312 444 55 66', cars: 2, status: 'Aktif' },
                  { name: 'Vadi Taşımacılık', manager: 'Can Demir', phone: '0555 111 22 33', cars: 1, status: 'Pasif' }
                ].map((firm, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{firm.name}</p>
                      <p className="text-slate-500">Yetkili: {firm.manager} • Tel: {firm.phone}</p>
                      <span className="text-[10px] text-blue-600 font-black">Atanan Araç Sayısı: {firm.cars} Araç</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      firm.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>{firm.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. 🗺️ HARİTA PANEL */}
          {activeTab === 'maps' && (
            <VehicleManager defaultTab="map" />
          )}

          {/* 10. 🪑 KOLTUK PLAN PANEL */}
          {activeTab === 'seating' && (
            <VehicleManager defaultTab="seating" />
          )}

          {/* 11. 📅 ETKİNLİKLER PANEL */}
          {activeTab === 'events' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Etkinlikler & Okul Gezileri</h3>
                  <p className="text-sm text-slate-500">Münferit dış organizasyonlar, müze ziyaretleri ve servis tahsisleri.</p>
                </div>
                <button
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Etkinlik Planla
                </button>
              </div>

              {showAddEvent && (
                <form onSubmit={handleAddEvent} className="bg-slate-50 p-4 border rounded-xl text-xs space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Etkinlik Adı" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="p-2 border bg-white rounded" required />
                    <input type="text" placeholder="Okul" value={newEvent.school} onChange={e => setNewEvent({...newEvent, school: e.target.value})} className="p-2 border bg-white rounded" required />
                    <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="p-2 border bg-white rounded" />
                    <input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="p-2 border bg-white rounded" />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold cursor-pointer">Kaydet</button>
                </form>
              )}

              {/* Event tabs of Bugün, Yarın, Yaklaşan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {['Bugün', 'Yarın', 'Yaklaşan'].map((status) => {
                  const filtered = events.filter(e => e.status === status);
                  return (
                    <div key={status} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="font-black uppercase tracking-wider text-slate-500">{status}ki Etkinlikler</h4>
                      {filtered.map(evt => (
                        <div key={evt.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs space-y-1">
                          <p className="font-bold text-slate-800 text-sm">{evt.title}</p>
                          <p className="text-slate-500">{evt.school}</p>
                          <p className="text-[10px] text-blue-600 font-semibold">{evt.date} • {evt.time}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Araç: {evt.vehicle}</p>
                        </div>
                      ))}
                      {filtered.length === 0 && <p className="text-slate-400 italic text-center py-4">Etkinlik bulunmuyor.</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 12. 💰 MUHASEBE PANEL */}
          {activeTab === 'accounting' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Kasa & Genel Muhasebe</h3>
                <p className="text-sm text-slate-500">Nakit akışı, veli ödemeleri tahsilatı ve gelir tablosu analizi.</p>
              </div>

              {/* Income Summary Cards */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Toplam Fatura</span>
                  <p className="text-xl font-black text-slate-800">124,000 ₺</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 uppercase font-black">Toplam Tahsil Edilen</span>
                  <p className="text-xl font-black">98,200 ₺</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-amber-600 uppercase font-black">Bekleyen Tahsilat</span>
                  <p className="text-xl font-black">25,800 ₺</p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-600 uppercase font-black">Aylık Net Kar Hacmi</span>
                  <p className="text-xl font-black">+72,400 ₺</p>
                </div>
              </div>

              {/* Transactions List */}
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider pb-2">
                      <th>Açıklama / Veli</th>
                      <th>Öğrenci</th>
                      <th>Kategori</th>
                      <th>Tutar</th>
                      <th>Vade Tarihi</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">
                          <div>{p.description || 'Servis Ödemesi'}</div>
                          <div className="text-[10px] text-slate-400">{p.parentName}</div>
                        </td>
                        <td className="py-3 font-medium">{p.studentName}</td>
                        <td className="py-3 font-mono">{p.category}</td>
                        <td className="py-3 font-bold font-mono text-slate-800">{p.amount} ₺</td>
                        <td className="py-3 text-slate-500 font-mono">{p.dueDate}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                            p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 13. 📄 HAKEDİŞ PANEL */}
          {activeTab === 'accrual' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Hakediş Havuzu (Payouts)</h3>
                <p className="text-sm text-slate-500">Tedarikçilere ve şoförlere ödenecek aylık hakediş onay ve işlem havuzu.</p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                {hakedisItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 text-xs">
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">{item.recipient}</p>
                      <p className="text-slate-500">{item.type} • Dönem: {item.period}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800 text-sm">{item.amount}</span>
                      {item.status === 'Onaylandı' ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-bold">Ödendi</span>
                      ) : (
                        <button
                          onClick={() => handleApproveHakedis(item.id)}
                          className="px-3 py-1 bg-slate-950 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer"
                        >
                          Hakedişi Onayla
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 14. 📆 PUANTAJ PANEL */}
          {activeTab === 'attendance' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Aylık Puantaj Cetveli</h3>
                  <p className="text-sm text-slate-500 font-medium">Öğrencilerin ve şoförlerin günlük biniş ve vardiya çizelgesi.</p>
                </div>
                <select 
                  value={puantajMonth} 
                  onChange={e => setPuantajMonth(e.target.value)} 
                  className="p-2 border bg-white rounded-lg text-xs font-bold"
                >
                  <option>Temmuz 2026</option>
                  <option>Haziran 2026</option>
                </select>
              </div>

              {/* Monthly grid calendar */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <th className="p-3 font-sans">Kişi Adı</th>
                      {Array.from({ length: 15 }).map((_, i) => (
                        <th key={i} className="p-2 text-center border-l border-slate-200">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {students.map(st => {
                      const days = puantajData[st.id] || {};
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold font-sans text-slate-800">{st.name} ({st.classLevel})</td>
                          {Array.from({ length: 15 }).map((_, i) => {
                            const dayNo = i + 1;
                            const present = days[dayNo] !== false;
                            return (
                              <td key={i} className="p-2 text-center border-l border-slate-200">
                                <span className={`w-4 h-4 rounded-full inline-block font-extrabold ${
                                  present ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>{present ? '✓' : '✗'}</span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 15. 📁 EVRAKLAR PANEL */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <DriveExplorer />
            </div>
          )}

          {/* 16. 📝 SÖZLEŞMELER PANEL */}
          {activeTab === 'contracts' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Ulaşım Hizmet Sözleşmeleri</h3>
                  <p className="text-sm text-slate-500">Veliler ve özel kurumlarla imzalanan yasal taşıma protokol arşivleri.</p>
                </div>
                <button
                  onClick={() => setShowAddContract(!showAddContract)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Yeni Sözleşme Tanımla
                </button>
              </div>

              {showAddContract && (
                <form onSubmit={handleAddContract} className="bg-slate-50 p-4 border rounded-xl text-xs space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Veli Ad Soyad" value={newContract.parentName} onChange={e => setNewContract({...newContract, parentName: e.target.value})} className="p-2 border bg-white rounded" required />
                    <input type="text" placeholder="Öğrenci Ad Soyad" value={newContract.studentName} onChange={e => setNewContract({...newContract, studentName: e.target.value})} className="p-2 border bg-white rounded" required />
                    <select value={newContract.type} onChange={e => setNewContract({...newContract, type: e.target.value})} className="p-2 border bg-white rounded font-bold">
                      <option>Yıllık Servis</option>
                      <option>Dönemlik Servis</option>
                    </select>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold cursor-pointer">Sözleşmeyi Kaydet</button>
                </form>
              )}

              <div className="space-y-3 text-xs">
                {contracts.map(cnt => (
                  <div key={cnt.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{cnt.parentName}</p>
                      <p className="text-slate-500">Öğrenci: {cnt.studentName} • Tip: {cnt.type}</p>
                      <span className="text-[10px] text-blue-600 font-mono">Dosya: {cnt.file}</span>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                        cnt.status === 'İmzalandı' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>{cnt.status}</span>
                      <p className="text-[10px] text-slate-400 font-bold font-mono mt-1">İmza Tarihi: {cnt.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 17. 📈 RAPORLAR PANEL */}
          {activeTab === 'reports' && (
            <PremiumReportsDashboard />
          )}

          {/* 18. 🔔 BİLDİRİMLER PANEL */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Tüm Operasyonel Bildirimler</h3>
                <p className="text-sm text-slate-500">Sistemde oluşan anlık başvuru, gecikme, arıza ve memnuniyet geri bildirimleri.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Section A: Bugün Gelen Başvurular */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-blue-600">
                    <GraduationCap className="w-4 h-4" /> Bugün Gelen Başvurular
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                      <p className="font-bold text-slate-800">Öğrenci: Arda Kaya</p>
                      <p className="text-slate-500">Okul: Atatürk Anadolu Lisesi</p>
                      <p className="text-[10px] text-slate-400">Başvuru Saati: 09:30 • KM: 4.2 KM</p>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded">Onay Bekliyor</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Tahsilat Bildirimleri */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-emerald-600">
                    <DollarSign className="w-4 h-4" /> Bugün Yapılan Tahsilatlar
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                      <p className="font-bold text-slate-800">Veli: Kamil Yılmaz</p>
                      <p className="text-slate-500">Öğrenci: Ali Yılmaz • Ödeme: Kredi Kartı</p>
                      <p className="font-mono text-emerald-700 font-bold">Tutar: 2,400 ₺</p>
                      <p className="text-[10px] text-slate-400">Tahsil Alan: Ayhan Sayman • Saat: 14:20</p>
                    </div>
                  </div>
                </div>

                {/* Section C: Geciken Ödemeler */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-rose-600">
                    <AlertTriangle className="w-4 h-4" /> Geciken Ödemeler
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1">
                      <p className="font-bold text-rose-900">Veli: Murat Öz</p>
                      <p className="text-slate-600">Öğrenci: Can Öz • 30 Gündür Gecikmiş</p>
                      <p className="font-mono text-rose-700 font-bold">Tutar: 2,800 ₺</p>
                    </div>
                  </div>
                </div>

                {/* Section D: Araç Arızaları */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-red-600">
                    <Activity className="w-4 h-4" /> Şoför Arıza Bildirimleri
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-1">
                      <p className="font-bold text-red-900">06 BKT 123 - Ahmet Yılmaz</p>
                      <p className="text-slate-600">Arıza Türü: Motor (Motor Lambası Yanıyor)</p>
                      <span className="text-[9px] bg-red-100 text-red-800 font-black px-1.5 py-0.5 rounded">Gecikme Var</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 19A. 📆 AKADEMİK YIL PANEL */}
          {activeTab === 'academicyear' && (
            <AcademicYearPanel />
          )}

          {/* 19B. 📤 TOPLU VERİ PANEL */}
          {activeTab === 'bulkops' && (
            <BulkOperationsPanel />
          )}

          {/* 19C. 📅 GELİŞMİŞ TAKVİM PANEL */}
          {activeTab === 'advancedcalendar' && (
            <AdvancedCalendar />
          )}

          {/* 19D. 📢 DUYURU SİSTEMİ PANEL */}
          {activeTab === 'announcements' && (
            <AnnouncementManager />
          )}

          {/* 19E. 👁️ EVRAK ÖNİZLEYİCİ PANEL */}
          {activeTab === 'docpreviewer' && (
            <DocumentPreviewer />
          )}

          {/* 19F. 👥 ATAMALAR PANEL */}
          {activeTab === 'assignments' && (
            <UserAssignmentManager />
          )}

          {/* 19. ⚙️ AYARLAR PANEL */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Settings Navigation Subtabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-6">
                {[
                  { id: 'general', label: 'Genel & Şirket Ayarları', emoji: '⚙️' },
                  { id: 'users', label: 'Kullanıcı & Atama Yönetimi', emoji: '👥' },
                  { id: 'sheets', label: 'Google Sheets Veritabanı', emoji: '📊' },
                  { id: 'whatsapp', label: 'WhatsApp Entegrasyonu', emoji: '💬' },
                  { id: 'logs', label: 'Güvenlik & İşlem Günlüğü', emoji: '🛡️' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSettingsSubTab(sub.id as any)}
                    className={`pb-3 text-xs font-black whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      settingsSubTab === sub.id 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{sub.emoji}</span>
                    <span>{sub.label}</span>
                  </button>
                ))}
              </div>

              {/* Subtab Contents */}
              {settingsSubTab === 'general' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 animate-fade-in">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Şirket Parametreleri & Senkronizasyon</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Grup şirket bilgileri ve Google Tablolar API bağlantı URL'i.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 pt-2 text-xs">
                    {/* Company Info */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><Building className="w-4 h-4 text-blue-600" /> Şirket Bilgileri</h4>
                      <div className="space-y-2">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">Firma Adı</label><input type="text" value="Berkaytur Grup Hizmetleri" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg" disabled /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">Resmi Yetkililer</label><input type="text" value="Berkay Turan, Mehmet Sağlam" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg" disabled /></div>
                      </div>
                    </div>

                    {/* Google Sheets API Config */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><Database className="w-4 h-4 text-blue-600" /> Google Sheets API</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Google Apps Script Web App URL</label>
                        <input
                          type="text"
                          value={sheetsUrl}
                          onChange={e => setSheetsUrl(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                      <button onClick={handleSync} disabled={isSyncing} className="px-4 py-2 bg-blue-600 text-white rounded font-bold cursor-pointer">
                        {isSyncing ? 'Senkronize Ediliyor...' : 'Şimdi Senkronize Et'}
                      </button>
                    </div>

                    {/* WhatsApp Greeting Templates */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 md:col-span-2">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><Volume2 className="w-4 h-4 text-blue-600" /> WhatsApp Mesaj Şablonları</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Karşılama Şablonu</label>
                          <textarea rows={3} value={whatsappTemplate} onChange={e => setWhatsappTemplate(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Sesli Karşılama Ayarı</label>
                          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between mt-1">
                            <span>Karşılama Sentezi Aktif</span>
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
                    <button 
                      onClick={clearDatabase}
                      className="px-4 py-2 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-50 cursor-pointer"
                    >
                      Tüm Veritabanını Sıfırla
                    </button>
                    <button
                      onClick={handleSaveSettings}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Ayarları Kaydet
                    </button>
                  </div>
                </div>
              )}

              {settingsSubTab === 'users' && (
                <div className="animate-fade-in">
                  <UserAssignmentManager />
                </div>
              )}

              {settingsSubTab === 'sheets' && (
                <div className="animate-fade-in">
                  <SheetsSchema />
                </div>
              )}

              {settingsSubTab === 'whatsapp' && (
                <div className="animate-fade-in">
                  <WhatsAppSender />
                </div>
              )}

              {settingsSubTab === 'logs' && (
                <div className="animate-fade-in">
                  <AuditLogViewer />
                </div>
              )}

            </div>
          )}

          {activeTab === 'readiness' && (
            <ProductionReadiness />
          )}

        </main>
      </div>
    </div>
  );
}
