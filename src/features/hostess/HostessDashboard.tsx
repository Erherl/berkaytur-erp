/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, SVGProps } from 'react';
import { useAppStore } from '../../store';
import { DownloadService } from '../../services/DownloadService';
import { StorageService } from '../../services/StorageService';
import { ApiClient } from '../../infrastructure/api/apiClient';
import { Student } from '../../types';
import MapView from '../../components/MapView';
import { 
  Users, CheckCircle2, MessageSquare, AlertTriangle, 
  LogOut, Phone, Shield, Search, Info, HelpCircle, 
  Clock, Check, HeartPulse, Sparkles, Map, ClipboardList, 
  FileText, Camera, ChevronLeft, Bell, User, Lock, Gift, Star,
  Upload, Download, Trash2, Plus, File, RefreshCw, ShieldCheck
} from 'lucide-react';

type HostessTab = 
  | 'home' 
  | 'ogrenciler' 
  | 'yoklama' 
  | 'guzergah' 
  | 'evrak' 
  | 'gunsonu' 
  | 'performans' 
  | 'bildirimler' 
  | 'profil';

export default function HostessDashboard() {
  const { 
    currentUser, logout, students, updateAttendance, addLog, settings, routes, vehicles,
    documents, addDocument, deleteDocument
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<HostessTab>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionType, setSessionType] = useState<'morning' | 'evening'>('morning');

  // Find hostess details
  const hostessRoute = routes.find(r => r.hostessId === currentUser?.id) || routes[0];
  const vehicle = vehicles.find(v => v.id === hostessRoute?.vehicleId);
  const routeStops = hostessRoute?.stops || [];
  
  // Hostess's primary route students
  const routeStudents = students.filter(s => s.routeId === hostessRoute?.id);

  // Search filter
  const filteredStudents = routeStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.parentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Delivery Receiver states
  const [receiverTypes, setReceiverTypes] = useState<Record<string, string>>({});
  const [otherReceiverNames, setOtherReceiverNames] = useState<Record<string, string>>({});

  // End of Day (EOD) Checklist
  const [eodChecklist, setEodChecklist] = useState({
    noStudentsLeft: false,
    lostItems: false,
    cleaning: false,
    damage: false,
    belts: false
  });
  const [isEodCompleted, setIsEodCompleted] = useState(() => {
    return localStorage.getItem(`bkt_eod_${currentUser?.id}`) === 'true';
  });

  // Profile forms
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileAddress, setProfileAddress] = useState('Demetevler, Ankara');
  const [profileIban, setProfileIban] = useState('TR45 0006 1000 0002 9876 5432 10');
  const [profileSaved, setProfileSaved] = useState(false);

  // Hostess Documents and Upload States
  const [hostessDocs, setHostessDocs] = useState(() => {
    const defaultDocs = [
      { key: 'rehberlik_sertifika', name: 'MEB Onaylı Rehberlik Sertifikası (İlkokul mezunları için)', status: 'active', date: 'Süresiz', alert: false, left: 'Ömürlük', fileName: 'meb_rehberlik_sertifikasi.pdf' },
      { key: 'diploma', name: 'Lise Diploması / Mezuniyet Belgesi', status: 'active', date: 'Süresiz', alert: false, left: 'Ömürlük', fileName: 'lise_diplomasi_belgesi.pdf' },
      { key: 'saglik', name: 'Sağlık Raporu (Hepatit / Akciğer / Psikiyatri)', status: 'warning', date: '25.07.2026', alert: true, left: 'Kalan: 9 Gün!', fileName: 'saglik_raporu_heyet.pdf' },
      { key: 'ikametgah', name: 'İkametgah Belgesi (Yerleşim Yeri)', status: 'active', date: '15.11.2026', alert: false, left: 'Günü Var', fileName: 'ikametgah_belgesi_eDevlet.pdf' },
      { key: 'kimlik', name: 'Nüfus Cüzdanı Sureti (Kimlik)', status: 'active', date: 'Süresiz', alert: false, left: 'Ömürlük', fileName: 'kimlik_fotokopisi_hostes.pdf' },
      { key: 'adli_sicil', name: 'Adli Sicil Kaydı Resmi', status: 'active', date: '15.11.2026', alert: false, left: 'Günü Var', fileName: 'sabika_kaydi_eDevlet_hostes.pdf' }
    ];
    const saved = localStorage.getItem(`bkt_hostess_docs_${currentUser?.id}`);
    return saved ? JSON.parse(saved) : defaultDocs;
  });

  const [selectedDocKey, setSelectedDocKey] = useState('rehberlik_sertifika');
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

    const uploadRes = await StorageService.uploadFile(file, 'Hostes');
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
      const res = await ApiClient.extractDocDate(selectedDocKey, fileName, 'hostess');

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
      let updatedDocs = [...hostessDocs];
      
      if (selectedDocKey === 'other') {
        docName = customDocName || fileName || 'Ek Evrak.pdf';
      } else {
        const matched = updatedDocs.find(d => d.key === selectedDocKey);
        if (matched) {
          matched.status = 'active';
          matched.date = finalExpiry;
          matched.left = data.isSuresiz ? 'Ömürlük' : 'Günü Var';
          matched.alert = false;
          matched.fileName = fileName;
          docName = matched.name;
        }
      }

      if (!docName) {
        docName = fileName || 'Rehber Belgesi.pdf';
      }

      setHostessDocs(updatedDocs);
      localStorage.setItem(`bkt_hostess_docs_${currentUser?.id}`, JSON.stringify(updatedDocs));

      // Add to global documents list
      addDocument({
        name: `${currentUser?.name.replace(/\s+/g, '_')}_${fileName}`,
        category: 'Hostes',
        fileUrl: uploadRes.fileUrl || '#',
        fileSize: fileSizeStr,
        uploadedBy: currentUser?.name || 'Rehber'
      });

      // Save to Google Drive document storage
      const folderPath = `BERKAYTUR/Hostesler/${currentUser?.name}`;
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
      const parentPath = 'BERKAYTUR/Hostesler';
      if (!driveItems.some((i: any) => i.name === currentUser?.name && i.path === parentPath)) {
        driveItems.push({
          id: `f_hs_dyn_folder_${Date.now()}`,
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

      addLog('Rehber Evrak Yükleme', `Rehber ${currentUser?.name}, "${docName}" belgesini (Rastgele İsim: ${fileName}) sisteme yükledi. Güvenli virüs taramasından başarıyla geçildi.`);
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

  // WhatsApp template dispatch
  const handleWhatsAppNotify = (student: Student, type: 'greeting' | 'delay') => {
    let message = '';
    const parentName = student.parentName;
    const studentName = student.name;
    
    if (type === 'greeting') {
      message = settings.whatsappGreetingTemplate
        .replace('{veli_adi}', parentName)
        .replace('{ogrenci_adi}', studentName);
    } else {
      message = settings.whatsappDelayTemplate
        .replace('{veli_adi}', parentName)
        .replace('{dakika}', '10');
    }

    const cleanPhone = student.parentPhone.replace(/\s+/g, '').replace('0', '90');
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    
    addLog('WhatsApp Bildirimi', `${studentName} velisine biniş/rötar bildirimi gönderildi.`);
    window.open(url, '_blank');
  };

  // One-tap attendance log
  const handleAttendanceChange = (studentId: string, studentName: string, status: string) => {
    updateAttendance(studentId, sessionType, status as any);
    
    let label = '';
    switch (status) {
      case 'on_bus': label = sessionType === 'morning' ? 'Sabah Servise Bindi' : 'Akşam Servise Bindi'; break;
      case 'at_school': label = 'Okula Geldi / Okula İndi'; break;
      case 'at_home': {
        const receiver = receiverTypes[studentId] || 'Veli';
        const receiverName = receiver === 'Diğer' ? (otherReceiverNames[studentId] || 'Belirtilmedi') : '';
        label = `Eve İndi (Teslim Edilen: ${receiver} ${receiverName ? `- ${receiverName}` : ''})`;
        break;
      }
      case 'absent': label = 'Gelmeyecek / İzinli'; break;
      default: label = 'Bekliyor';
    }
    
    addLog('Yoklama İşlemi', `Rehber ${currentUser?.name}, ${studentName} için durumu güncelledi: ${label}`);
  };

  // Save EOD
  const handleSaveEod = () => {
    if (!eodChecklist.noStudentsLeft) {
      alert('Güvenlik Kuralları Gereği "Araçta Öğrenci Kalmadığı" fiziksel olarak kontrol edilip onaylanmalıdır!');
      return;
    }
    localStorage.setItem(`bkt_eod_${currentUser?.id}`, 'true');
    setIsEodCompleted(true);
    addLog('Gün Sonu Kontrolü Yapıldı', `Rehber ${currentUser?.name}, ${vehicle?.plate} plakalı aracın gün sonu güvenlik kontrollerini tamamladı.`);
    alert('Gün sonu kontrolleri merkeze iletildi. İyi akşamlar dileriz!');
    setActiveTab('home');
  };

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    addLog('Rehber Profil Güncellendi', `Rehber ${currentUser?.name} iletişim bilgilerini güncelledi.`);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Simulated notifications
  const notifications = [
    { id: 'not_1', type: 'error', text: 'Önemli Veli Bildirimi: Ali Yılmaz velisi bugün akşam servisi yerine kendisi alacağını bildirdi.', date: 'Bugün, 08:30' },
    { id: 'not_2', type: 'info', text: 'Duyuru: Tüm rehberlerin 19 Temmuz Cuma günü saat 15:00\'te ilkyardım yenileme seminerine katılması zorunludur.', date: 'Dün, 14:15' },
    { id: 'not_3', type: 'success', text: 'Ödüllendirme: Velilerden gelen üstün memnuniyet anket puanlarınızdan ötürü tebrik ederiz!', date: '10 Tem' }
  ];

  // Map markers
  const mapMarkers = [
    { lat: hostessRoute?.currentLat || 39.9610, lng: hostessRoute?.currentLng || 32.7900, title: `${vehicle?.plate || 'Servisimiz'}`, type: 'bus' as const },
    ...routeStops.map(stop => ({
      lat: stop.latitude,
      lng: stop.longitude,
      title: stop.name,
      description: `Saat: ${stop.estimatedTime}`,
      type: stop.type === 'school' ? ('school' as const) : ('student' as const)
    }))
  ];

  // Student Warnings helpers
  const getStudentWarnings = (studentId: string) => {
    const list: { label: string; color: string; icon: any }[] = [];
    if (studentId === 'st1') {
      list.push({ label: 'İlaç Kullanıyor', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: HeartPulse });
    }
    if (studentId === 'st2') {
      list.push({ label: 'Otizm / Özel İlgi', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Sparkles });
    }
    return list;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_bus': return { text: 'Serviste', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'at_school': return { text: 'Okulda', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'at_home': return { text: 'Evde/İndi', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'absent': return { text: 'Gelmeyecek', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default: return { text: 'Bekliyor', color: 'bg-slate-800 text-slate-400 border-slate-700/60' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Premium Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-950/40 text-white font-extrabold text-lg">
            B
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
              Berkaytur <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">Rehber</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Mobil Rehber Hostes Modülü</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-200">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">Araç Plakası: {vehicle?.plate || 'Belirtilmedi'}</p>
          </div>
          <button 
            id="hostess-logout-btn"
            onClick={logout}
            className="p-2.5 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-400 rounded-xl transition-all cursor-pointer text-slate-300 border border-slate-700/60"
            title="Güvenli Çıkış"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Welcome Block */}
        {activeTab === 'home' && (
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Hoş Geldiniz, {currentUser?.name}! 🌸
              </h2>
              <p className="text-xs text-slate-400">
                Bugün: <span className="font-bold text-slate-200">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span> • 
                Güzergah: <span className="font-bold text-indigo-400">{hostessRoute?.name}</span>
              </p>
            </div>
            
            {/* Quick Status */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                isEodCompleted 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {isEodCompleted ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                Gün Sonu Kontrolü: {isEodCompleted ? 'Tamamlandı' : 'Bekliyor'}
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Content Switching */}
        {activeTab === 'home' ? (
          
          /* Bento Dashboard Card Grid (8 Cards) */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* 1. Öğrenciler Card */}
            <button
              onClick={() => setActiveTab('ogrenciler')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 active:scale-95"
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Öğrenci Listesi</h3>
                <p className="text-[11px] text-slate-400 mt-1">Öğrencilerin özel durumları ve veliler</p>
              </div>
            </button>

            {/* 2. Yoklama Card */}
            <button
              onClick={() => setActiveTab('yoklama')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 active:scale-95"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Hızlı Yoklama</h3>
                <p className="text-[11px] text-slate-400 mt-1">Bindi, Okulda, Evde, Teslim Edildi yoklamaları</p>
              </div>
            </button>

            {/* 3. Güzergah Card */}
            <button
              onClick={() => setActiveTab('guzergah')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-blue-500/5 active:scale-95"
            >
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Güzergah & Duraklar</h3>
                <p className="text-[11px] text-slate-400 mt-1">Canlı harita, durak takibi ve servis konumu</p>
              </div>
            </button>

            {/* 4. Evraklarım Card */}
            <button
              onClick={() => setActiveTab('evrak')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-amber-500/5 active:scale-95"
            >
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Resmi Belgelerim</h3>
                <p className="text-[11px] text-slate-400 mt-1">Sabıka kaydı, kimlik ve eğitim sertifikaları</p>
              </div>
            </button>

            {/* 5. Gün Sonu Kontrolü Card */}
            <button
              onClick={() => setActiveTab('gunsonu')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-rose-500/5 active:scale-95"
            >
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Gün Sonu Kontrolü</h3>
                <p className="text-[11px] text-slate-400 mt-1">"Araçta çocuk kalmadı" zorunlu testi</p>
              </div>
            </button>

            {/* 6. Performansım Card */}
            <button
              onClick={() => setActiveTab('performans')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-purple-500/5 active:scale-95"
            >
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Performans & Prim</h3>
                <p className="text-[11px] text-slate-400 mt-1">Veli anket puanları, cezasızlık bonusları</p>
              </div>
            </button>

            {/* 7. Bildirimler Card */}
            <button
              onClick={() => setActiveTab('bildirimler')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-pink-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-pink-500/5 active:scale-95 relative"
            >
              <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6" />
              </div>
              <span className="absolute top-4 right-4 bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">1</span>
              <div>
                <h3 className="font-bold text-white text-sm">Bildirim & Atamalar</h3>
                <p className="text-[11px] text-slate-400 mt-1">Veli izinleri, gezi ve etkinlik duyuruları</p>
              </div>
            </button>

            {/* 8. Profilim Card */}
            <button
              onClick={() => setActiveTab('profil')}
              className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-slate-500/40 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg hover:shadow-slate-500/5 active:scale-95"
            >
              <div className="p-3 bg-slate-800 text-slate-300 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Rehber Profilim</h3>
                <p className="text-[11px] text-slate-400 mt-1">Kişisel detaylar, IBAN ve iletişim</p>
              </div>
            </button>

          </div>

        ) : (
          
          /* Detailed Sub-views */
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            
            {/* Sub-view Nav Header */}
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center gap-4">
              <button
                onClick={() => setActiveTab('home')}
                className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center text-slate-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeTab === 'ogrenciler' && '👨‍🎓 Öğrenci Kayıtları & Özel Detaylar'}
                  {activeTab === 'yoklama' && '✅ Sefer Yoklama Operasyonları'}
                  {activeTab === 'guzergah' && '📍 Güzergah Durakları & Anlık Konum'}
                  {activeTab === 'evrak' && '📄 Hostes Resmi Belgeleri & Arşiv'}
                  {activeTab === 'gunsonu' && '📷 Gün Sonu Güvenlik Kontrol Formu'}
                  {activeTab === 'performans' && '⭐ Rehber Performans & Prim Karnesi'}
                  {activeTab === 'bildirimler' && '🔔 Duyurular & Veliden Gelen Bildirimler'}
                  {activeTab === 'profil' && '⚙️ Rehber Profil Bilgileri Güncelleme'}
                </h3>
                <p className="text-[11px] text-slate-400">Rehber Hostes Modülü • Berkaytur</p>
              </div>
            </div>

            {/* Tab Body Content */}
            <div className="p-6">
              
              {/* TAB: ÖĞRENCİLERİM */}
              {activeTab === 'ogrenciler' && (
                <div className="space-y-6">
                  {/* Search and Filters */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Öğrenci veya veli adı ile ara..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.map(student => {
                      const warnings = getStudentWarnings(student.id);
                      const isAbsent = student.morningStatus === 'absent' || student.eveningStatus === 'absent';
                      
                      return (
                        <div 
                          key={student.id} 
                          className={`bg-slate-900 border rounded-2xl p-5 space-y-4 relative overflow-hidden transition-all hover:border-slate-700 ${
                            isAbsent ? 'border-rose-900 bg-rose-950/5' : 'border-slate-850'
                          }`}
                        >
                          {isAbsent && (
                            <span className="absolute top-0 right-0 bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                              İzinli / Gelmeyecek
                            </span>
                          )}

                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-white text-lg border border-slate-750">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h5 className="font-bold text-white text-sm">{student.name}</h5>
                              <p className="text-xs text-slate-400">{student.schoolName} • {student.classLevel}</p>
                            </div>
                          </div>

                          {/* Alerts */}
                          {warnings.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
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

                          <div className="space-y-2 pt-3 border-t border-slate-850 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Veli Ad Soyad:</span>
                              <span className="text-slate-200 font-bold">{student.parentName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Veli İrtibat:</span>
                              <a href={`tel:${student.parentPhone}`} className="text-indigo-400 font-bold flex items-center gap-1 hover:underline">
                                <Phone className="w-3.5 h-3.5" /> {student.parentPhone}
                              </a>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 block">Biniş Adresi:</span>
                              <span className="text-[11px] text-slate-300 font-semibold block bg-slate-950 p-2 rounded-lg border border-slate-850">
                                {student.id === 'st1' ? 'Yenimahalle 4. Sokak No: 12' : 'Demetevler Caddesi No: 45'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: YOKLAMA ALMA */}
              {activeTab === 'yoklama' && (
                <div className="space-y-6">
                  
                  {/* Session Filter */}
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setSessionType('morning')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          sessionType === 'morning' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Sabah Servisi Yoklaması
                      </button>
                      <button
                        onClick={() => setSessionType('evening')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          sessionType === 'evening' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Akşam Servisi Yoklaması
                      </button>
                    </div>

                    <span className="text-xs text-slate-400 font-mono">Toplam Öğrenci: {routeStudents.length}</span>
                  </div>

                  {/* Yoklama Kartları Listesi */}
                  <div className="space-y-4">
                    {routeStudents.map(student => {
                      const status = sessionType === 'morning' ? student.morningStatus : student.eveningStatus;
                      const badge = getStatusLabel(status);
                      const isAbsent = status === 'absent';

                      return (
                        <div 
                          key={student.id} 
                          className={`p-5 bg-slate-900 border rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-all hover:border-slate-750 ${
                            isAbsent ? 'border-rose-900/40 bg-rose-950/5' : 'border-slate-850'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-slate-850 rounded-xl flex items-center justify-center font-bold text-white text-base">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm flex items-center gap-2">
                                {student.name}
                                <span className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded-full ${badge.color}`}>
                                  {badge.text}
                                </span>
                              </p>
                              <p className="text-xs text-slate-400 mt-1">Veli: {student.parentName} • {student.parentPhone}</p>
                            </div>
                          </div>

                          {/* Attendance Action Bar */}
                          <div className="flex flex-wrap items-center gap-3">
                            
                            {/* Evening Delivery recipient selector */}
                            {sessionType === 'evening' && status === 'at_home' && (
                              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-850">
                                <span className="text-[10px] text-slate-400 font-bold">Kime Teslim Edildi:</span>
                                <select
                                  value={receiverTypes[student.id] || 'Anne'}
                                  onChange={e => setReceiverTypes({ ...receiverTypes, [student.id]: e.target.value })}
                                  className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded-lg p-1"
                                >
                                  <option value="Anne">Anne</option>
                                  <option value="Baba">Baba</option>
                                  <option value="Anneanne">Anneanne</option>
                                  <option value="Babaanne">Babaanne</option>
                                  <option value="Abi">Abi</option>
                                  <option value="Abla">Abla</option>
                                  <option value="Diğer">Diğer</option>
                                </select>
                                
                                {(receiverTypes[student.id] || 'Anne') === 'Diğer' && (
                                  <input
                                    type="text"
                                    placeholder="İsim girin"
                                    value={otherReceiverNames[student.id] || ''}
                                    onChange={e => setOtherReceiverNames({ ...otherReceiverNames, [student.id]: e.target.value })}
                                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded-lg p-1 w-24"
                                  />
                                )}
                              </div>
                            )}

                            {/* Attendance State Selector Buttons */}
                            <div className="flex items-center gap-1.5">
                              {/* 1. BİNDİ (on_bus) */}
                              <button
                                onClick={() => handleAttendanceChange(student.id, student.name, 'on_bus')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  status === 'on_bus' 
                                    ? 'bg-amber-500 text-slate-950 border-amber-500' 
                                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-850'
                                }`}
                              >
                                🟢 Bindi
                              </button>

                              {/* 2. OKULDA (at_school) - Only Morning */}
                              {sessionType === 'morning' && (
                                <button
                                  onClick={() => handleAttendanceChange(student.id, student.name, 'at_school')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    status === 'at_school' 
                                      ? 'bg-emerald-600 text-white border-emerald-600' 
                                      : 'bg-slate-950 text-slate-400 hover:text-white border-slate-850'
                                  }`}
                                >
                                  🔵 Okula İndi
                                </button>
                              )}

                              {/* 3. EVDE (at_home) - Only Evening */}
                              {sessionType === 'evening' && (
                                <button
                                  onClick={() => handleAttendanceChange(student.id, student.name, 'at_home')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    status === 'at_home' 
                                      ? 'bg-emerald-600 text-white border-emerald-600' 
                                      : 'bg-slate-950 text-slate-400 hover:text-white border-slate-850'
                                  }`}
                                >
                                  ✅ Teslim Edildi
                                </button>
                              )}

                              {/* 4. GELMEDİ / İZİNLİ */}
                              <button
                                onClick={() => handleAttendanceChange(student.id, student.name, 'absent')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  status === 'absent' 
                                    ? 'bg-rose-600 text-white border-rose-600' 
                                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-850'
                                }`}
                              >
                                🔴 Gelmedi
                              </button>
                            </div>

                            {/* WhatsApp Dispatch Buttons */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleWhatsAppNotify(student, 'greeting')}
                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 cursor-pointer"
                                title="Biniş Bildirimi WhatsApp Gönder"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleWhatsAppNotify(student, 'delay')}
                                className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/20 cursor-pointer"
                                title="Rötar Bildirimi WhatsApp Gönder"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: GÜZERGAH VE HARİTA */}
              {activeTab === 'guzergah' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Stops List */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <h4 className="font-bold text-white text-sm mb-1">{hostessRoute?.name}</h4>
                      <p className="text-xs text-slate-400">Aktif Araç: {vehicle?.plate} • Sürücü: Ahmet Yılmaz</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-indigo-500" />
                        Güzergah Durak Listesi ({routeStops.length})
                      </h5>

                      <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-5 text-slate-300">
                        {routeStops.map(stop => (
                          <div key={stop.id} className="relative">
                            <span className="absolute -left-[24px] top-0.5 w-4 h-4 rounded-full border-2 bg-slate-900 border-indigo-500" />
                            <div>
                              <p className="text-xs font-bold text-slate-100">{stop.name}</p>
                              <p className="text-[10px] text-slate-400">Planlanan Saat: {stop.estimatedTime}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Leaflet MapFrame */}
                  <div className="lg:col-span-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Servis Aracı Canlı GPS Konum Takibi</span>
                        <span className="text-emerald-400 font-bold animate-pulse">● Sistem Çevrimiçi</span>
                      </div>
                      
                      <div className="h-[420px] rounded-xl overflow-hidden border border-slate-850">
                        <MapView center={[hostessRoute?.currentLat || 39.9610, hostessRoute?.currentLng || 32.7900]} zoom={13} markers={mapMarkers} />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB: RESMİ BELGELER */}
              {activeTab === 'evrak' && (
                <div className="space-y-6">
                  {/* Top Welcome Panel */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" /> Rehber Personel Belge & Evrak Yönetim Paneli
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Mevzuat gereği bulundurmanız gereken tüm resmi lisans ve belgelerinizi kendiniz yükleyebilir, son geçerlilik tarihlerini güncelleyebilirsiniz.
                      </p>
                    </div>
                    <div className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl font-bold font-mono">
                      Rehber: {currentUser?.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Required Documents List */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
                          <ClipboardList className="w-4 h-4 text-indigo-400" /> Zorunlu Rehber Evrakları ({hostessDocs.length})
                        </h5>

                        <div className="space-y-3">
                          {hostessDocs.map((doc: any, i: number) => (
                            <div 
                              key={i} 
                              className={`p-4 bg-slate-900/80 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-700 ${
                                doc.alert ? 'border-rose-500/30 bg-rose-950/10 animate-pulse' : 'border-slate-850'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${doc.alert ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-white truncate">{doc.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Son Geçerlilik: {doc.date}</p>
                                  {doc.fileName && (
                                    <p className="text-[9px] text-indigo-400 font-mono mt-1 flex items-center gap-1 bg-indigo-500/5 border border-indigo-500/10 px-1.5 py-0.5 rounded w-fit">
                                      📄 {doc.fileName}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 justify-between sm:justify-end">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                  doc.alert 
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                  {doc.left}
                                </span>
                                <button 
                                  onClick={() => {
                                    if (doc.fileName) {
                                      alert(`📂 Belge Detayları:\nAdı: ${doc.name}\nYüklenen Dosya: ${doc.fileName}\nSon Geçerlilik: ${doc.date}\nDurum: ${doc.left}`);
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

                        {documents.filter(doc => doc.category === 'Hostes' && doc.uploadedBy === currentUser?.name).length === 0 ? (
                          <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                            Sistem arşivinde yüklenmiş ek belgeniz bulunmamaktadır.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {documents.filter(doc => doc.category === 'Hostes' && doc.uploadedBy === currentUser?.name).map((doc) => (
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
                                    onClick={() => DownloadService.downloadReceipt(`Hostes Arşiv Belgesi`, { 'Belge Adı': doc.name, 'Boyut': doc.fileSize, 'Yükleme Tarihi': doc.uploadDate, 'Sahibi': currentUser?.name || 'Rehber Hostes' }, doc.name.replace('.pdf', '.txt'))}
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
                              <option value="rehberlik_sertifika">MEB Onaylı Rehberlik Sertifikası (İlkokul mezunları için)</option>
                              <option value="diploma">Lise Diploması / Mezuniyet Belgesi</option>
                              <option value="saglik">Sağlık Raporu (Hepatit / Akciğer / Psikiyatri)</option>
                              <option value="ikametgah">İkametgah Belgesi (Yerleşim Yeri)</option>
                              <option value="kimlik">Nüfus Cüzdanı Sureti (Kimlik)</option>
                              <option value="adli_sicil">Adli Sicil Kaydı Resmi</option>
                              <option value="other">Diğer Ek Belge / Sertifika</option>
                            </select>
                          </div>

                          {/* Custom Doc Name (Only for 'other') */}
                          {selectedDocKey === 'other' && (
                            <div className="space-y-1.5 animate-fade-in">
                              <label className="text-[11px] text-slate-400 block">Ek Belge İsmi / Başlığı</label>
                              <input
                                type="text"
                                placeholder="Örn: İlk Yardım Sertifikası"
                                value={customDocName}
                                onChange={(e) => setCustomDocName(e.target.value)}
                                className="w-full p-2.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl font-semibold"
                              />
                            </div>
                          )}

                          {/* Expiry date info warning */}
                          <div className="space-y-1.5 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[11px] leading-relaxed text-indigo-300">
                            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Akıllı AI OCR Tarih Çıkarımı
                            </span>
                            Sistemimiz, yüklediğiniz rehber belgesinin üzerindeki tarih bilgilerini Yapay Zeka (AI) ve OCR kullanarak otomatik okur ve son geçerlilik tarihini belirler.
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
                                  const fileInput = document.getElementById('hostess-doc-file-input');
                                  if (fileInput) fileInput.click();
                                }}
                              >
                                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-300">Sürükle Bırak veya Seç</p>
                                <p className="text-[10px] text-slate-500 mt-1">PDF, PNG veya JPEG (Maks 10MB)</p>
                                
                                <input
                                  type="file"
                                  id="hostess-doc-file-input"
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

              {/* TAB: GÜN SONU KONTROLÜ */}
              {activeTab === 'gunsonu' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-base font-bold text-white">Yolculuk Sonu Araç İçi Güvenlik Checklist</h4>
                      {isEodCompleted && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
                          ✓ Bugün Gönderildi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Okul Servis Araçları Yönetmeliği uyarınca; servis sonlandırıldığında araç içinde unutulan öğrenci kalmadığının hostes tarafından fiziksel olarak kontrol edilip onaylanması mecburi yasal bir sorumluluktur.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    
                    {/* EOD Items */}
                    {[
                      { key: 'noStudentsLeft', label: 'Araçta Öğrenci Kalmadı (ZORUNLU KONTROL)', desc: 'Tüm koltukların altları ve arkaları fiziksel olarak taranmış, araç içinde hiçbir öğrenci kalmadığı kesin olarak doğrulanmıştır.' },
                      { key: 'lostItems', label: 'Unutulan Eşya Taraması', desc: 'Araç içinde çanta, suluk, ceket, telefon gibi herhangi bir kişisel eşya unutulmadığı kontrol edildi.' },
                      { key: 'cleaning', label: 'Koltuk ve İç Hijyen Taraması', desc: 'Sıralar ve zemin kontrol edildi, çöp ve kirlilik durumu saptanıp temizlendi.' },
                      { key: 'damage', label: 'Hasar & Tahribat Kontrolü', desc: 'Koltuk kılıfları, camlar, tutunma demirleri taranmış, kasıtlı hasar tespiti yapılmamıştır.' },
                      { key: 'belts', label: 'Kemer Düzenlemeleri', desc: 'Emniyet kemerleri kilitlerinden çıkarılıp koltuk arkalarına düzenli asıldı.' }
                    ].map(item => (
                      <div key={item.key} className="flex items-start gap-4 p-3 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl transition-all">
                        <input
                          type="checkbox"
                          id={`eod-${item.key}`}
                          checked={(eodChecklist as any)[item.key]}
                          disabled={isEodCompleted}
                          onChange={(e) => setEodChecklist({ ...eodChecklist, [item.key]: e.target.checked })}
                          className="mt-1 rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 w-5 h-5 cursor-pointer bg-slate-900 disabled:opacity-50"
                        />
                        <label htmlFor={`eod-${item.key}`} className="flex-1 cursor-pointer select-none">
                          <span className="font-bold text-xs text-white block">{item.label}</span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block leading-relaxed">{item.desc}</span>
                        </label>
                      </div>
                    ))}

                    {/* Camera simulation */}
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Boş Araç Fotoğrafı Yükle</label>
                      <div className="border-2 border-dashed border-slate-800 p-4 rounded-xl text-center cursor-pointer hover:border-indigo-500 bg-slate-950 text-xs text-slate-400">
                        <Camera className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                        Araç içini fotoğraflayın (Arka koltukları gösterecek şekilde)
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-4 border-t border-slate-800 flex gap-3">
                      <button
                        onClick={() => {
                          setEodChecklist({
                            noStudentsLeft: true,
                            lostItems: true,
                            cleaning: true,
                            damage: true,
                            belts: true
                          });
                        }}
                        disabled={isEodCompleted}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold border border-slate-750 cursor-pointer disabled:opacity-50"
                      >
                        Tümünü Onayla
                      </button>
                      <button
                        onClick={handleSaveEod}
                        disabled={isEodCompleted}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-950/20"
                      >
                        {isEodCompleted ? 'Checklist Kaydedildi' : 'Kontrolü Tamamla ve Gönder'}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB: PERFORMANSIM */}
              {activeTab === 'performans' && (
                <div className="space-y-6">
                  {/* Indicators Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Veli Memnuniyeti</p>
                      <p className="text-2xl font-extrabold text-emerald-400">99%</p>
                      <span className="text-[9px] text-slate-500">Son 30 günlük anketler</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Denetim Skoru</p>
                      <p className="text-2xl font-extrabold text-blue-400">98/100</p>
                      <span className="text-[9px] text-slate-500">Müdürlük periyodik denetimleri</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Prim</p>
                      <p className="text-2xl font-extrabold text-amber-400">1.800 TL</p>
                      <span className="text-[9px] text-slate-500">Sorunsuz teslim bonusu</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ceza Puanı</p>
                      <p className="text-2xl font-extrabold text-slate-300">0</p>
                      <span className="text-[9px] text-slate-500">Yönetmelik ve dakiklik ihlali</span>
                    </div>

                  </div>

                  {/* SVG stunning Custom Chart for Hostess */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">Son 6 Aylık Memnuniyet Puanı Seyri</h4>
                    
                    <div className="relative h-48 w-full flex items-end justify-between pt-6 px-4">
                      {/* Grid lines */}
                      <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-between pointer-events-none opacity-10">
                        <div className="border-t border-white w-full"></div>
                        <div className="border-t border-white w-full"></div>
                        <div className="border-t border-white w-full"></div>
                      </div>

                      {[
                        { month: 'Şub', score: 92, h: 'h-[92%]', color: 'bg-slate-700' },
                        { month: 'Mar', score: 94, h: 'h-[94%]', color: 'bg-indigo-600' },
                        { month: 'Nis', score: 96, h: 'h-[96%]', color: 'bg-indigo-500' },
                        { month: 'May', score: 98, h: 'h-[98%]', color: 'bg-purple-600' },
                        { month: 'Haz', score: 99, h: 'h-[99%]', color: 'bg-pink-500' },
                        { month: 'Tem', score: 99, h: 'h-[99%]', color: 'bg-gradient-to-t from-pink-500 to-indigo-500' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end w-12 group relative">
                          <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-white z-10 font-mono">
                            {item.score}%
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
                    <span>Rehber personeli ilgilendiren güncel duyurular.</span>
                    <button onClick={() => alert('Bildirimler temizlendi')} className="text-indigo-400 hover:underline">Tümünü Okundu Say</button>
                  </div>

                  <div className="space-y-3">
                    {notifications.map(not => (
                      <div 
                        key={not.id} 
                        className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3.5 transition-all hover:border-slate-700"
                      >
                        <div className={`p-2 rounded-xl mt-0.5 ${
                          not.type === 'error' ? 'bg-rose-500/10 text-rose-400' :
                          not.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {not.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
                           not.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
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
                  
                  {/* Personal card */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-16 h-16 bg-slate-850 rounded-2xl flex items-center justify-center border border-slate-750 font-black text-white text-2xl shadow-inner">
                      AY
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                      <h4 className="font-bold text-white text-base">{currentUser?.name}</h4>
                      <p className="text-xs text-slate-400">MEB Onaylı Okul Servis Rehberi</p>
                      <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-center sm:justify-start">
                        <Shield className="w-3.5 h-3.5" /> Resmi GBT Sicili: TEMİZ
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
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kan Grubu</label>
                        <input
                          type="text"
                          disabled
                          value="0 Rh+"
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
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Maaş & Prim IBAN No</label>
                        <input
                          type="text"
                          required
                          value={profileIban}
                          onChange={e => setProfileIban(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                    </div>

                    {/* Salary Security locked indicator */}
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center gap-3">
                      <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
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
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
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

// Simple internal helper component for Alert icon
function AlertCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
