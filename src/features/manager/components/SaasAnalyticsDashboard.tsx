/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../../store';
import { AnalyticsEngine } from '../../../infrastructure/saas/AnalyticsEngine';
import { TenantConfig, SubscriptionInfo } from '../../../infrastructure/saas/SaasTypes';
import { 
  TrendingUp, Users, Bus, Percent, Award, ShieldAlert, 
  Settings, Layers, RefreshCw, BarChart2, DollarSign, Calendar,
  Activity, Zap, Clock, ThumbsUp, CreditCard
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';

export default function SaasAnalyticsDashboard() {
  const { routes, students, payments, vehicles } = useAppStore();
  const [activeTab, setActiveTab] = useState<'kpi' | 'tenants' | 'intelligence'>('kpi');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Compute stats via AnalyticsEngine
  const fleetMetrics = useMemo(() => {
    return AnalyticsEngine.calculateFleetMetrics(routes, vehicles);
  }, [routes, vehicles, refreshTrigger]);

  const studentBoarding = useMemo(() => {
    return AnalyticsEngine.calculateStudentBoarding(students);
  }, [students, refreshTrigger]);

  const financialMetrics = useMemo(() => {
    return AnalyticsEngine.calculateFinancialPerformance(payments);
  }, [payments, refreshTrigger]);

  // Static Tenant Configurations
  const tenants = useMemo(() => AnalyticsEngine.getDefaultTenantConfigs(), []);
  const [selectedTenant, setSelectedTenant] = useState<string>('t1');
  const [tenantList, setTenantList] = useState<TenantConfig[]>(tenants);

  // Subscription Details
  const subscriptions = useMemo(() => AnalyticsEngine.getSubscriptionTiers(), []);
  const activeSubscription = subscriptions[0];

  // Recharts Data Source - Monthly Collections vs Expected Revenue
  const cashflowData = [
    { name: 'Ocak', Beklenen: 95000, Tahsil: 88000 },
    { name: 'Şubat', Beklenen: 110000, Tahsil: 95000 },
    { name: 'Mart', Beklenen: 120000, Tahsil: 104000 },
    { name: 'Nisan', Beklenen: 125000, Tahsil: 118000 },
    { name: 'Mayıs', Beklenen: 130000, Tahsil: 121000 },
    { name: 'Haziran', Beklenen: 140000, Tahsil: 135000 }
  ];

  // Delay distribution data
  const delayData = [
    { name: 'Zamanında', value: fleetMetrics.onTimeArrivalRate },
    { name: 'Hafif Gecikme (1-5 dk)', value: Math.round((100 - fleetMetrics.onTimeArrivalRate) * 0.7) },
    { name: 'Kritik Gecikme (>5 dk)', value: Math.round((100 - fleetMetrics.onTimeArrivalRate) * 0.3) }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const handleCreateTenant = () => {
    const newTenant: TenantConfig = {
      tenantId: `t_${Date.now()}`,
      companyName: 'Yeni Bölge Taşımacılık A.Ş.',
      primaryColor: '#8b5cf6',
      currency: 'TRY',
      language: 'tr',
      timezone: 'Europe/Istanbul'
    };
    setTenantList(prev => [...prev, newTenant]);
  };

  return (
    <div id="saas-analytics-root" className="space-y-6 font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-500/30 uppercase tracking-widest">
              SaaS Engine v1.0
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400 text-xs font-medium font-mono">Tenant Connected: {tenantList.find(t => t.tenantId === selectedTenant)?.companyName}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans">
            B2B Operasyonel Analitik ve SaaS Kokpiti
          </h2>
          <p className="text-slate-400 text-xs">
            Çoklu şube kontrolü, akıllı rota KPI'ları ve SLA yönetim mekanizmaları.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tenant Selector Dropdown */}
          <select 
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {tenantList.map(t => (
              <option key={t.tenantId} value={t.tenantId}>{t.companyName}</option>
            ))}
          </select>

          <button 
            onClick={() => setRefreshTrigger(p => p + 1)}
            className="p-2 bg-slate-800 hover:bg-slate-700/80 text-indigo-400 hover:text-indigo-300 rounded-xl transition-all cursor-pointer border border-slate-700/60"
            title="Verileri Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Menu Controls */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'kpi' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Operasyonel KPI & Dashboard
        </button>

        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tenants' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Çok Kiracılı (Tenant) & Lisans Yönetimi
        </button>

        <button
          onClick={() => setActiveTab('intelligence')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'intelligence' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          Alarmlar & Akıllı SLA Limitleri
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'kpi' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Main 4 KPI Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* SLA On Time Arrival Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Zamanında Varış SLA</p>
                <h3 className="text-2xl font-black text-slate-800">%{fleetMetrics.onTimeArrivalRate}</h3>
                <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Hedef %95+ Uyumu
                </p>
              </div>
            </div>

            {/* Delay card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ortalama Gecikme</p>
                <h3 className="text-2xl font-black text-slate-800">{fleetMetrics.avgDelayMinutes} dk</h3>
                <p className="text-[10px] font-medium text-slate-500">Durak Başına Sapma</p>
              </div>
            </div>

            {/* Attendance rate card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Toplam Yolcu</p>
                <h3 className="text-2xl font-black text-slate-800">{studentBoarding.totalBoardings} kişi</h3>
                <p className="text-[10px] font-medium text-red-600">%{studentBoarding.noShowRate} Devamsızlık Oranı</p>
              </div>
            </div>

            {/* Finance efficiency card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tahsilat Oranı</p>
                <h3 className="text-2xl font-black text-slate-800">%{financialMetrics.collectionRate}</h3>
                <p className="text-[10px] font-medium text-purple-600">E: ₺{financialMetrics.expectedRevenue.toLocaleString()}</p>
              </div>
            </div>

          </div>

          {/* Recharts Graphical Visualizations Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Area Chart - Expected vs Realized Finance Cashflow */}
            <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-800">Gelir & Tahsilat Karşılaştırmalı Analiz</h4>
                  <p className="text-[11px] text-slate-400">Son 6 aylık dönem hakediş ve tahsilat trendleri</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-xl">Hakediş / Tahsilat</span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="Beklenen" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorExpected)" />
                    <Area type="monotone" dataKey="Tahsil" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRealized)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart - Delay SLA Status */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-800">Zamanlama Uyum SLA Dağılımı</h4>
                <p className="text-[11px] text-slate-400">Gerçekleşen servislerin gecikme yüzdeleri</p>
              </div>

              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={delayData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {delayData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends */}
              <div className="space-y-1.5 pt-2 border-t border-slate-50">
                {delayData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                      <span>{item.name}</span>
                    </div>
                    <span>%{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Green Carbon & Fuel Optimization Insight Box */}
          <div className="bg-emerald-50/50 border border-emerald-100/80 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-black text-emerald-900 uppercase tracking-wide">YAKIT & CARBON OFFSET OPTİMİZASYON RAPORU</h5>
                <p className="text-[11px] text-emerald-800">
                  Rota konsolidasyon algoritması ile bu ay <b>{fleetMetrics.totalFuelConsumedLiters} Litre</b> dizel tasarrufu ve <b>{fleetMetrics.carbonEmissionKg} KG</b> karbon salınım engellemesi gerçekleşti.
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 transition-colors">
              Karbon Sertifikası Al
            </button>
          </div>

        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-800">Kiracı (Tenant) Şirket Organizasyonları</h4>
              <p className="text-xs text-slate-400">Lisanslı taşımacılık firmalarının izole veri modeli ve yetki şemaları</p>
            </div>
            
            <button 
              onClick={handleCreateTenant}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors w-fit"
            >
              <Layers className="w-4 h-4" />
              Yeni Şirket (Tenant) Ekle
            </button>
          </div>

          {/* Multi-Tenant List View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenantList.map(t => {
              const isSelected = selectedTenant === t.tenantId;
              return (
                <div 
                  key={t.tenantId} 
                  onClick={() => setSelectedTenant(t.tenantId)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-4 ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50/10 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider rounded">
                        ID: {t.tenantId}
                      </span>
                      <h5 className="text-sm font-black text-slate-800">{t.companyName}</h5>
                      <p className="text-[11px] text-slate-400 font-mono">{t.domain || 'varsayılan-alt-alan.com'}</p>
                    </div>

                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isSelected ? 'Aktif Seçili' : 'Seç'}
                    </span>
                  </div>

                  {/* Licensing Tier info if selected */}
                  <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 text-[10px]">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-bold block">Paket Sınıfı</span>
                      <span className="text-slate-800 font-black uppercase">{activeSubscription.tier}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-bold block">Max Araç</span>
                      <span className="text-slate-800 font-black">{activeSubscription.maxVehicles} Adet</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-bold block">Para Birimi</span>
                      <span className="text-slate-800 font-black">{t.currency}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Config Box */}
          <div className="p-5 bg-indigo-50/40 rounded-3xl border border-indigo-100/50 space-y-4">
            <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              SaaS Abonelik Paketleri ve Lisanslama Yapılandırması
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center space-y-2">
                <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">BASIC</span>
                <p className="text-lg font-black text-slate-800">₺1.999 <span className="text-[9px] text-slate-400">/ ay</span></p>
                <p className="text-[10px] text-slate-400">10 Araç, 150 Öğrenci, Standard SMS</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border-2 border-indigo-500 text-center space-y-2 relative">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">En Popüler</span>
                <span className="text-[10px] font-black bg-indigo-50 px-2 py-0.5 rounded text-indigo-600">PROFESSIONAL</span>
                <p className="text-lg font-black text-slate-800">₺4.999 <span className="text-[9px] text-slate-400">/ ay</span></p>
                <p className="text-[10px] text-slate-400">50 Araç, 1000 Öğrenci, Whatsapp API</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center space-y-2">
                <span className="text-[10px] font-black bg-purple-50 px-2 py-0.5 rounded text-purple-600">ENTERPRISE</span>
                <p className="text-lg font-black text-slate-800">Özel Teklif</p>
                <p className="text-[10px] text-slate-400">Sınırsız Araç, Dedicated Sunucu, Beyaz Etiket (White Label)</p>
              </div>

            </div>
          </div>

        </div>
      )}

      {activeTab === 'intelligence' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6 animate-fade-in">
          <div className="space-y-1">
            <h4 className="text-base font-black text-slate-800 font-sans">Akıllı Operasyon SLA ve Rota Sapma Ayarları</h4>
            <p className="text-xs text-slate-400">Yapay zeka ve kural tabanlı alarm parametrelerini yönetin</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Hız & Coğrafi Çit (Geofence) Limitleri</h5>
              
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">Hız Limiti Alarmı (Sürat Uyarısı)</p>
                    <p className="text-[10px] text-slate-400">Belirlenen hız aşılınca driver ve yöneticiye anlık uyarı gider</p>
                  </div>
                  <input type="number" defaultValue={80} className="w-16 text-center text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">Rota Koridor Sapma Toleransı (Metre)</p>
                    <p className="text-[10px] text-slate-400">OSRM rota çizgisinden kaç metre sapmaya izin verileceği</p>
                  </div>
                  <input type="number" defaultValue={150} className="w-16 text-center text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">Bekleme SLA Süresi (Dakika)</p>
                    <p className="text-[10px] text-slate-400">Durakta öğrenciyi bekleme süresi aşım uyarısı</p>
                  </div>
                  <input type="number" defaultValue={3} className="w-16 text-center text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Entegre Bildirim Tetikleyicileri</h5>

              <div className="space-y-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">Gecikme Durumunda Velilere Otomatik WhatsApp Gönderimi</p>
                    <p className="text-[10px] text-slate-400">Gecikme süresi 5 dakikayı aştığında sistem WhatsApp API ile veliyi uyarır.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">Şoför Rölanti Durumu Anomali Analizi</p>
                    <p className="text-[10px] text-slate-400">Araç motoru çalışırken 10 dakikadan uzun durmalarda rapor tutulur.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">Evrak Geçerlilik Süresi Erken Uyarı Bildirimi</p>
                    <p className="text-[10px] text-slate-400">Ehliyet, Muayene, SRC belgelerine 30 gün kala otomatik SMS gönderilir.</p>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Action Trigger Buttons */}
          <div className="flex justify-end pt-4 border-t border-slate-100 gap-2.5">
            <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors">
              Varsayılana Sıfırla
            </button>
            <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shadow-sm">
              SLA Ayarlarını Kaydet
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
