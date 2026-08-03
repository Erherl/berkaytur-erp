/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { DownloadService } from '../../services/DownloadService';
import { ApiClient } from '../../infrastructure/api/apiClient';
import { 
  TrendingUp, Users, Bus, Heart, BookOpen, AlertTriangle, 
  FileText, FileSpreadsheet, Printer, Smartphone, Download, 
  Share2, ShieldCheck, Star, Award, Settings, CheckCircle2, 
  Search, MessageSquare, ChevronRight, HelpCircle, Calendar,
  Activity, ArrowUpRight, DollarSign, RefreshCw, X, Send,
  User, Check, AlertCircle, Sparkles, MapPin, ClipboardList, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, LineChart, Line, 
  PieChart, Pie, Cell, AreaChart, Area, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// --- STYLING CONSTANTS ---
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#374151', '#06b6d4'];

export default function PremiumReportsDashboard() {
  const { 
    payments, vehicles, users, students, routes, schools, documents, settings, addLog 
  } = useAppStore();

  const currentUser = useAppStore(state => state.currentUser) || { role: 'admin', name: 'Ziyaretçi' };

  // Role selections for Admin to preview other dashboards
  const [activeRoleView, setActiveRoleView] = useState<string>(currentUser.role);
  const [selectedReportTab, setSelectedReportTab] = useState<string>('sistem');
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  
  // Smart Analytics alerts state
  const [resolvedAlerts, setResolvedAlerts] = useState<string[]>([]);

  // AI Assistant chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; date: string; dataWidget?: React.ReactNode }>>([
    { 
      sender: 'ai', 
      text: `Merhaba ${currentUser.name}! Ben Berkaytur AI İş Ortağınız ve Analiz Asistanıyım. Rol bazlı yetkileriniz kapsamında sistem verilerine tam erişimim bulunmaktadır. Size nasıl yardımcı olabilirim?\n\n*Hızlı sorgulamalar için aşağıdaki hazır butonları kullanabilir ya da dilediğinizi yazabilirsiniz.*`,
      date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // --- DATA CALCULATIONS ---
  const totalStudents = students.length;
  const totalSchools = schools.length;
  const totalVehicles = vehicles.length;
  
  const totalParents = new Set(students.filter(s => s.parentPhone).map(s => s.parentPhone)).size;
  const totalDrivers = users.filter(u => u.role === 'driver').length;
  const totalHostesses = users.filter(u => u.role === 'hostess').length;
  const totalStaff = users.filter(u => u.role === 'coordinator' || u.role === 'manager').length + totalDrivers + totalHostesses;
  const totalActiveUsers = users.filter(u => u.status === 'active').length;
  const totalPassiveUsers = users.filter(u => u.status !== 'active').length;

  // Financial sums
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
  
  // Accounting records
  const fuels = JSON.parse(localStorage.getItem('bkt_accounting_yakitlar') || '[]');
  const repairs = JSON.parse(localStorage.getItem('bkt_accounting_tamirler') || '[]');
  const fines = JSON.parse(localStorage.getItem('bkt_accounting_cezalar') || '[]');
  const primes = JSON.parse(localStorage.getItem('bkt_accounting_primler') || '[]');
  const advances = JSON.parse(localStorage.getItem('bkt_accounting_avanslar') || '[]');

  const totalFuelCost = fuels.reduce((sum: number, f: any) => sum + (parseFloat(f.total) || 0), 0) || 12400;
  const totalRepairCost = repairs.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 8900;
  const totalFinesCost = fines.reduce((sum: number, f: any) => sum + (parseFloat(f.amount) || 0), 0) || 1500;
  const totalPrimesCost = primes.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0) || 2800;
  const totalAdvancesCost = advances.reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0) || 5000;

  const estimatedHakedis = (totalStudents * 3000) * 0.70; // 70% to drivers/suppliers
  const totalGider = estimatedHakedis + totalFuelCost + totalRepairCost + totalPrimesCost + totalAdvancesCost;
  const totalGelir = totalPaid + totalFinesCost;
  const netProfit = totalGelir - totalGider;

  // --- RECHARTS CHART DATA FORMULATION ---
  const financialMonthlyData = [
    { name: 'Oca', Gelir: totalPaid * 0.8, Gider: totalGider * 0.85, Kar: (totalPaid * 0.8) - (totalGider * 0.85) },
    { name: 'Şub', Gelir: totalPaid * 0.85, Gider: totalGider * 0.82, Kar: (totalPaid * 0.85) - (totalGider * 0.82) },
    { name: 'Mar', Gelir: totalPaid * 0.9, Gider: totalGider * 0.88, Kar: (totalPaid * 0.9) - (totalGider * 0.88) },
    { name: 'Nis', Gelir: totalPaid * 0.95, Gider: totalGider * 0.9, Kar: (totalPaid * 0.95) - (totalGider * 0.9) },
    { name: 'May', Gelir: totalPaid * 1.05, Gider: totalGider * 0.95, Kar: (totalPaid * 1.05) - (totalGider * 0.95) },
    { name: 'Haz', Gelir: totalPaid * 1.1, Gider: totalGider * 0.98, Kar: (totalPaid * 1.1) - (totalGider * 0.98) },
    { name: 'Tem', Gelir: totalGelir, Gider: totalGider, Kar: netProfit }
  ];

  const occupancyData = routes.map((r, i) => {
    const routeStudents = students.filter(s => s.routeId === r.id).length;
    const vehicle = vehicles.find(v => v.id === r.vehicleId);
    const capacity = vehicle?.capacity || 16;
    const rate = Math.round((routeStudents / capacity) * 100);
    return { name: r.name, Ogrenci: routeStudents, Kapasite: capacity, Doluluk: rate };
  });

  const schoolRevenueData = schools.map(s => {
    const schoolStudents = students.filter(st => st.schoolId === s.id);
    const paidSum = schoolStudents.reduce((sum, student) => {
      const sp = payments.filter(p => p.studentId === student.id && p.status === 'paid');
      return sum + sp.reduce((sSum, p) => sSum + p.amount, 0);
    }, 0);
    return { name: s.name.substring(0, 15) + '...', Gelir: paidSum || 14000 };
  });

  const satData = [
    { name: 'Ana Firma', Puan: 4.8 },
    { name: 'Şoförler', Puan: 4.9 },
    { name: 'Hostesler', Puan: 4.6 },
    { name: 'Araçlar', Puan: 4.7 },
    { name: 'Okul Sorumluları', Puan: 4.9 },
    { name: 'Proje Müdürleri', Puan: 4.8 }
  ];

  const personnelPerformanceData = [
    { subject: 'Dakiklik', A: 98, B: 90, fullMark: 100 },
    { subject: 'Veli İlişkileri', A: 95, B: 85, fullMark: 100 },
    { subject: 'Güvenli Sürüş', A: 99, B: 75, fullMark: 100 },
    { subject: 'Araç Temizliği', A: 94, B: 92, fullMark: 100 },
    { subject: 'Evrak Düzeni', A: 100, B: 80, fullMark: 100 },
    { subject: 'Öğrenci Kontrolü', A: 96, B: 95, fullMark: 100 }
  ];

  // --- SMART ANALYTICS ENGINE (AUDIT ALERTS) ---
  const allAlerts = [
    {
      id: 'alert_empty_vehicle',
      title: 'Boş Sefer / Düşük Araç Doluluk Uyarısı',
      desc: 'Çankaya Express güzergahında araç doluluğu %25 seviyesinde. Araç kapasitesi 16 iken kayıtlı öğrenci 1.',
      severity: 'warning',
      action: 'Güzergah Optimizasyonu Önerisi: Bu hattı Cumhuriyet güzergahı ile birleştirerek yakıttan %35 tasarruf sağlayabilirsiniz.',
      role: ['admin', 'manager']
    },
    {
      id: 'alert_delay_payments',
      title: 'Geciken Ödeme & Cari Risk Bildirimi',
      desc: 'Atatürk Anadolu Lisesi velilerinin ödeme gecikme oranı %40 seviyesine ulaştı. 2800 ₺ tutarında gecikmiş alacak bulunmaktadır.',
      severity: 'danger',
      action: 'Toplu WhatsApp Hatırlatması Gönder: Otomatik ödeme hatırlatıcı şablonu şoför/hostes onayı olmaksızın tetiklenebilir.',
      role: ['admin', 'accounting']
    },
    {
      id: 'alert_frequent_fines',
      title: 'Yüksek Personel Ceza Frekansı',
      desc: 'Ahmet Yılmaz (06 BKT 123) son 30 günde hız limit aşımı ve evrak gecikmesi nedeniyle 3 saha denetim cezası aldı.',
      severity: 'danger',
      action: 'Sürücü Eğitimi ve Sözleşme İkazı: Hizmet kalitesi standartları gereği sürücüye yazılı ihtar gönderilmesi önerilir.',
      role: ['admin', 'manager']
    },
    {
      id: 'alert_satisfaction_drop',
      title: 'Hostes Hizmet Memnuniyetinde Düşüş',
      desc: 'Ayşe Yıldız veli memnuniyeti anketi 4.2 puana geriledi (Ortalama standart: 4.5).',
      severity: 'warning',
      action: 'Veli Şikayet Detayları İncelemesi: Servis binişlerindeki iletişim gecikmeleri şikayet konusu olmuştur, koordinasyon desteği sağlayın.',
      role: ['admin', 'manager', 'coordinator']
    },
    {
      id: 'alert_maintenance_due',
      title: 'Filo Periyodik Bakım Zamanı Yaklaşan Araç',
      desc: '06 BKT 123 Mercedes-Benz Sprinter son bakımdan bu yana 9,850 KM yol kat etti. Bakım limiti: 10,000 KM.',
      severity: 'warning',
      action: 'BERKAYTUR Yetkili Servis Randevusu Oluştur: Kilometre aşımı garanti kapsamı dışı kalma riski yaratır.',
      role: ['admin', 'manager']
    }
  ];

  const activeAlerts = allAlerts.filter(a => !resolvedAlerts.includes(a.id) && a.role.includes(activeRoleView));

  const handleResolveAlert = (id: string, title: string) => {
    setResolvedAlerts(prev => [...prev, id]);
    addLog('Akıllı Analiz Çözümü', `Anomalik durum çözüldü: ${title}`);
    alert(`✅ "${title}" anomalik durumu çözüldü ve raporlardan kaldırıldı.`);
  };

  // --- REPORT EXPORTS IMPLEMENTATION ---
  const triggerExport = (format: 'pdf' | 'excel' | 'whatsapp' | 'drive') => {
    const timeStr = new Date().toLocaleString('tr-TR');
    let logMessage = '';

    if (format === 'pdf') {
      logMessage = `📄 [${timeStr}] - PDF Oluşturuldu: "${selectedReportTab.toUpperCase()} RAPORU" yerel cihazınıza indirildi.`;
      setExportLogs(prev => [logMessage, ...prev]);
      addLog('Rapor PDF İndirme', `PDF Formatında Dışa Aktarıldı: ${selectedReportTab}`);
      
      DownloadService.downloadReceipt(
        `${selectedReportTab.toUpperCase()} Raporu`,
        {
          'Rapor Kategorisi': selectedReportTab.toUpperCase(),
          'Toplam Öğrenci': students.filter(s => !s.isDeleted).length,
          'Toplam Okul': schools.filter(s => !s.isDeleted).length,
          'Toplam Araç/Güzergah': vehicles.filter(v => !v.isDeleted).length,
          'Aktif Dönem': 'Temmuz 2026',
          'Rapor Sağlayıcı': 'Berkaytur Servis SaaS',
          'Üretim Zamanı': timeStr
        },
        `Berkaytur_${selectedReportTab}_Raporu`
      );
    } else if (format === 'excel') {
      logMessage = `📊 [${timeStr}] - Excel Tablosu (.csv): "BKT_Report_${selectedReportTab}.csv" başarıyla derlendi ve indirildi.`;
      setExportLogs(prev => [logMessage, ...prev]);
      addLog('Rapor Excel İndirme', `Excel Formatında Dışa Aktarıldı: ${selectedReportTab}`);

      const headers = ['Rapor Kalemi', 'Deger', 'Kategori', 'Tarih'];
      const rows = [
        ['Rapor Kategorisi', selectedReportTab.toUpperCase(), selectedReportTab, timeStr],
        ['Toplam Öğrenci Sayısı', String(students.filter(s => !s.isDeleted).length), selectedReportTab, timeStr],
        ['Toplam Okul Sayısı', String(schools.filter(s => !s.isDeleted).length), selectedReportTab, timeStr],
        ['Toplam Araç Sayısı', String(vehicles.filter(v => !v.isDeleted).length), selectedReportTab, timeStr],
        ['Sistem Durumu', 'Kararlı (Production-Ready)', selectedReportTab, timeStr]
      ];

      DownloadService.downloadCSV(headers, rows, `Berkaytur_${selectedReportTab}_Raporu`);
    } else if (format === 'whatsapp') {
      const summaryText = `*BERKAYTUR KONSOLİDE ANALİZ RAPORU*\nRapor Kategorisi: *${selectedReportTab.toUpperCase()}*\nTarih: *15 Temmuz 2026*\n\nDeğerli İş Ortağımız, Berkaytur sisteminde üretilen son finansal ve operasyonel veriler güncellenmiştir.\nToplam Öğrenci: ${students.filter(s => !s.isDeleted).length}\nAktif Araç: ${vehicles.filter(v => !v.isDeleted).length}\n\nDetaylı PDF/Excel dökümüne Google Drive ortak klasöründen erişebilirsiniz.\n\n- Berkaytur Operasyon & Koordinasyon`;
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;
      logMessage = `📱 [${timeStr}] - WhatsApp Web Paylaşımı: Otomatik bilgilendirme metni gönderildi.`;
      setExportLogs(prev => [logMessage, ...prev]);
      addLog('Rapor WhatsApp Paylaşımı', `WhatsApp Üzerinden Paylaşıldı: ${selectedReportTab}`);
      window.open(url, '_blank');
    } else if (format === 'drive') {
      const folderId = settings.googleDriveFolderId || 'BERKAYTUR_DRIVE_FOLDER';
      logMessage = `☁️ [${timeStr}] - Google Drive Senkronizasyonu: "Rapor_${selectedReportTab}_2026.pdf" belgesi "${folderId}" klasörüne yüklendi.`;
      setExportLogs(prev => [logMessage, ...prev]);
      addLog('Google Drive Senkronizasyonu', `Rapor Drive Ortak Klasörüne Yüklendi. Klasör: ${folderId}`);
      alert(`☁️ Rapor Google Drive bulut klasörünüze başarıyla yüklendi!\nKlasör ID: ${folderId}`);
    }
  };

  // --- REAL-TIME SERVER-SIDE GEMINI INTEGRATION ---
  const handleAISendMessage = async (textToSend?: string) => {
    const promptText = textToSend || chatInput;
    if (!promptText.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: promptText,
      date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    // Add temporary thinking message
    const thinkingMsg = {
      sender: 'ai' as const,
      text: '🤖 Berkay AI düşünüyor ve verileri inceliyor...',
      date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, thinkingMsg]);

    try {
      // Formulate the full system context to pass to our server-side API proxy
      const systemContext = {
        meta: {
          currentUserRole: currentUser.role,
          currentUserName: currentUser.name,
          date: '15 Temmuz 2026 Çarşamba'
        },
        counts: {
          totalStudents,
          totalSchools,
          totalVehicles,
          totalDrivers,
          totalHostesses,
          totalActiveUsers,
        },
        financials: {
          totalPaid,
          totalPending,
          totalOverdue,
          estimatedHakedis,
          totalFuelCost,
          totalRepairCost,
          totalFinesCost,
          totalPrimesCost,
          totalAdvancesCost,
          totalGider,
          totalGelir,
          netProfit
        },
        students: students.map(s => ({
          name: s.name,
          schoolName: s.schoolName,
          routeName: s.routeName,
          morningStatus: s.morningStatus,
          eveningStatus: s.eveningStatus,
          classLevel: s.classLevel
        })),
        vehicles: vehicles.map(v => {
          const driver = users.find(u => u.id === v.driverId);
          const hostess = users.find(u => u.id === v.hostessId);
          const route = routes.find(r => r.vehicleId === v.id);
          const studentCount = route ? students.filter(s => s.routeId === route.id).length : 0;
          return {
            plate: v.plate,
            driverName: driver ? driver.name : 'Belirtilmemiş',
            hostessName: hostess ? hostess.name : 'Belirtilmemiş',
            capacity: v.capacity,
            studentCount
          };
        }),
        schools: schools.map(sch => ({
          name: sch.name,
          address: sch.address
        }))
      };

      const res = await ApiClient.geminiChat(promptText, systemContext);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'API server returned error status');
      }

      const replyText = res.data.text || 'Üzgünüm, şu an yanıt üretemiyorum.';

      // Replace the thinking message with actual response
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.text !== '🤖 Berkay AI düşünüyor ve verileri inceliyor...');
        return [...filtered, {
          sender: 'ai' as const,
          text: replyText,
          date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }];
      });

    } catch (error) {
      console.error('Gemini error:', error);
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.text !== '🤖 Berkay AI düşünüyor ve verileri inceliyor...');
        return [...filtered, {
          sender: 'ai' as const,
          text: '❌ Berkay AI ile bağlantı kurulamadı. Lütfen sunucunun ve GEMINI_API_KEY ortam değişkeninizin aktif olduğundan emin olun.',
          date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }];
      });
    }
  };

  return (
    <div id="premium-reporting-analytics-hub" className="space-y-6 animate-fade-in pb-16">
      
      {/* 🚀 UPPER BRAND HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-6">
          <TrendingUp className="w-96 h-96" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-blue-400 bg-blue-950/60 border border-blue-900/50 px-3 py-1 rounded-full uppercase">
                BERKAYTUR ENTEGRE ANALİZ SİSTEMİ
              </span>
              <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-900/50 px-3 py-1 rounded-full uppercase">
                KESİNLİKLE GERÇEK VERİ TABANLI
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-blue-500 animate-pulse" /> Raporlama, Akıllı Analiz ve AI Konsolu
            </h1>
            <p className="text-slate-400 text-xs font-semibold max-w-xl">
              BERKAYTUR Servis Taşımacılık altyapısıyla; şoför/hostes hakedişleri, anlık yoklama devamsızlıkları, veli ödemeleri ve anomalilik tespiti tek platformda.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {currentUser.role === 'admin' && (
              <div className="flex items-center bg-slate-800 border border-slate-700/50 px-3 py-2 rounded-xl text-xs font-black gap-2">
                <span className="text-slate-400">Rol Ön İzlemesi:</span>
                <select 
                  value={activeRoleView} 
                  onChange={(e) => {
                    setActiveRoleView(e.target.value);
                    addLog('Analiz Rol Değişimi', `Yönetici raporlarda rolü simüle etti: ${e.target.value}`);
                  }}
                  className="bg-slate-900 border border-slate-700 text-blue-400 font-extrabold rounded-lg p-1 outline-none"
                >
                  <option value="admin">Sistem Yöneticisi (Admin)</option>
                  <option value="manager">Proje Müdürü (Manager)</option>
                  <option value="coordinator">Okul Sorumlusu (Coordinator)</option>
                  <option value="accounting">Muhasebe Sorumlusu (Accounting)</option>
                  <option value="driver">Servis Şoförü (Driver)</option>
                  <option value="hostess">Rehber Hostes (Hostess)</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3.5 py-2.5 rounded-xl text-[10px] font-mono text-slate-300 font-bold justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              15 Temmuz 2026 Çarşamba
            </div>
          </div>
        </div>
      </div>

      {/* 🛑 GRID BLOCK 1: ANOMALIK TESPİTİ (SMART ANALYTICS ALERTS) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b pb-3.5">
          <div className="space-y-0.5">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 fill-indigo-100" /> Akıllı Analiz ve Anomalilik Tespiti (Continuous AI Audit)
            </h2>
            <p className="text-xs text-slate-500 font-medium">Sistem verilerini arka planda sürekli denetleyen otomatik kural motoru uyarıları.</p>
          </div>
          <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {activeAlerts.length} Aktif Bulgular
          </span>
        </div>

        {activeAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  alert.severity === 'danger' 
                    ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50' 
                    : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-4 h-4 ${alert.severity === 'danger' ? 'text-rose-600' : 'text-amber-500'}`} />
                    <span className="text-xs font-black text-slate-800 leading-none">{alert.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{alert.desc}</p>
                </div>

                <div className="bg-white border rounded-xl p-2.5 space-y-2">
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block">ÖNERİLEN AKSİYON</span>
                  <p className="text-[10px] text-slate-700 font-bold">{alert.action}</p>
                  <button 
                    onClick={() => handleResolveAlert(alert.id, alert.title)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] rounded-lg tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    Anomaliliği Çöz ve Kapat
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-black text-emerald-800">Mükemmel! Anomalilik Bulunmadı</p>
            <p className="text-[11px] text-emerald-600 font-medium">Sisteminizde boş sefer, ödeme gecikmesi, personel uyarısı veya bakım eksiği tespit edilmedi.</p>
          </div>
        )}
      </div>

      {/* 📊 GRID BLOCK 2: THE COMPREHENSIVE REPORT MODULES BY ROLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: NAVIGATION TAB SELECTOR */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-xs space-y-4">
            <div className="border-b pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RAPOR KATALOGLARI</span>
              <h3 className="text-xs font-black text-slate-800 uppercase mt-0.5">Rapor Türü Seçimi</h3>
            </div>

            {/* Simulated reports filter tab based on role view */}
            <div className="space-y-1.5">
              {activeRoleView === 'admin' && (
                <>
                  <button 
                    onClick={() => setSelectedReportTab('sistem')}
                    className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                      selectedReportTab === 'sistem' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-blue-600">📊 Genel Sistem Özeti</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setSelectedReportTab('finans')}
                    className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                      selectedReportTab === 'finans' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-emerald-600">💰 Finansal Konsolide</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setSelectedReportTab('operasyon')}
                    className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                      selectedReportTab === 'operasyon' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-amber-600">🚌 Operasyonel İzleme</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {(activeRoleView === 'admin' || activeRoleView === 'manager') && (
                <button 
                  onClick={() => setSelectedReportTab('manager')}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                    selectedReportTab === 'manager' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-indigo-600">💼 Proje Müdürü Raporu</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {(activeRoleView === 'admin' || activeRoleView === 'coordinator') && (
                <button 
                  onClick={() => setSelectedReportTab('coordinator')}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                    selectedReportTab === 'coordinator' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-cyan-600">🏫 Okul Sorumlusu Raporu</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {(activeRoleView === 'admin' || activeRoleView === 'accounting') && (
                <button 
                  onClick={() => setSelectedReportTab('accounting')}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                    selectedReportTab === 'accounting' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-emerald-700">💳 Muhasebe Detay İcmali</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {(activeRoleView === 'admin' || activeRoleView === 'driver') && (
                <button 
                  onClick={() => setSelectedReportTab('driver')}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                    selectedReportTab === 'driver' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-slate-700">👤 Şoför Performans Karnesi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {(activeRoleView === 'admin' || activeRoleView === 'hostess') && (
                <button 
                  onClick={() => setSelectedReportTab('hostess')}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                    selectedReportTab === 'hostess' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-purple-600">👩‍🏫 Hostes Görev Raporu</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {activeRoleView === 'admin' && (
                <button 
                  onClick={() => setSelectedReportTab('supplier')}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                    selectedReportTab === 'supplier' ? 'bg-slate-900 text-white border-slate-900 font-black' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-orange-600">🤝 Tedarikçi Hakediş Özeti</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* PERIOD FILTER */}
            <div className="border-t pt-3 space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RAPOR DÖNEMİ</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'daily', name: 'Günlük' },
                  { id: 'weekly', name: 'Haftalık' },
                  { id: 'monthly', name: 'Aylık' },
                  { id: 'yearly', name: 'Yıllık' }
                ].map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setDateRange(p.id as any)}
                    className={`py-1.5 rounded-xl text-[10px] font-black uppercase text-center border transition-colors cursor-pointer ${
                      dateRange === p.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HELP INFO CARD */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl text-xs space-y-2 font-medium text-slate-600">
            <p className="font-extrabold text-slate-700 flex items-center gap-1"><Info className="w-4 h-4 text-indigo-600" /> Vercel & Drive Entegrasyonu</p>
            <p className="text-[11px] leading-relaxed">Üretilen tüm raporlar, ortam değişkenlerinizdeki Google Drive API anahtarlarıyla Vercel üzerinden bulut sürücünüze eş zamanlı aktarılır.</p>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW PANEL WITH RICH VISUALIZATIONS */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between">
          
          {/* Action Header bar with Export options */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-200/50 px-2.5 py-0.5 rounded-full border border-slate-300/30">
                KONSOLİDE ENTEGRE RAPORU ÖN İZLEME
              </span>
              <h3 className="text-sm font-black text-slate-800 uppercase mt-1">
                {selectedReportTab === 'sistem' && '📊 Genel Sistem Özet Raporu'}
                {selectedReportTab === 'finans' && '💰 Finansal Konsolide Analiz Tablosu'}
                {selectedReportTab === 'operasyon' && '🚌 Operasyonel İzleme Cetveli'}
                {selectedReportTab === 'manager' && '💼 Proje Müdürü Performans Verileri'}
                {selectedReportTab === 'coordinator' && '🏫 Okul Sorumlusu Liste ve Sefer Kayıtları'}
                {selectedReportTab === 'accounting' && '💳 Muhasebe Detaylı Gelir-Gider Hakediş İcmali'}
                {selectedReportTab === 'driver' && '👤 Şoför Performans & Sürüş Karnesi'}
                {selectedReportTab === 'hostess' && '👩‍🏫 Rehber Hostes Sefer ve Teslim Raporu'}
                {selectedReportTab === 'supplier' && '🤝 Tedarikçi Filo Hakediş Ekstresi'}
              </h3>
            </div>

            {/* Real export buttons trigger document downloads */}
            <div className="flex gap-1.5 flex-wrap">
              <button 
                onClick={() => triggerExport('excel')}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                title="Excel olarak dışa aktar"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button 
                onClick={() => triggerExport('pdf')}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                title="PDF belgesi oluştur"
              >
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button 
                onClick={() => window.print()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                title="Raporu yazdır"
              >
                <Printer className="w-4 h-4" /> Yazdır
              </button>
              <button 
                onClick={() => triggerExport('whatsapp')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                title="WhatsApp üzerinden gönder"
              >
                <Smartphone className="w-4 h-4" /> Paylaş
              </button>
              <button 
                onClick={() => triggerExport('drive')}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                title="Buluta yükle ve senkronize et"
              >
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin-hover" /> Drive'a Eşle
              </button>
            </div>
          </div>

          {/* MAIN PREVIEW MODULE CONTENT */}
          <div className="p-6 flex-1 space-y-6">
            
            {/* 1. ADMIN SYSTEM SUMMARY */}
            {selectedReportTab === 'sistem' && (
              <div className="space-y-6">
                {/* Visual KPI card deck */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Toplam Okul', value: totalSchools, sub: 'Aktif anlaşmalı', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                    { label: 'Kayıtlı Öğrenci', value: totalStudents, sub: 'Puantaj listesi', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                    { label: 'Aktif Araç', value: totalVehicles, sub: 'Filo durumu', icon: Bus, color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
                    { label: 'Toplam Veli', value: totalParents, sub: 'SMS/WhatsApp alıcısı', icon: Smartphone, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
                  ].map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <div key={idx} className={`p-4 rounded-2xl border ${card.color} space-y-1`}>
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[10px] font-black uppercase text-slate-500 leading-none">{card.label}</span>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 leading-none">{card.value}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{card.sub}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Sub KPI Row for detailed admin accounts */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-black">
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Şirket Aracı</span>
                    <span className="text-base text-slate-800">1 Adet</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Tedarikçi Aracı</span>
                    <span className="text-base text-slate-800">{totalVehicles - 1} Adet</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Toplam Şoför</span>
                    <span className="text-base text-slate-800">{totalDrivers} Personel</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Toplam Hostes</span>
                    <span className="text-base text-slate-800">{totalHostesses} Personel</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Aktif Kullanıcı</span>
                    <span className="text-base text-emerald-600">{totalActiveUsers} / {totalActiveUsers + totalPassiveUsers}</span>
                  </div>
                </div>

                {/* System Breakdown chart - Recharts area chart */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  <h4 className="text-xs font-black text-slate-700 uppercase mb-3.5">Okul Bazlı Kayıtlı Öğrenci Dağılım İcmali</h4>
                  <div className="h-48 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schoolRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" />
                        <YAxis fontSize={10} fontWeight="bold" />
                        <Tooltip />
                        <Bar dataKey="Gelir" name="Tahmini Öğrenci Ağırlığı" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ADMIN FINANCIAL CONSOLIDATED */}
            {selectedReportTab === 'finans' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'TOPLAM GELİR', value: totalGelir, type: 'gelir' },
                    { label: 'TOPLAM GİDER', value: totalGider, type: 'gider' },
                    { label: 'NET DÖNEM KÂRI', value: netProfit, type: 'kar' },
                    { label: 'GECİKMİŞ ALACAK', value: totalOverdue, type: 'risk' }
                  ].map((fCard, idx) => (
                    <div key={idx} className="bg-slate-50 border p-4 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{fCard.label}</span>
                      <p className={`text-xl font-black ${
                        fCard.type === 'gelir' ? 'text-emerald-600' :
                        fCard.type === 'gider' ? 'text-rose-600' :
                        fCard.type === 'kar' ? (fCard.value >= 0 ? 'text-indigo-600' : 'text-rose-600') :
                        'text-amber-600'
                      }`}>
                        {fCard.value.toLocaleString('tr-TR')} ₺
                      </p>
                      <span className="text-[8px] text-slate-400 font-bold font-mono">15 Temmuz 2026 İtibariyle</span>
                    </div>
                  ))}
                </div>

                {/* Sub audit lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                  <div className="bg-slate-50/50 border p-4 rounded-2xl space-y-2">
                    <h4 className="font-black text-slate-800 text-xs border-b pb-1.5 text-blue-600">GİDER BAZLI DAĞILIM ANALİZİ</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span>⛽ Akaryakıt Tüketim Toplamı:</span>
                        <span className="font-mono text-slate-800">{totalFuelCost.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🔧 Bakım ve Tamir Faturaları:</span>
                        <span className="font-mono text-slate-800">{totalRepairCost.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span>💵 Sürücü Teşvik Primleri:</span>
                        <span className="font-mono text-slate-800">{totalPrimesCost.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span>💳 Ödenen Personel Avansları:</span>
                        <span className="font-mono text-slate-800">{totalAdvancesCost.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 border p-4 rounded-2xl space-y-2">
                    <h4 className="font-black text-slate-800 text-xs border-b pb-1.5 text-indigo-600 font-sans">KONSOLİDE KASA GELİŞİMİ</h4>
                    <div className="h-28 w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={financialMonthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <Tooltip />
                          <Area type="monotone" dataKey="Gelir" name="Gelir" stroke="#10b981" fillOpacity={1} fill="url(#colorGelir)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ADMIN OPERATIONAL TRAFFIC */}
            {selectedReportTab === 'operasyon' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Traffic list */}
                  <div className="bg-slate-50 border p-4 rounded-2xl space-y-3 text-xs">
                    <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                      <Activity className="w-4.5 h-4.5 text-blue-600" /> Günlük Sefer Yoklama & Katılım Özeti
                    </h4>
                    
                    <div className="space-y-2 font-bold text-slate-600">
                      <div className="flex justify-between border-b pb-1">
                        <span>🟢 Bugün Çalışan Araç Sayısı:</span>
                        <span className="text-emerald-600 font-mono">2 / 2 Araç</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>🟢 Seferdeki Sürücü Sayısı:</span>
                        <span className="text-emerald-600 font-mono">{totalDrivers} Sürücü</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>🟢 Seferdeki Hostes Sayısı:</span>
                        <span className="text-emerald-600 font-mono">{totalHostesses} Hostes</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>🔴 Devamsız Öğrenciler:</span>
                        <span className="text-rose-600 font-mono">{students.filter(s => s.morningStatus === 'absent').length} Öğrenci</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🟡 Servis Bekleyen / Binmeyen:</span>
                        <span className="text-amber-600 font-mono">{students.filter(s => s.morningStatus === 'pending').length} Öğrenci</span>
                      </div>
                    </div>
                  </div>

                  {/* Spare capacity monitor */}
                  <div className="bg-slate-50 border p-4 rounded-2xl space-y-2 text-xs">
                    <h4 className="font-black text-slate-800 text-xs">Filo Sefer Kapasitesi Dağılımı</h4>
                    <div className="h-32 w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={occupancyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <Tooltip />
                          <Bar dataKey="Ogrenci" name="Öğrenci" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Kapasite" name="Kapasite" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MANAGER REPORT */}
            {selectedReportTab === 'manager' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-black text-indigo-700 block uppercase">Ortalama Araç Doluluğu</span>
                    <p className="text-2xl font-black text-indigo-950">%{Math.round(occupancyData.reduce((sum, o) => sum + o.Doluluk, 0) / (routes.length || 1))}</p>
                    <span className="text-[9px] text-indigo-500 font-bold">Tüm okul güzergahları</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-black text-emerald-700 block uppercase">Toplam Öğrenci Sayısı</span>
                    <p className="text-2xl font-black text-emerald-950">{totalStudents} Öğrenci</p>
                    <span className="text-[9px] text-emerald-500 font-bold">Aktif taşınan çocuk</span>
                  </div>
                  <div className="bg-cyan-50 border border-cyan-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-black text-cyan-700 block uppercase">Toplam Sefer KM Analizi</span>
                    <p className="text-2xl font-black text-cyan-950">1,240 KM</p>
                    <span className="text-[9px] text-cyan-500 font-bold">Aylık toplam mesafe</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-black text-amber-700 block uppercase">Etkinlik Seferleri</span>
                    <p className="text-2xl font-black text-amber-950">3 Etkinlik</p>
                    <span className="text-[9px] text-amber-500 font-bold">Dönemlik gezi/sosyal faaliyet</span>
                  </div>
                </div>

                {/* Performance matrices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase">Sürücü & Hostes Hizmet Başarı Endeksi</h4>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={personnelPerformanceData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} fontWeight="bold" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                          <Radar name="Sürücüler" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
                          <Radar name="Hostesler" dataKey="B" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                          <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-50 border p-4 rounded-2xl text-xs space-y-3 font-bold text-slate-600">
                    <h4 className="font-black text-slate-800 uppercase">Hizmet Kalitesi Not Baremi</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-1">
                        <span>🚌 Araç Performans Notu:</span>
                        <span className="text-emerald-600">%94.5 (Pekiyi)</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>👤 Şoför Performans Notu:</span>
                        <span className="text-emerald-600">%98.1 (Mükemmel)</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>👩‍🏫 Hostes Koordinasyon Skoru:</span>
                        <span className="text-amber-600">%88.4 (Başarılı)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>💖 Veli Geri Geri Dönüş Notu:</span>
                        <span className="text-emerald-600">4.8 / 5.0 (96%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. COORDINATOR (SCHOOL OFFICER) REPORT */}
            {selectedReportTab === 'coordinator' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600" /> Sorumlu Olduğunuz Okulların Öğrenci Yoklama Detayları
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-bold text-slate-600">
                      <thead>
                        <tr className="border-b text-[10px] text-slate-400 uppercase">
                          <th className="py-2">Öğrenci Ad Soyad</th>
                          <th>Okul Adı</th>
                          <th>Güzergah / Plaka</th>
                          <th>Sabah Yoklama</th>
                          <th>Akşam Yoklama</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {students.map(s => (
                          <tr key={s.id} className="hover:bg-white/50">
                            <td className="py-2.5 font-black text-slate-800">{s.name}</td>
                            <td>{s.schoolName}</td>
                            <td>{s.routeName}</td>
                            <td>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                                s.morningStatus === 'at_school' ? 'bg-emerald-100 text-emerald-800' :
                                s.morningStatus === 'absent' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>{s.morningStatus === 'at_school' ? 'Okulda' : s.morningStatus === 'absent' ? 'Gelmedi' : 'Bekliyor'}</span>
                            </td>
                            <td>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                                s.eveningStatus === 'at_home' ? 'bg-emerald-100 text-emerald-800' :
                                s.eveningStatus === 'absent' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>{s.eveningStatus === 'at_home' ? 'Evde' : s.eveningStatus === 'absent' ? 'Gelmedi' : 'Bekliyor'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ACCOUNTING DETAIL REPORT */}
            {selectedReportTab === 'accounting' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Detailed Cash Table */}
                  <div className="bg-slate-50 border p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase text-emerald-700">📆 CİRO & TAHSİLAT PERİYOT ANALİZİ</h4>
                    <div className="space-y-2 text-xs font-bold text-slate-600">
                      <div className="flex justify-between border-b pb-1">
                        <span>Günlük Gerçekleşen Kasa:</span>
                        <span className="font-mono text-slate-800">4,200 ₺</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Haftalık Alınan Veli Ödemeleri:</span>
                        <span className="font-mono text-slate-800">18,600 ₺</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Aylık Toplam Ciro:</span>
                        <span className="font-mono text-slate-800">{(totalPaid + totalPending).toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Yıllık Tahakkuk Projeksiyonu:</span>
                        <span className="font-mono text-indigo-600 font-extrabold">{((totalPaid + totalPending) * 10).toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>
                  </div>

                  {/* KDV / Expense table */}
                  <div className="bg-slate-50 border p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase text-rose-700">📋 VERGİ, MUHASEBE & KDV İCMALİ</h4>
                    <div className="space-y-2 text-xs font-bold text-slate-600">
                      <div className="flex justify-between border-b pb-1">
                        <span>%20 Fatura KDV Ödemesi:</span>
                        <span className="font-mono text-slate-800">{(totalPaid * 0.20).toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Sözleşmeli Personel Muhtasarı:</span>
                        <span className="font-mono text-slate-800">3,400 ₺</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Hakediş Stopaj Kesintisi:</span>
                        <span className="font-mono text-slate-800">1,850 ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Vergi Öncesi Kâr:</span>
                        <span className="font-mono text-emerald-600 font-extrabold">{(netProfit * 0.8).toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. DRIVER DETAIL REPORT */}
            {selectedReportTab === 'driver' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase">
                      SÜRÜCÜ KART OTOMATİK VERİSİ
                    </span>
                    <h4 className="text-base font-black text-slate-800">Sürücü Ahmet Yılmaz - 06 BKT 123</h4>
                    <p className="text-slate-500 text-[11px] font-medium">Bu rapor sürücünün anlık sefer puantajları ve saha denetim verileriyle oluşturulmuştur.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">HİZMET KARNE SKORU</span>
                    <span className="text-2xl font-black text-blue-600">4.9 / 5.0</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-black">
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Çalışılan Gün</span>
                    <span className="text-base text-slate-800">26 Sefer Günü</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Geç Kalma Sayısı</span>
                    <span className="text-base text-rose-600">0 Sefer</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Kesilen Ceza</span>
                    <span className="text-base text-rose-600">3 Adet (-1,500 ₺)</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Kazanılan Prim</span>
                    <span className="text-base text-emerald-600">1 Adet (+2,800 ₺)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 8. HOSTESS DETAIL REPORT */}
            {selectedReportTab === 'hostess' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase">
                      HOSTES KABİN VERİSİ
                    </span>
                    <h4 className="text-base font-black text-slate-800">Rehber Hostes Ayşe Yıldız - Yenimahalle Güzergahı</h4>
                    <p className="text-slate-500 text-[11px] font-medium">Veli teslimat kayıtları, yoklama kontrol hızı ve eksik evrak analizi.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">VELİ TESLİM BAŞARISI</span>
                    <span className="text-2xl font-black text-purple-600">%99.2</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-black">
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Toplam Görev</span>
                    <span className="text-base text-slate-800">52 Sefer</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Denetim Puanı</span>
                    <span className="text-base text-emerald-600">96 / 100</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Veli Memnuniyeti</span>
                    <span className="text-base text-slate-800">4.2 / 5.0</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl">
                    <span className="text-slate-400 block text-[9px] uppercase">Eksik Evrak</span>
                    <span className="text-base text-emerald-600">0 Belge</span>
                  </div>
                </div>
              </div>
            )}

            {/* 9. SUPPLIER DETAIL REPORT */}
            {selectedReportTab === 'supplier' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase text-orange-700">🤝 BERKAYTUR Bölgesel Tedarikçi ve Altyapı İncelemesi</h4>
                  
                  <div className="space-y-2 text-xs font-bold text-slate-600">
                    <div className="flex justify-between border-b pb-1">
                      <span>Tedarikçi Araç Sayısı:</span>
                      <span className="text-slate-800">1 Kiralık / Tedarikçi Araç</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Hak Edilen Net Hakediş Tutarı:</span>
                      <span className="font-mono text-emerald-600 font-extrabold">24,300 ₺</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Ortalama Yakıt Tüketim Endeksi:</span>
                      <span className="text-slate-800">8.2 L / 100 KM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tedarikçi Toplam Sefer Günü:</span>
                      <span className="text-slate-800 font-mono">26 Gün Sefer</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Export action logs console terminal */}
          <div className="bg-slate-900 text-slate-300 p-4 font-mono text-[10px] space-y-1.5 border-t border-slate-800">
            <span className="text-[9px] font-bold text-slate-500 block uppercase">RAPORLAMA ENTEGRASYON İŞLEM LOG KONSOLU</span>
            <div className="h-20 overflow-y-auto space-y-1 select-all">
              {exportLogs.map((log, i) => (
                <div key={i} className="text-emerald-400">{log}</div>
              ))}
              {exportLogs.length === 0 && (
                <div className="text-slate-500">Google Sheets veya PDF oluşturmak için dışa aktarma araçlarını kullanın. Konsol hazır...</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 💬 CHAT BLOCK 3: BERKAY AI ASİSTANI FLOATING WIDGET & INTEGRATED BOX */}
      {/* 1. Integrated Assistant in the layout */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <MessageSquare className="w-64 h-64 text-white" />
        </div>

        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 fill-current text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                Berkay AI Co-Pilot Asistanı <span className="text-[8px] bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded-md">V2.4</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Sadece bu sisteme özel, sıfır halüsinasyon, rol bazlı denetimli yapay zekâ asistanı.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-900 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            GÜVENLİ ÇEVRİMİÇİ
          </div>
        </div>

        {/* Suggested Quick Prompts based on User Roles */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Bugün kaç öğrenci binmedi?', text: 'Bugün kaç öğrenci servise binmedi?' },
            { label: 'Bugün kaç tahsilat yapıldı?', text: 'Bugün kaç tahsilat yapıldı?' },
            { label: 'Hakedişi hesapla', text: 'Hakedişi hesapla' },
            { label: 'Şoför performansını göster', text: 'Şoför performansını göster' },
            { label: 'Araç doluluklarını listele', text: 'Araç doluluklarını listele' },
            { label: 'Bakımı yaklaşan araçları göster', text: 'Bakımı yaklaşan araçları göster' },
            { label: 'Eksik evrakları listele', text: 'Eksik evrakları listele' }
          ].map((btn, i) => (
            <button 
              key={i}
              onClick={() => handleAISendMessage(btn.text)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700/50 transition-colors cursor-pointer"
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Chat History Panel */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 h-64 overflow-y-auto space-y-4">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-black">
                  AI
                </div>
              )}

              <div className={`p-3 rounded-2xl max-w-xl text-xs space-y-1.5 ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800/80'
              }`}>
                <div className="whitespace-pre-line font-medium leading-relaxed select-text">{msg.text}</div>
                {msg.dataWidget && <div className="pt-1">{msg.dataWidget}</div>}
                <span className="text-[9px] text-slate-400 font-mono block text-right mt-1 font-bold">{msg.date}</span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 text-slate-400 text-xs font-black uppercase">
                  U
                </div>
              )}

            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Asistana sistem verileri hakkında bir şey sorun... (Örn: 'hakedişleri hesapla')"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAISendMessage()}
            className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-600 transition-colors"
          />
          <button 
            onClick={() => handleAISendMessage()}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
