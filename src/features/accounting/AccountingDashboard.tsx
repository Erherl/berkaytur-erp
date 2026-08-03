/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { 
  LogOut, ShieldCheck, Menu, X, Landmark, Bell, 
  Settings, DollarSign, Calendar, CreditCard, FileText, 
  Users, UserCheck, Trash2, Fuel, Wrench, AlertTriangle, 
  Award, TrendingUp, FolderOpen, FileSpreadsheet, Eye,
  CheckSquare
} from 'lucide-react';

// Modular Subcomponents Imports
import DashboardHome from './components/DashboardHome';
import Tahsilatlar from './components/Tahsilatlar';
import Hakedisler from './components/Hakedisler';
import Maaslar from './components/Maaslar';
import Avanslar from './components/Avanslar';
import Giderler from './components/Giderler';
import CezalarPrimler from './components/CezalarPrimler';
import GelirGider from './components/GelirGider';
import PuantajEntegrasyonu from './components/PuantajEntegrasyonu';
import Dekontlar from './components/Dekontlar';
import Raporlar from './components/Raporlar';
import PremiumReportsDashboard from '../reports/PremiumReportsDashboard';
import BildirimlerAyarlar from './components/BildirimlerAyarlar';
import GlobalSearch from '../../components/GlobalSearch';

export default function AccountingDashboard() {
  const { currentUser, logout, addLog } = useAppStore();

  // Active Menu Tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Mobile Sidebar Drawer State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Multi-Company Selection State
  const [selectedCompany, setSelectedCompany] = useState<'Berkaytur'>('Berkaytur');

  // In-App Notification Appender Simulator
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleAddNotification = (title: string, message: string, type: 'info' | 'success' | 'warning') => {
    const newNotif = {
      id: `notif_${Date.now()}`,
      title,
      message,
      type,
      time: 'Şimdi'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Sidebar Menu Items Definitions (All 17 requested features mapped elegantly)
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Calendar, group: 'Ana Sayfa' },
    { id: 'tahsilatlar', name: 'Veli Tahsilatları', icon: CreditCard, group: 'Gelirler' },
    { id: 'hakedisler', name: 'Hakediş Hesaplama', icon: FileText, group: 'Giderler & Hakediş' },
    { id: 'maaslar', name: 'Maaş & Tedarikçi', icon: Users, group: 'Giderler & Hakediş' },
    { id: 'avanslar', name: 'Avans Ödemeleri', icon: DollarSign, group: 'Giderler & Hakediş' },
    { id: 'giderler', name: 'Araç Giderleri', icon: Fuel, group: 'Filo Giderleri' },
    { id: 'cezalar_primler', name: 'Ceza & Prim', icon: AlertTriangle, group: 'Filo Giderleri' },
    { id: 'gelir_gider', name: 'Gelir Gider Analizi', icon: TrendingUp, group: 'Analizler' },
    { id: 'puantaj', name: 'Puantaj Entegrasyonu', icon: CheckSquare, group: 'Sefer Takip' },
    { id: 'dekontlar', name: 'Dekont & Arşiv', icon: FolderOpen, group: 'Belgeler' },
    { id: 'raporlar', name: 'Mali Raporlama', icon: FileSpreadsheet, group: 'Belgeler' },
    { id: 'bildirimler_ayarlar', name: 'Entegrasyon & Ayarlar', icon: Settings, group: 'Yönetim' },
  ];

  // Group menu items for better UI structure
  const groups = ['Ana Sayfa', 'Gelirler', 'Giderler & Hakediş', 'Filo Giderleri', 'Analizler', 'Sefer Takip', 'Belgeler', 'Yönetim'];

  return (
    <div id="accounting-dashboard-layout" className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      
      {/* SIDEBAR NAVIGATION - DESKTOP */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Sidebar Header with Brand */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="BERKAYTUR Logo" className="w-8 h-8 object-contain" />
            <div>
              <span className="font-extrabold text-white text-sm leading-none block">BERKAYTUR</span>
              <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest mt-1 block">Finans Portalı</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {groups.map(grp => {
            const items = menuItems.filter(item => item.group === grp);
            if (items.length === 0) return null;
            return (
              <div key={grp} className="space-y-1.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">
                  {grp}
                </span>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 font-black' 
                            : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer with Personnel Details */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 font-extrabold">
              AS
            </div>
            <div>
              <p className="text-white font-bold leading-none">{currentUser?.name || 'Ayhan Sayman'}</p>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">Muhasebe</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Sistemden Çıkış"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN SCREEN WRAPPER */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* UPPER HEADER BAR */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-8 shrink-0 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          
          {/* Burger button for Mobile */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 border rounded-xl hover:bg-slate-50 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Title / Tab Name */}
            <div className="hidden sm:block">
              <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                ERP Finans Yönetim Sistemi
              </span>
              <h1 className="text-sm font-black text-slate-800 uppercase mt-0.5">
                {menuItems.find(i => i.id === activeTab)?.name || 'Finans Portalı'}
              </h1>
            </div>
          </div>

          {/* Global Search Component */}
          <div className="hidden md:block flex-1 max-w-sm mx-6">
            <GlobalSearch onNavigateToTab={(tabId) => {
              // Convert general route names to accounting specific tab IDs if relevant, or switch activeTab
              const mapping: Record<string, string> = {
                'students': 'puantaj',
                'parents': 'tahsilatlar',
                'accounting': 'tahsilatlar',
                'vehicles': 'giderler',
                'drivers': 'maaslar',
                'hostesses': 'maaslar'
              };
              const mapped = mapping[tabId] || 'dashboard';
              setActiveTab(mapped);
            }} />
          </div>

          {/* Corporate Brand Badge */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 shadow-2xs">
            <img src="/favicon.svg" alt="BERKAYTUR Logo" className="w-6 h-6 object-contain" />
            <div className="text-left leading-none">
              <span className="font-black text-slate-900 text-xs block">BERKAYTUR</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 block">Okul Servisi Operasyon Platformu</span>
            </div>
          </div>

        </header>

        {/* TAB WORKSPACE AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          
          {activeTab === 'dashboard' && <DashboardHome />}
          
          {activeTab === 'tahsilatlar' && (
            <Tahsilatlar onAddNotification={handleAddNotification} />
          )}

          {activeTab === 'hakedisler' && (
            <Hakedisler onAddNotification={handleAddNotification} />
          )}

          {activeTab === 'maaslar' && <Maaslar />}
          
          {activeTab === 'avanslar' && <Avanslar />}

          {activeTab === 'giderler' && <Giderler />}

          {activeTab === 'cezalar_primler' && <CezalarPrimler />}

          {activeTab === 'gelir_gider' && <GelirGider />}

          {activeTab === 'puantaj' && <PuantajEntegrasyonu />}

          {activeTab === 'dekontlar' && <Dekontlar />}

          {activeTab === 'raporlar' && <PremiumReportsDashboard />}

          {activeTab === 'bildirimler_ayarlar' && <BildirimlerAyarlar />}

        </main>
      </div>

    </div>
  );
}
