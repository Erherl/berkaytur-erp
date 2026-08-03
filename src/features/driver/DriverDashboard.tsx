/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { useAppStore } from '../../store';
import { StorageService } from '../../services/StorageService';
import { ApiClient } from '../../infrastructure/api/apiClient';
import MapView from '../../components/MapView';
import { 
  Bus, MapPin, Play, Square, Check, AlertTriangle, 
  LogOut, Phone, Shield, ClipboardList, Info, 
  Clock, User, FileText, Calendar, Bell, ChevronLeft, 
  Camera, CheckCircle, AlertCircle, Sparkles, Map, 
  HeartPulse, UserCheck, ShieldCheck, CreditCard, Lock,
  Upload, Download, Trash2, Plus, File, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

type ActiveTab = 
  | 'home' 
  | 'goreg' 
  | 'guzergah' 
  | 'ogrenciler' 
  | 'aracim' 
  | 'kontrol' 
  | 'olay' 
  | 'evrak' 
  | 'performans' 
  | 'bildirimler' 
  | 'profil';

export default function DriverDashboard() {
  const { 
    currentUser, logout, routes, vehicles, students, startRoute, stopRoute, updateRouteLocation, addLog,
    documents, addDocument, deleteDocument
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  
  // Find current driver's route
  const driverRoute = routes.find(r => r.driverId === currentUser?.id) || routes[0];
  const vehicle = vehicles.find(v => v.id === driverRoute?.vehicleId);
  const routeStops = driverRoute?.stops || [];
  
  // Find students on this route
  const driverStudents = students.filter(s => s.routeId === driverRoute?.id);

  // States for active journey
  const [currentLat, setCurrentLat] = useState(driverRoute?.currentLat || 39.9610);
  const [currentLng, setCurrentLng] = useState(driverRoute?.currentLng || 32.7900);
  const [visitedStops, setVisitedStops] = useState<string[]>([]);
  const [studentBoardingStatus, setStudentBoardingStatus] = useState<Record<string, 'pending' | 'on_bus' | 'absent' | 'at_school' | 'at_home'>>({});

  // Morning Checklist State (Mandatory to start journey)
  const [checklist, setChecklist] = useState({
    cleaning: false,
    fuel: false,
    tires: false,
    lights: false,
    extinguisher: false,
    firstAid: false,
    documents: false,
    belts: false,
    innerCamera: false,
    outerCamera: false
  });
  const [isChecklistSaved, setIsChecklistSaved] = useState(() => {
    return localStorage.getItem(`bkt_checklist_${currentUser?.id}`) === 'true';
  });

  // Incident reporting state
  const [incidentType, setIncidentType] = useState('Trafik Sıkışıklığı');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentPhoto, setIncidentPhoto] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [incidentSuccess, setIncidentSuccess] = useState(false);

  // Profile Form States
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileAddress, setProfileAddress] = useState('Yenimahalle, Ankara');
  const [profileIban, setProfileIban] = useState('TR56 0006 2000 0001 2345 6789 01');
  const [profileSaved, setProfileSaved] = useState(false);

  // Read status of alerts
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Driver Documents and Upload States
  const [driverDocs, setDriverDocs] = useState(() => {
    const defaultDocs = [
      { key: 'ehliyet', name: 'Sürücü Belgesi (Ehliyet)', status: 'active', date: '12.03.2032', left: 'Günü Var', isAlert: false, fileName: 'ehliyet_belgesi_D_sinifi.pdf' },
      { key: 'kimlik', name: 'Nüfus Cüzdanı Sureti', status: 'active', date: 'Süresiz', left: 'Ömürlük', isAlert: false, fileName: 'kimlik_fotokopisi_sofor.pdf' },
      { key: 'ikametgah', name: 'İkametgah Belgesi', status: 'active', date: '15.11.2026', left: 'Günü Var', isAlert: false, fileName: 'ikametgah_eDevlet_sofor.pdf' },
      { key: 'saglik', name: 'Sağlık Raporu', status: 'active', date: '10.12.2026', left: 'Günü Var', isAlert: false, fileName: 'saglik_raporu_sofor.pdf' },
      { key: 'sofor_karti', name: 'Şoför Kartı', status: 'active', date: '22.04.2027', left: 'Günü Var', isAlert: false, fileName: 'tuhim_sofor_karti.pdf' },
      { key: 'ehliyet_gbt', name: 'Ehliyet GBT Sorgusu', status: 'active', date: '15.11.2026', left: 'Günü Var', isAlert: false, fileName: 'ehliyet_gbt_sorgusu.pdf' },
      { key: 'psiko', name: 'Psikoteknik Belgesi', status: 'warning', date: '26.07.2026', left: 'Kalan: 10 Gün!', isAlert: true, fileName: 'psikoteknik_raporu.pdf' },
      { key: 'adli_sicil_kart', name: 'Adli Sicil Kartı Resmi', status: 'active', date: '15.11.2026', left: 'Günü Var', isAlert: false, fileName: 'adli_sicil_kaydi_eDevlet.pdf' },
      { key: 'ruhsat', name: 'Araç Ruhsatı', status: 'active', date: '18.09.2026', left: 'Günü Var', isAlert: false, fileName: 'arac_ruhsat_belgesi.pdf' },
      { key: 'koltuk_sigorta', name: 'Koltuk Sigortası Poliçesi', status: 'active', date: '30.12.2026', left: 'Günü Var', isAlert: false, fileName: 'koltuk_ferdi_kaza_sigortasi.pdf' },
      { key: 'arac_sigorta', name: 'Araç Trafik Sigortası Poliçesi', status: 'active', date: '14.10.2026', left: 'Günü Var', isAlert: false, fileName: 'zorunlu_trafik_sigortasi.pdf' }
    ];
    const saved = localStorage.getItem(`bkt_driver_docs_${currentUser?.id}`);
    return saved ? JSON.parse(saved) : defaultDocs;
  });

  const [selectedDocKey, setSelectedDocKey] = useState('ehliyet');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSuresiz, setIsSuresiz] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customDocName, setCustomDocName] = useState('');

  // AI-OCR states
  const [ocrLogs, setOcrLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<{ expiryDate?: string; extractedText?: string; isSuresiz?: boolean } | null>(null);

  const handleUploadDocument = async (file: File) => {
    if (uploadProgress !== null || isScanning) return;
    
    setIsScanning(true);
    setOcrLogs(['Güvenli dosya yükleme filtresi başlatıldı...', 'Dosya boyutu ve biçimi doğrulanıyor...', 'Dosya zararlı kod ve virüs taramasından geçiriliyor...']);
    setUploadProgress(15);

    const uploadRes = await StorageService.uploadFile(file, 'Şoför');
    if (!uploadRes.success) {
      setOcrLogs(prev => [
        ...prev,
        `❌ GÜVENLİK ENGELİ: ${uploadRes.error}`
      ]);
      setIsScanning(false);
      setUploadProgress(null);
      alert(`Evrak Yükleme Reddedildi:\n${uploadRes.error}`);
      return;
    }

    setOcrLogs(prev => [
      ...prev,
      '✔️ Evrak virüs taramasından başarıyla geçti (Zararlı kod veya virüs saptanmadı).',
      `✔️ Güvenli rastgele dosya adı oluşturuldu: ${uploadRes.randomName}`,
      'Dosya bulut sunucusuna aktarılıyor...'
    ]);
    setUploadProgress(40);

    const fileName = uploadRes.randomName || file.name;
    const fileSizeStr = uploadRes.fileSizeStr || '1.0 MB';

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null || prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 8;
      });
    }, 150);

    try {
      const res = await ApiClient.extractDocDate(selectedDocKey, fileName, 'driver');

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.success && res.data) {
        const data = res.data;
        // Simulate real-time scanning steps
        if (data.logs) {
          for (let i = 0; i < data.logs.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 150));
            setOcrLogs(prev => [...prev, data.logs[i]]);
          }
        }

        setExtractedInfo({
          expiryDate: data.expiryDate,
          extractedText: data.extractedText,
          isSuresiz: data.isSuresiz
        });

        // Update local storage and docs state
        const rawDate = data.expiryDate;
      const finalExpiry = rawDate === 'Süresiz' ? 'Süresiz' : new Date(rawDate).toLocaleDateString('tr-TR');
      
      let docName = '';
      let updatedDocs = [...driverDocs];
      
      if (selectedDocKey === 'other') {
        docName = customDocName || fileName || 'Ek Evrak.pdf';
      } else {
        const matched = updatedDocs.find(d => d.key === selectedDocKey);
        if (matched) {
          matched.status = 'active';
          matched.date = finalExpiry;
          matched.left = data.isSuresiz ? 'Ömürlük' : 'Günü Var';
          matched.isAlert = false;
          matched.fileName = fileName;
          docName = matched.name;
        }
      }

      if (!docName) {
        docName = fileName || 'Sürücü Belgesi.pdf';
      }

      setDriverDocs(updatedDocs);
      localStorage.setItem(`bkt_driver_docs_${currentUser?.id}`, JSON.stringify(updatedDocs));

      // Add to global documents list
      addDocument({
        name: `${currentUser?.name.replace(/\s+/g, '_')}_${fileName}`,
        category: 'Şoför',
        fileUrl: uploadRes.fileUrl || '#',
        fileSize: fileSizeStr,
        uploadedBy: currentUser?.name || 'Sürücü'
      });

      // Save to Google Drive document storage
      const folderPath = `BERKAYTUR/Şoförler/${currentUser?.name}`;
      const savedDrive = localStorage.getItem('bkt_google_drive_documents');
      let driveItems = [];
      if (savedDrive) {
        try {
          driveItems = JSON.parse(savedDrive);
        } catch (e) {
          console.error(e);
        }
      }
      
      // Ensure folder exists
      const parentPath = 'BERKAYTUR/Şoförler';
      if (!driveItems.some((i: any) => i.name === currentUser?.name && i.path === parentPath)) {
        driveItems.push({
          id: `f_dr_dyn_folder_${Date.now()}`,
          name: currentUser?.name || 'Kullanıcı',
          type: 'folder',
          path: parentPath
        });
      }

      driveItems.push({
        id: `doc_user_file_${Date.now()}`,
        name: `${currentUser?.name.replace(/\s+/g, '_')}_${fileName}`,
        type: 'file',
        path: folderPath,
        fileSize: fileSizeStr,
        uploadDate: new Date().toISOString().split('T')[0]
      });
      localStorage.setItem('bkt_google_drive_documents', JSON.stringify(driveItems));

      addLog('Sürücü Evrak Yükleme', `Sürücü ${currentUser?.name}, "${docName}" belgesini (Rastgele İsim: ${fileName}) sisteme yükledi. Güvenli virüs taramasından başarıyla geçildi.`);
      } else {
        setOcrLogs(prev => [...prev, '❌ Yapay Zeka analizi başarısız oldu! ' + (res.error || '')]);
      }

    } catch (err) {
      console.error(err);
      setOcrLogs(prev => [...prev, '❌ Yapay Zeka analizi sırasında bir hata oluştu!']);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setUploadProgress(null);
      }, 1000);
    }
  };

  // Find absent/canceled riders on driver's route (marked as 'absent' in morningStatus or eveningStatus)
  const absentStudents = driverStudents.filter(
    s => s.morningStatus === 'absent' || s.eveningStatus === 'absent'
  );

  // Simulated GPS tracker
  useEffect(() => {
    if (driverRoute && (driverRoute.status === 'morning_active' || driverRoute.status === 'evening_active')) {
      const interval = setInterval(() => {
        const deltaLat = (Math.random() - 0.5) * 0.0004;
        const deltaLng = (Math.random() - 0.5) * 0.0004;
        
        setCurrentLat(prev => {
          const nextLat = prev + deltaLat;
          updateRouteLocation(driverRoute.id, nextLat, currentLng);
          return nextLat;
        });
        setCurrentLng(prev => {
          const nextLng = prev + deltaLng;
          updateRouteLocation(driverRoute.id, currentLat, nextLng);
          return nextLng;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [driverRoute?.status, currentLat, currentLng]);

  // Load initial checklist status from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bkt_checklist_${currentUser?.id}`) === 'true';
    setIsChecklistSaved(saved);
  }, [currentUser]);

  // Handle route control
  const handleStartRoute = (type: 'morning' | 'evening') => {
    if (!isChecklistSaved) {
      alert('Güzergahı başlatabilmek için önce "Sabah Kontrolü" checklistini tamamlayıp kaydetmeniz gerekmektedir.');
      setActiveTab('kontrol');
      return;
    }
    startRoute(driverRoute.id, type);
    setVisitedStops([]);
    addLog('Servis Başlatıldı', `${driverRoute.name} - ${type === 'morning' ? 'Sabah' : 'Akşam'} seferi şoför tarafından başlatıldı.`);
  };

  const handleStopRoute = () => {
    stopRoute(driverRoute.id);
    addLog('Servis Sonlandırıldı', `${driverRoute.name} seferi şoför tarafından tamamlandı.`);
  };

  const handleToggleStop = (stopId: string, stopName: string) => {
    if (visitedStops.includes(stopId)) {
      setVisitedStops(visitedStops.filter(id => id !== stopId));
    } else {
      setVisitedStops([...visitedStops, stopId]);
      addLog('Durak Ziyaret Edildi', `${stopName} durağına şoför tarafından ulaşıldı.`);
    }
  };

  // SOS WhatsApp link trigger
  const handleSOS = () => {
    const locationStr = `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;
    const message = `ACİL SOS: Berkaytur ${vehicle?.plate || 'Servis Aracı'} Acil Durum Bildirdi!\nSürücü: ${currentUser?.name}\nKonum: ${locationStr}\nLütfen acilen koordinasyonu sağlayın.`;
    addLog('ACİL DURUM ALARMI', `Şoför SOS tetikledi! Plaka: ${vehicle?.plate}`);
    
    const url = `https://web.whatsapp.com/send?phone=905552223344&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Checklist save
  const handleSaveChecklist = () => {
    const allChecked = Object.values(checklist).every(v => v === true);
    if (!allChecked) {
      alert('Tüm kontrolleri "Uygun" olarak işaretlemeniz güvenlik kuralları gereği zorunludur.');
      return;
    }
    localStorage.setItem(`bkt_checklist_${currentUser?.id}`, 'true');
    setIsChecklistSaved(true);
    addLog('Sabah Kontrolü Yapıldı', `Şoför ${currentUser?.name}, ${vehicle?.plate} plakalı aracın sabah güvenlik testlerini başarıyla tamamladı.`);
    alert('Günlük araç güvenlik kontrolü başarıyla kaydedildi. Sefer başlatabilirsiniz!');
    setActiveTab('home');
  };

  // Incident report submission
  const handleIncidentSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsReporting(true);
    setTimeout(() => {
      setIsReporting(false);
      setIncidentSuccess(true);
      addLog('Şoför Olay Bildirimi', `Plaka: ${vehicle?.plate} • Olay: ${incidentType} • Detay: ${incidentDesc}`);
      
      // Send simulation message to WhatsApp PM
      const whatsappText = `OLAY BİLDİRİMİ (${incidentType}):\nPlaka: ${vehicle?.plate}\nŞoför: ${currentUser?.name}\nDetay: ${incidentDesc}\nKonum: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`;
      const url = `https://web.whatsapp.com/send?phone=905552223344&text=${encodeURIComponent(whatsappText)}`;
      
      setTimeout(() => {
        window.open(url, '_blank');
        setIncidentDesc('');
        setIncidentPhoto(null);
        setIncidentSuccess(false);
      }, 1200);
    }, 1000);
  };

  // Save profile changes
  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    addLog('Profil Güncellendi', `Sürücü ${currentUser?.name} telefon ve adres bilgilerini güncelledi.`);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Simulated notifications feed
  const notifications = [
    { id: 'not_1', type: 'error', text: 'Öğrenci İptal: Ali Yılmaz velisi bugün okula özel araçla bırakacağını iletti.', date: 'Bugün, 07:12' },
    { id: 'not_2', type: 'info', text: 'Nöbetçi Sorumlu Değişikliği: Atatürk Anadolu Lisesi okul koordinatörü Canan Hanım izinli, yerine Elif Koç görevlendirildi.', date: 'Dün, 16:45' },
    { id: 'not_3', type: 'warning', text: 'Belge Uyarısı: Psikoteknik belgenizin süresi 5 gün sonra doluyor!', date: 'Dün, 09:30' },
    { id: 'not_4', type: 'success', text: 'Performans Primi: Haziran ayı sıfır gecikme başarınızdan dolayı 1.500 TL prim hesabınıza yansıtıldı.', date: '12 Tem' },
  ];

  // Map markers
  const mapMarkers = [
    { lat: currentLat, lng: currentLng, title: `${vehicle?.plate || 'Servisim'} (Siz)`, type: 'bus' as const },
    ...routeStops.map(stop => ({
      lat: stop.latitude,
      lng: stop.longitude,
      title: stop.name,
      description: `Planlanan Saat: ${stop.estimatedTime}`,
      type: stop.type === 'school' ? ('school' as const) : ('student' as const)
    }))
  ];

  // Helper for Student Badges
  const getStudentWarnings = (studentId: string) => {
    const list: { label: string; color: string; icon: any }[] = [];
    if (studentId === 'st1') {
      list.push({ label: 'İlaç Kullanıyor', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: HeartPulse });
      list.push({ label: 'Alerji (Çilek)', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle });
    }
    if (studentId === 'st2') {
      list.push({ label: 'Otizm / Özel İlgi', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Sparkles });
      list.push({ label: 'Ön Koltuk', color: 'bg-teal-50 text-teal-700 border-teal-100', icon: ClipboardList });
    }
    if (studentId === 'st4') {
      list.push({ label: 'Kardeşiyle Oturacak', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: User });
    }
    return list;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Premium Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-950/40 text-white font-extrabold text-lg">
            B
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
              Berkaytur <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Şoför</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Mobil Sürücü Operasyon Paneli</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-200">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{vehicle?.plate || 'Araç Atanmadı'}</p>
          </div>
          <button 
            id="driver-logout-btn"
            onClick={logout}
            className="p-2.5 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-400 rounded-xl transition-all cursor-pointer text-slate-300 border border-slate-700/60"
            title="Güvenli Çıkış"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Real-time Absent / Not Riding Warnings Banner */}
      {absentStudents.length > 0 && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-6 py-3 flex items-start gap-3 text-sm animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">KRİTİK VELİ BİLDİRİMİ: </span> 
            {absentStudents.map(s => s.name).join(', ')} isimli öğrencilerin velileri bugün servise biniş yapmayacaklarını bildirdiler. Lütfen güzergahta bu duraklarda durmayınız.
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Welcome Block */}
        {activeTab === 'home' && (
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Hoş Geldiniz, {currentUser?.name}! 👋
              </h2>
              <p className="text-xs text-slate-400">
                Bugün: <span className="font-bold text-slate-200">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span> • 
                Aracınız: <span className="font-bold text-amber-400">{vehicle?.plate} ({vehicle?.brand} {vehicle?.model})</span>
              </p>
            </div>
            
            {/* Quick Status indicators */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                isChecklistSaved 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {isChecklistSaved ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                Sabah Kontrolü: {isChecklistSaved ? 'Tamamlandı' : 'Yapılmadı!'}
              </span>

              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                driverRoute?.status.includes('active')
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' 
                  : 'bg-slate-800 text-slate-400 border-slate-700/60'
              }`}>
                <Bus className="w-4 h-4" />
                Sefer: {driverRoute?.status.includes('active') ? 'DEVAM EDİYOR' : 'HAZIR'}
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Content Switching */}
        {activeTab === 'home' ? (
          
          /* Bento Dashboard Card Grid (10 Cards) */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* 1. Görevlerim Card */}
            <button
              onClick={() => setActiveTab('goreg')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-amber-500/5 active:scale-95"
            >
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Bugünkü Görevim</h3>
                <p className="text-[11px] text-slate-400 mt-1">Sabah, Akşam & Gezi sefer takviminiz</p>
              </div>
            </button>

            {/* 2. Güzergahım Card */}
            <button
              onClick={() => setActiveTab('guzergah')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-blue-500/5 active:scale-95"
            >
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Canlı Güzergahım</h3>
                <p className="text-[11px] text-slate-400 mt-1">Harita, durak sıralaması ve biniş kontrolü</p>
              </div>
            </button>

            {/* 3. Öğrenciler Card */}
            <button
              onClick={() => setActiveTab('ogrenciler')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 active:scale-95"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Öğrenci Listesi</h3>
                <p className="text-[11px] text-slate-400 mt-1">Öğrenci kartları, veliler, özel uyarılar</p>
              </div>
            </button>

            {/* 4. Aracım Card */}
            <button
              onClick={() => setActiveTab('aracim')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-purple-500/5 active:scale-95"
            >
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Araç Bilgilerim</h3>
                <p className="text-[11px] text-slate-400 mt-1">Muayene, bakım, sigorta ve donanımlar</p>
              </div>
            </button>

            {/* 5. Sabah Kontrolü Card */}
            <button
              onClick={() => setActiveTab('kontrol')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-teal-500/5 active:scale-95"
            >
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Sabah Kontrolü</h3>
                <p className="text-[11px] text-slate-400 mt-1">10 aşamalı zorunlu günlük araç testi</p>
              </div>
            </button>

            {/* 6. Olay Bildir Card */}
            <button
              onClick={() => setActiveTab('olay')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-rose-500/5 active:scale-95"
            >
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Olay / Arıza Bildir</h3>
                <p className="text-[11px] text-slate-400 mt-1">Gecikme, arıza veya kaza durum uyarısı</p>
              </div>
            </button>

            {/* 7. Evraklarım Card */}
            <button
              onClick={() => setActiveTab('evrak')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-sky-500/5 active:scale-95"
            >
              <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Resmi Evraklarım</h3>
                <p className="text-[11px] text-slate-400 mt-1">Ehliyet, SRC, psikoteknik geçerlilikleri</p>
              </div>
            </button>

            {/* 8. Performansım Card */}
            <button
              onClick={() => setActiveTab('performans')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 active:scale-95"
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Performansım</h3>
                <p className="text-[11px] text-slate-400 mt-1">Puanlar, denetim sonuçları, primlerim</p>
              </div>
            </button>

            {/* 9. Bildirimler Card */}
            <button
              onClick={() => setActiveTab('bildirimler')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-pink-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-pink-500/5 active:scale-95 relative"
            >
              <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6" />
              </div>
              <span className="absolute top-4 right-4 bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">3</span>
              <div>
                <h3 className="font-bold text-white text-sm">Duyurular & Uyarılar</h3>
                <p className="text-[11px] text-slate-400 mt-1">Önemli okul, öğrenci, araç bildirimleri</p>
              </div>
            </button>

            {/* 10. Profilim Card */}
            <button
              onClick={() => setActiveTab('profil')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-slate-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-slate-500/5 active:scale-95"
            >
              <div className="p-3 bg-slate-800 text-slate-300 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Sürücü Profilim</h3>
                <p className="text-[11px] text-slate-400 mt-1">Kişisel iletişim, IBAN, rehber hostes</p>
              </div>
            </button>

          </div>

        ) : (
          
          /* Detailed Views */
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            
            {/* Nav Header */}
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center gap-4">
              <button
                onClick={() => setActiveTab('home')}
                className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center text-slate-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeTab === 'goreg' && '🚌 Bugünkü Görevlerim'}
                  {activeTab === 'guzergah' && '📍 Canlı Güzergah & Durak Takibi'}
                  {activeTab === 'ogrenciler' && '👨‍🎓 Öğrenci Roster Kartları'}
                  {activeTab === 'aracim' && '🚍 Araç Teknik Detayları & Donanım'}
                  {activeTab === 'kontrol' && '✅ Günlük Sabah Güvenlik Kontrolü'}
                  {activeTab === 'olay' && '📷 Olay / Arıza / Gecikme Bildirimi'}
                  {activeTab === 'evrak' && '📄 Ehliyet, SRC & Resmi Evraklarım'}
                  {activeTab === 'performans' && '⭐ Sürücü Performans Karnesi'}
                  {activeTab === 'bildirimler' && '🔔 Bildirimler & Değişiklikler'}
                  {activeTab === 'profil' && '⚙️ Sürücü Profil Düzenleme'}
                </h3>
                <p className="text-[11px] text-slate-400">Şoför Operasyon Modülü • Berkaytur</p>
              </div>
            </div>

            {/* Tab Body */}
            <div className="p-6">
              
              {/* TAB: BUGÜNKÜ GÖREVLERİM */}
              {activeTab === 'goreg' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Morning Mission */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">Sabah Seferi</span>
                        <span className="text-xs font-mono text-slate-400">07:30 - 08:30</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white">{driverRoute?.name || 'Yenimahalle Güzergahı'}</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 font-medium">
                          <div>🏫 Okul: Cumhuriyet İ.Ö.</div>
                          <div>🚍 Araç: {vehicle?.plate}</div>
                          <div>👩‍✈️ Rehber: Ayşe Yıldız</div>
                          <div>👨‍🎓 Öğrenci: {driverStudents.length} Çocuk</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Durak Sayısı: {routeStops.length}</span>
                        <button 
                          onClick={() => setActiveTab('guzergah')}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Güzergaha Git
                        </button>
                      </div>
                    </div>

                    {/* Evening Mission */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">Akşam Seferi</span>
                        <span className="text-xs font-mono text-slate-400">16:00 - 17:00</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white">{driverRoute?.name || 'Yenimahalle Güzergahı'}</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 font-medium">
                          <div>🏫 Okul: Cumhuriyet İ.Ö.</div>
                          <div>🚍 Araç: {vehicle?.plate}</div>
                          <div>👩‍✈️ Rehber: Ayşe Yıldız</div>
                          <div>👨‍🎓 Öğrenci: {driverStudents.length} Çocuk</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Durak Sayısı: {routeStops.length}</span>
                        <button 
                          onClick={() => setActiveTab('guzergah')}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Güzergaha Git
                        </button>
                      </div>
                    </div>

                    {/* Gezi/Etkinlik Mission */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">Özel Etkinlik / Gezi Görevi</span>
                        <span className="text-xs font-mono text-slate-400">Yarın, 13:00</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white">Atatürk Lisesi Tarih Müzesi Gezi Turu</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Yarın Atatürk Anadolu Lisesi önünden alınacak öğrenci grubu tarih müzesine transfer edilecektir. Dönüş saati 16:00 olarak planlanmıştır. Ekstra hakediş yansıtılacaktır.
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center">
                        <span className="text-[11px] text-emerald-400 font-semibold">✓ Görev Atandı (Hakedişli)</span>
                        <button 
                          disabled
                          className="px-3.5 py-1.5 bg-slate-800 text-slate-500 rounded-lg text-xs font-bold border border-slate-700/60 cursor-not-allowed"
                        >
                          Henüz Başlatılamaz
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB: GÜZERGAH VE HARİTA TAKİBİ */}
              {activeTab === 'guzergah' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Side Route Stops */}
                  <div className="lg:col-span-5 space-y-4">
                    
                    {/* Route Info & Start Button */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div>
                        <h4 className="font-bold text-white text-base">{driverRoute?.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">Okul: Cumhuriyet İlkokulu & Atatürk Lisesi</p>
                      </div>

                      {/* Warning if checklist is missing */}
                      {!isChecklistSaved && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                          <div>
                            Seferi başlatabilmek için önce günlük araç kontrol checklistinizi doldurmalısınız! 
                            <button onClick={() => setActiveTab('kontrol')} className="underline font-bold block mt-1 hover:text-white">Şimdi Doldur →</button>
                          </div>
                        </div>
                      )}

                      {/* Start/Stop Button Control */}
                      <div className="flex gap-2">
                        {driverRoute?.status.includes('active') ? (
                          <button
                            id="driver-stop-route-btn-page"
                            onClick={handleStopRoute}
                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
                          >
                            <Square className="w-4 h-4 fill-white" /> Seferi Tamamla / Bitir
                          </button>
                        ) : (
                          <>
                            <button
                              id="driver-start-morning-btn-page"
                              onClick={() => handleStartRoute('morning')}
                              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Play className="w-4 h-4 fill-white" /> Sabah Servisi Başlat
                            </button>
                            <button
                              id="driver-start-evening-btn-page"
                              onClick={() => handleStartRoute('evening')}
                              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Play className="w-4 h-4 fill-white" /> Akşam Servisi Başlat
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* SOS Emergency Call Button */}
                    <div className="bg-rose-950/20 border border-rose-900/50 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
                        <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                        Acil SOS Yardım Paneli
                      </div>
                      <p className="text-xs text-rose-200/80 leading-relaxed">
                        Arıza, kaza, kriz gibi durumlarda tek tıkla proje yöneticisine koordinatlarınızı içeren acil durum mesajı gönderin.
                      </p>
                      <button
                        onClick={handleSOS}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-950/60"
                      >
                        <AlertTriangle className="w-4 h-4" /> WhatsApp SOS Gönder
                      </button>
                    </div>

                    {/* Stops List */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <h5 className="font-bold text-white text-sm flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-amber-500" />
                        Güzergah Durak Listesi ({routeStops.length})
                      </h5>

                      <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-5 text-slate-300">
                        {routeStops.map((stop, idx) => {
                          const isVisited = visitedStops.includes(stop.id);
                          const isCanceled = absentStudents.some(s => s.id === stop.studentId);
                          
                          return (
                            <div key={stop.id} className="relative">
                              {/* Circle Node */}
                              <span className={`absolute -left-[25px] top-0.5 w-4.5 h-4.5 rounded-full border-2 transition-all flex items-center justify-center ${
                                isCanceled
                                  ? 'bg-rose-600 border-rose-600'
                                  : isVisited 
                                    ? 'bg-emerald-500 border-emerald-500' 
                                    : 'bg-slate-900 border-slate-700'
                              }`}>
                                {isVisited && !isCanceled && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                                {isCanceled && <span className="text-[9px] font-extrabold text-white">X</span>}
                              </span>

                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={`text-xs font-bold ${
                                    isCanceled 
                                      ? 'text-rose-400 line-through' 
                                      : isVisited 
                                        ? 'text-slate-500 line-through' 
                                        : 'text-slate-100'
                                  }`}>
                                    {stop.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium">Planlanan Saat: {stop.estimatedTime}</p>
                                  
                                  {isCanceled && (
                                    <span className="inline-block mt-1 text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold">
                                      Bugün Servise Binmeyecek!
                                    </span>
                                  )}
                                </div>

                                {driverRoute?.status.includes('active') && !isCanceled && (
                                  <button
                                    onClick={() => handleToggleStop(stop.id, stop.name)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      isVisited 
                                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-750' 
                                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                    }`}
                                  >
                                    {isVisited ? 'Geri Al' : 'Ulaşıldı'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Side Map */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          Anlık GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                        </span>
                        <span className="text-amber-400 font-bold">● Canlı Yayın Aktif</span>
                      </div>
                      
                      {/* Interactive MapView */}
                      <div className="h-[450px] rounded-xl overflow-hidden border border-slate-800">
                        <MapView center={[currentLat, currentLng]} zoom={13} markers={mapMarkers} />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB: ÖĞRENCİ KARTLARI */}
              {activeTab === 'ogrenciler' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-300">Güzergah Öğrencileri ({driverStudents.length})</h4>
                    <span className="text-xs text-slate-400">Rehber hostes ile ortak liste</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {driverStudents.map(student => {
                      const isAbsent = student.morningStatus === 'absent' || student.eveningStatus === 'absent';
                      const warnings = getStudentWarnings(student.id);

                      return (
                        <div 
                          key={student.id} 
                          className={`bg-slate-900 border rounded-2xl p-5 space-y-4 relative overflow-hidden transition-all hover:border-slate-700 ${
                            isAbsent ? 'border-rose-900/60 bg-rose-950/5' : 'border-slate-800'
                          }`}
                        >
                          {isAbsent && (
                            <div className="absolute top-0 right-0 bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                              İzinli / Binmeyecek
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-white text-lg border border-slate-700">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h5 className="font-bold text-white text-sm">{student.name}</h5>
                              <p className="text-xs text-slate-400">{student.schoolName} • Sınıf: {student.classLevel}</p>
                            </div>
                          </div>

                          {/* Student Special Warning Badges */}
                          {warnings.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {warnings.map((w, i) => {
                                const Icon = w.icon;
                                return (
                                  <span key={i} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${w.color}`}>
                                    <Icon className="w-3 h-3" />
                                    {w.label}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <div className="space-y-2 pt-3 border-t border-slate-800/60 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-medium">Veli / İrtibat:</span>
                              <span className="text-slate-200 font-bold">{student.parentName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-medium">Veli Telefon:</span>
                              <a 
                                href={`tel:${student.parentPhone}`} 
                                className="text-amber-400 font-bold hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5" /> {student.parentPhone}
                              </a>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 font-medium block">Sabah Biniş Adresi:</span>
                              <span className="text-slate-300 font-semibold text-[11px] block bg-slate-950 p-2 rounded-lg border border-slate-800">{student.id === 'st1' ? 'Yenimahalle 4. Sokak No: 12' : 'Demetevler Caddesi No: 45'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: ARAÇ BİLGİLERİ */}
              {activeTab === 'aracim' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Visual Card */}
                    <div className="md:col-span-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/20">Sürücü Atamalı Araç</span>
                        <h4 className="text-xl font-extrabold text-white mt-3">{vehicle?.plate}</h4>
                        <p className="text-xs text-slate-400">{vehicle?.brand} {vehicle?.model}</p>
                      </div>
                      
                      <div className="space-y-3 pt-4 border-t border-slate-800/60 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span>Koltuk Kapasitesi:</span>
                          <span className="font-bold text-white">{vehicle?.capacity} Koltuk</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Araç Tipi:</span>
                          <span className="font-bold text-white">Okul Servisi (16+1)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Yakıt Tipi:</span>
                          <span className="font-bold text-white">Dizel Euro 6</span>
                        </div>
                      </div>
                    </div>

                    {/* Donanım & Muayene Detayları */}
                    <div className="md:col-span-8 space-y-6">
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Resmi Muayene ve Sigorta Takvimi
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-medium">TÜVTÜRK Muayene</span>
                              <span className="text-emerald-400 font-bold">✓ Geçerli</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200">14 Kasım 2026</p>
                            <span className="text-[10px] text-slate-500 font-medium block">Kalan Süre: 122 Gün</span>
                          </div>

                          <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-medium">Zorunlu Trafik Sigortası</span>
                              <span className="text-emerald-400 font-bold">✓ Aktif</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200">12 Şubat 2027</p>
                            <span className="text-[10px] text-slate-500 font-medium block">Kalan Süre: 212 Gün</span>
                          </div>

                          <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-medium">Kasko Poliçesi</span>
                              <span className="text-amber-400 font-bold">⚠️ Yenileniyor</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200">20 Temmuz 2026</p>
                            <span className="text-[10px] text-rose-400 font-bold block animate-pulse">⚠️ Kalan Süre: 5 Gün!</span>
                          </div>

                          <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-medium">Periyodik Kilometre Bakımı</span>
                              <span className="text-emerald-400 font-bold">✓ Bakım Yapıldı</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200">120.000 KM</p>
                            <span className="text-[10px] text-slate-500 font-medium block">Mevcut Araç KM: 114.500 KM</span>
                          </div>

                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <h4 className="font-bold text-white text-sm mb-4">Mecburi Araç İçi Donanımlar</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300 font-medium">
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ Yangın Tüpü (2x)</div>
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ İlk Yardım Seti</div>
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ Okul Taşıtı Levhası</div>
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ Dur Lambası</div>
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ Cam Çekiçleri (4x)</div>
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ Emniyet Kemerleri</div>
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ İç Kamera</div>
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">✓ Sensörlü Koltuklar</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB: SABAH KONTROLÜ (CHECKLIST) */}
              {activeTab === 'kontrol' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-base font-bold text-white">Yolculuk Öncesi Günlük Güvenlik Kontrolü</h4>
                      {isChecklistSaved && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Bugün Onaylandı
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Emniyet Genel Müdürlüğü Okul Servis Araçları Yönetmeliği uyarınca her gün sefere başlamadan önce aşağıdaki maddelerin şoför tarafından fiziksel olarak test edilip onaylanması zorunludur.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    
                    {/* Checklist Items */}
                    {[
                      { key: 'cleaning', label: 'Araç Temizliği', desc: 'Araç içi dezenfekte edildi, çöpler boşaltıldı ve hijyen sağlandı.' },
                      { key: 'fuel', label: 'Yakıt Seviyesi Kontrolü', desc: 'Yakıt deposunun çeyrek deponun üzerinde olduğu doğrulandı.' },
                      { key: 'tires', label: 'Lastik Hava ve Basınç Testi', desc: '4 lastik ve yedek lastiğin basıncı ile diş derinlikleri uygun durumda.' },
                      { key: 'lights', label: 'Farlar ve Sinyal Lambaları', desc: 'Uzun-kısa farlar, sinyaller, stop lambaları ve dur levhası aktif çalışıyor.' },
                      { key: 'extinguisher', label: 'Yangın Söndürme Tüpleri', desc: 'Araçtaki 2 adet yangın söndürme tüpünün basınç ibreleri yeşil bölgede.' },
                      { key: 'firstAid', label: 'İlk Yardım Çantası', desc: 'İlk yardım setindeki tıbbi malzemelerin eksiksiz olduğu doğrulandı.' },
                      { key: 'documents', label: 'Araç Ruhsat & Evrak', desc: 'Ruhsat, sigorta poliçesi ve güzergah izin belgesi torpidoda mevcut.' },
                      { key: 'belts', label: 'Emniyet Kemerleri', desc: 'Tüm öğrenci koltuklarındaki emniyet kemerleri sağlam ve kilitleniyor.' },
                      { key: 'innerCamera', label: 'İç Güvenlik Kamera Sistemi', desc: 'Araç içi kayıt cihazı aktif durumda, kameralar net görüntü veriyor.' },
                      { key: 'outerCamera', label: 'Geri Görüş & Dış Kameralar', desc: 'Dış güvenlik kameraları ile geri görüş sensörleri engelsiz çalışıyor.' },
                    ].map(item => (
                      <div key={item.key} className="flex items-start gap-4 p-3 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl transition-all">
                        <input
                          type="checkbox"
                          id={`chk-${item.key}`}
                          checked={(checklist as any)[item.key]}
                          disabled={isChecklistSaved}
                          onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                          className="mt-1 rounded border-slate-700 text-amber-500 focus:ring-amber-500 w-5 h-5 cursor-pointer bg-slate-900 disabled:opacity-50"
                        />
                        <label htmlFor={`chk-${item.key}`} className="flex-1 cursor-pointer select-none">
                          <span className="font-bold text-xs text-white block">{item.label}</span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block font-medium leading-relaxed">{item.desc}</span>
                        </label>
                      </div>
                    ))}

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-slate-800 flex gap-3">
                      <button
                        onClick={() => {
                          setChecklist({
                            cleaning: true,
                            fuel: true,
                            tires: true,
                            lights: true,
                            extinguisher: true,
                            firstAid: true,
                            documents: true,
                            belts: true,
                            innerCamera: true,
                            outerCamera: true
                          });
                        }}
                        disabled={isChecklistSaved}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold border border-slate-750 cursor-pointer disabled:opacity-50"
                      >
                        Tümünü Uygun İşaretle
                      </button>
                      <button
                        onClick={handleSaveChecklist}
                        disabled={isChecklistSaved}
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent disabled:cursor-not-allowed text-slate-950 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-950/20"
                      >
                        {isChecklistSaved ? 'Checklist Tamamlandı' : 'Kontrolü Kaydet ve Seferi Yetkilendir'}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB: OLAY / ARIZA BİLDİR */}
              {activeTab === 'olay' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                    <h4 className="text-base font-bold text-white">Anlık Olay, Arıza ve Rötar Bildirimi</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sefer esnasında yaşanacak her türlü aksaklığı, arıza durumunu veya gecikmeyi tek tıkla merkeze, okul yönetimine ve velilere bildirebilirsiniz. Sistem konumunuzu otomatik ekleyecektir.
                    </p>
                  </div>

                  <form onSubmit={handleIncidentSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                    
                    {/* Event Type */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Aksaklık / Olay Türü</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          'Trafik Sıkışıklığı',
                          'Araç Arızası',
                          'Trafik Kazası',
                          'Lastik Patlaması',
                          'Yakıt Sıkıntısı',
                          'Öğrenci Gecikmesi',
                          'Veliye Ulaşılamadı',
                          'Rötar Bildirimi',
                          'Diğer Gecikme'
                        ].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setIncidentType(type)}
                            className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                              incidentType === type 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500' 
                                : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label htmlFor="incident-desc" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Açıklama Detayı</label>
                      <textarea
                        id="incident-desc"
                        required
                        rows={3}
                        value={incidentDesc}
                        onChange={e => setIncidentDesc(e.target.value)}
                        placeholder="Örn: Yenimahalle kavşağında zincirleme kaza nedeniyle yol kapalıdır. Yaklaşık 15 dakika gecikme öngörülmektedir."
                        className="w-full bg-slate-950 border border-slate-850 focus:border-rose-500 focus:outline-none rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500"
                      />
                    </div>

                    {/* Metadata Coordinates */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-400 p-3 bg-slate-950 border border-slate-850 rounded-xl">
                      <div>📍 Koordinat: <span className="text-white font-bold">{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span></div>
                      <div>⏰ Zaman Damgası: <span className="text-white font-bold">{new Date().toLocaleTimeString()}</span></div>
                    </div>

                    {/* Photo simulation dropzone */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Fotoğraf / Görsel Kanıt Ekle</label>
                      <div 
                        onClick={() => setIncidentPhoto('simulated_incident_photo.jpg')}
                        className="border-2 border-dashed border-slate-800 hover:border-rose-500/40 rounded-xl p-5 text-center cursor-pointer transition-all bg-slate-950"
                      >
                        {incidentPhoto ? (
                          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold">
                            <CheckCircle className="w-5 h-5" /> incident_proof_photo_06bkt.jpg eklendi! (Simüle Edildi)
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-slate-400">
                            <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                            <p className="text-xs font-bold">Fotoğraf Çekmek veya Yüklemek için Tıklayın</p>
                            <p className="text-[10px] text-slate-500">Kamera veya Galeri entegrasyonu simülatörü</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isReporting}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-950/20"
                    >
                      {isReporting ? 'Bildirim Gönderiliyor...' : 'Olayı Bildir ve Velilere Bildirim İlet'}
                    </button>

                  </form>
                </div>
              )}

              {/* TAB: RESMİ EVRAKLARIM */}
              {activeTab === 'evrak' && (
                <div className="space-y-6">
                  {/* Top Welcome Panel */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" /> Sürücü Belge & Evrak Yönetim Paneli
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Okul servisi şoförlüğü yapabilmeniz için gereken resmi lisans, izin ve belgelerinizi kendiniz yükleyebilir ve güncelleyebilirsiniz.
                      </p>
                    </div>
                    <div className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl font-bold font-mono">
                      Şoför: {currentUser?.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Required Documents List */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
                          <ClipboardList className="w-4 h-4 text-indigo-400" /> Zorunlu Sürücü Evrakları ({driverDocs.length})
                        </h5>

                        <div className="space-y-3">
                          {driverDocs.map((doc: any, i: number) => (
                            <div 
                              key={i} 
                              className={`p-4 bg-slate-900/80 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-700 ${
                                doc.isAlert ? 'border-rose-500/30 bg-rose-950/10 animate-pulse' : 'border-slate-850'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${doc.isAlert ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-white truncate">{doc.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Geçerlilik: {doc.date}</p>
                                  {doc.fileName && (
                                    <p className="text-[9px] text-indigo-400 font-mono mt-1 flex items-center gap-1 bg-indigo-500/5 border border-indigo-500/10 px-1.5 py-0.5 rounded w-fit">
                                      📄 {doc.fileName}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 justify-between sm:justify-end">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                  doc.isAlert 
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                  {doc.left}
                                </span>
                                <button 
                                  onClick={() => {
                                    if (doc.fileName) {
                                      alert(`📂 Belge Detayları:\nAdı: ${doc.name}\nYüklenen Dosya: ${doc.fileName}\nGeçerlilik Tarihi: ${doc.date}\nDurum: ${doc.left}`);
                                    } else {
                                      alert(`⚠️ "${doc.name}" için henüz bir dosya yüklenmedi! Lütfen sağdaki panelden yükleyiniz.`);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  Detay
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Other Uploaded Files List */}
                      <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
                          <File className="w-4 h-4 text-emerald-400" /> Arşivlenen Diğer Ek Belgeler
                        </h5>

                        {documents.filter(doc => doc.category === 'Şoför' && doc.uploadedBy === currentUser?.name).length === 0 ? (
                          <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                            Sistem arşivinde yüklenmiş ek belgeniz bulunmamaktadır.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {documents.filter(doc => doc.category === 'Şoför' && doc.uploadedBy === currentUser?.name).map((doc) => (
                              <div key={doc.id} className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-200 truncate">{doc.name}</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Boyut: {doc.fileSize} • Tarih: {doc.uploadDate}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => alert(`📥 "${doc.name}" bilgisayarınıza indiriliyor.`)}
                                    className="p-1.5 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                                    title="İndir"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`⚠️ "${doc.name}" belgesini arşivden silmek istiyor musunuz?`)) {
                                        deleteDocument(doc.id);
                                        // Also delete from drive storage
                                        const saved = localStorage.getItem('bkt_google_drive_docs');
                                        if (saved) {
                                          try {
                                            const items = JSON.parse(saved).filter((item: any) => item.name !== doc.name);
                                            localStorage.setItem('bkt_google_drive_docs', JSON.stringify(items));
                                          } catch (e) {
                                            console.error(e);
                                          }
                                        }
                                      }
                                    }}
                                    className="p-1.5 hover:bg-rose-950/20 rounded-lg border border-slate-800 hover:border-rose-900 text-slate-400 hover:text-rose-400 cursor-pointer"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Upload File Form Panel */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-5">
                        <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
                          <Upload className="w-4 h-4 text-indigo-400" /> Kendi Evrakını Yükle
                        </h5>

                        <div className="space-y-4 text-xs font-bold text-slate-300">
                          {/* 1. Select document type */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-slate-400 block">Belge Kategorisi / Türü</label>
                            <select
                              value={selectedDocKey}
                              onChange={(e) => {
                                setSelectedDocKey(e.target.value);
                                if (e.target.value !== 'other') {
                                  setCustomDocName('');
                                }
                              }}
                              className="w-full p-2.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl"
                            >
                              <option value="ehliyet">Sürücü Belgesi (Ehliyet)</option>
                              <option value="kimlik">Nüfus Cüzdanı Sureti</option>
                              <option value="ikametgah">İkametgah Belgesi (Yerleşim Yeri)</option>
                              <option value="saglik">Sağlık Raporu</option>
                              <option value="sofor_karti">Şoför Kartı</option>
                              <option value="ehliyet_gbt">Ehliyet GBT Sorgusu / Ceza Puanı</option>
                              <option value="psiko">Psikoteknik Belgesi</option>
                              <option value="adli_sicil_kart">Adli Sicil Kartı Resmi</option>
                              <option value="ruhsat">Araç Tescil Belgesi (Ruhsat)</option>
                              <option value="koltuk_sigorta">Koltuk Sigortası Poliçesi</option>
                              <option value="arac_sigorta">Araç Trafik Sigortası Poliçesi</option>
                              <option value="other">Diğer Ek Belge / Sertifika</option>
                            </select>
                          </div>

                          {/* Custom Doc Name (Only for 'other') */}
                          {selectedDocKey === 'other' && (
                            <div className="space-y-1.5 animate-fade-in">
                              <label className="text-[11px] text-slate-400 block">Ek Belge İsmi / Başlığı</label>
                              <input
                                type="text"
                                placeholder="Örn: Psikoteknik Muayene Makbuzu"
                                value={customDocName}
                                onChange={(e) => setCustomDocName(e.target.value)}
                                className="w-full p-2.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl font-semibold"
                              />
                            </div>
                          )}

                          {/* 2. Expiry date info warning */}
                          <div className="space-y-1.5 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[11px] leading-relaxed text-indigo-300">
                            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Akıllı AI OCR Tarih Çıkarımı
                            </span>
                            Sistemimiz, yüklediğiniz belgenin üzerindeki tarih bilgilerini Yapay Zeka (AI) ve OCR kullanarak otomatik okur ve son geçerlilik tarihini belirler.
                          </div>

                          {/* 3. Dropzone / Upload box */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-slate-400">Belge Dosyası Seç</label>
                            
                            {uploadProgress !== null || isScanning ? (
                              /* Simulation Progress Bar & Logs */
                              <div className="border border-slate-800 p-5 rounded-xl bg-slate-900 text-center space-y-3">
                                <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
                                <div>
                                  <p className="text-[11px] font-bold text-slate-300">Yapay Zeka Evrak Tarama Motoru...</p>
                                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Optik karakter tanıma (OCR) ve veri ayıklama işlemi devrede.</p>
                                </div>
                                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                  <div 
                                    className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${uploadProgress || 15}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-indigo-400">{uploadProgress || 15}%</span>
                              </div>
                            ) : (
                              /* File Dropzone */
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsDragging(false);
                                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                    const file = e.dataTransfer.files[0];
                                    handleUploadDocument(file);
                                  }
                                }}
                                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                                  isDragging 
                                    ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99]' 
                                    : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/60'
                                }`}
                                onClick={() => {
                                  const fileInput = document.getElementById('driver-doc-file-input');
                                  if (fileInput) fileInput.click();
                                }}
                              >
                                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-300">Sürükle Bırak veya Seç</p>
                                <p className="text-[10px] text-slate-500 mt-1">PDF, PNG veya JPEG (Maks 10MB)</p>
                                
                                <input
                                  type="file"
                                  id="driver-doc-file-input"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      const file = e.target.files[0];
                                      handleUploadDocument(file);
                                    }
                                  }}
                                />
                              </div>
                            )}

                            {/* AI Scanning Log Output */}
                            {ocrLogs.length > 0 && (
                              <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fade-in text-left">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> OCR AI Evrak Tarama İşlem Günlüğü
                                </p>
                                <div className="space-y-1.5 font-mono text-[9px] max-h-36 overflow-y-auto scrollbar-thin text-slate-400">
                                  {ocrLogs.map((log, index) => (
                                    <div key={index} className="flex gap-1.5 leading-relaxed">
                                      <span className="text-indigo-500 font-bold">&gt;</span>
                                      <span className={
                                        log.startsWith('❌') 
                                          ? 'text-rose-400' 
                                          : log.startsWith('Geçerlilik tarihi başarıyla') || log.includes('Süresiz') || log.includes('tespit edildi')
                                          ? 'text-emerald-400 font-semibold' 
                                          : 'text-slate-300'
                                      }>
                                        {log}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {extractedInfo && (
                                  <div className="pt-2.5 border-t border-slate-850 mt-2 space-y-1.5 text-[10px] bg-indigo-500/5 p-2 rounded-lg">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400 font-medium">Tarih Çıkarımı:</span>
                                      <span className="font-extrabold text-white bg-indigo-500/20 px-2 py-0.5 rounded text-[9px] border border-indigo-500/30">
                                        {extractedInfo.isSuresiz ? 'SÜRESİZ' : extractedInfo.expiryDate}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-emerald-400 italic font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-400 shrink-0" /> {extractedInfo.extractedText}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PERFORMANSIM */}
              {activeTab === 'performans' && (
                <div className="space-y-6">
                  
                  {/* Indicators Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Memnuniyet Oranı</p>
                      <p className="text-2xl font-extrabold text-emerald-400">98%</p>
                      <span className="text-[9px] text-slate-500">Veli oylama ortalaması</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Denetim Skoru</p>
                      <p className="text-2xl font-extrabold text-blue-400">95/100</p>
                      <span className="text-[9px] text-slate-500">Okul koordinasyon puanı</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Prim</p>
                      <p className="text-2xl font-extrabold text-amber-400">2.450 TL</p>
                      <span className="text-[9px] text-slate-500">Gecikmesiz sefer bonusu</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ceza Puanı</p>
                      <p className="text-2xl font-extrabold text-slate-300">0</p>
                      <span className="text-[9px] text-slate-500">Hız veya kural ihlali</span>
                    </div>

                  </div>

                  {/* SVG Stunning Custom Performance Graph */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">Aylara Göre Puan Grafiği (Son 6 Ay)</h4>
                    
                    <div className="relative h-48 w-full flex items-end justify-between pt-6 px-4">
                      {/* Grid Lines */}
                      <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-between pointer-events-none opacity-10">
                        <div className="border-t border-white w-full"></div>
                        <div className="border-t border-white w-full"></div>
                        <div className="border-t border-white w-full"></div>
                      </div>

                      {[
                        { month: 'Şub', score: 85, h: 'h-[85%]', color: 'bg-slate-700' },
                        { month: 'Mar', score: 90, h: 'h-[90%]', color: 'bg-blue-600' },
                        { month: 'Nis', score: 92, h: 'h-[92%]', color: 'bg-teal-600' },
                        { month: 'May', score: 95, h: 'h-[95%]', color: 'bg-emerald-600' },
                        { month: 'Haz', score: 98, h: 'h-[98%]', color: 'bg-amber-500' },
                        { month: 'Tem', score: 98, h: 'h-[98%]', color: 'bg-gradient-to-t from-amber-500 to-orange-500' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end w-12 group relative">
                          {/* Hover Tooltip */}
                          <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-white z-10 font-mono">
                            {item.score}
                          </div>
                          <div className={`w-8 rounded-t-lg transition-all duration-500 ${item.h} ${item.color} shadow-lg shadow-black/20`} />
                          <span className="text-[10px] text-slate-400 font-bold font-mono">{item.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BİLDİRİMLER */}
              {activeTab === 'bildirimler' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                    <span>Tüm duyuru ve atamalar listelenmiştir.</span>
                    <button 
                      onClick={() => alert('Tüm bildirimler okundu olarak işaretlendi.')}
                      className="text-amber-400 hover:underline cursor-pointer"
                    >
                      Tümünü Okundu Say
                    </button>
                  </div>

                  <div className="space-y-3">
                    {notifications.map(not => (
                      <div 
                        key={not.id} 
                        className={`p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3.5 transition-all hover:border-slate-700`}
                      >
                        <div className={`p-2 rounded-xl mt-0.5 ${
                          not.type === 'error' ? 'bg-rose-500/10 text-rose-400' :
                          not.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                          not.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {not.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
                           not.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                           not.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                           <Info className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-slate-200 font-semibold leading-relaxed">{not.text}</p>
                          <span className="text-[9px] text-slate-500 font-mono block">{not.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: PROFİLİM */}
              {activeTab === 'profil' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  
                  {/* Personal ID card */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-slate-700 font-black text-white text-2xl shadow-inner">
                      AY
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                      <h4 className="font-bold text-white text-base">{currentUser?.name}</h4>
                      <p className="text-xs text-slate-400">Okul Taşıtı Yetkili Şoför Kartı</p>
                      <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1 justify-center sm:justify-start">
                        <Shield className="w-3.5 h-3.5" /> GBT Sicil Durumu: TEMİZ
                      </div>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefon Numarası</label>
                        <input
                          type="tel"
                          required
                          value={profilePhone}
                          onChange={e => setProfilePhone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kan Grubu</label>
                        <input
                          type="text"
                          disabled
                          value="A Rh+"
                          className="w-full bg-slate-950/60 border border-slate-850 rounded-xl p-3 text-xs text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ev Adresi</label>
                        <input
                          type="text"
                          required
                          value={profileAddress}
                          onChange={e => setProfileAddress(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Banka Hesap No (Hakediş IBAN)</label>
                        <input
                          type="text"
                          required
                          value={profileIban}
                          onChange={e => setProfileIban(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                    </div>

                    {/* Salary Security locked indicator */}
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center gap-3">
                      <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-200">Maaş & Özlük Hakları Güvenliği</p>
                        <p className="text-[10px] text-slate-400">Maaş ve cari hakediş hareketleri güvenlik sebebiyle sadece muhasebe panelinde görüntülenebilir.</p>
                      </div>
                    </div>

                    {profileSaved && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-bold text-center">
                        ✓ Değişiklikler başarıyla kaydedildi!
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Bilgilerimi Güncelle
                    </button>

                  </form>
                </div>
              )}

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
