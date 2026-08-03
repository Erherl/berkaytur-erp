/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import MapView from '../../components/MapView';
import { 
  User, Shield, Bus, MapPin, CheckCircle2, Clock, 
  MessageSquare, AlertTriangle, Phone, LogOut, DollarSign,
  Calendar, CreditCard, FileText, FileDown, Eye, Send, Star,
  HelpCircle, Check, ThumbsUp, Activity, Bell, FileCheck,
  Share2, Plus, Info, ExternalLink, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { DownloadService } from '../../services/DownloadService';

export default function ParentDashboard() {
  const { 
    currentUser, logout, activeStudentForParent, students, routes, vehicles, users, payments, documents, addLog, updateStudent, updateAttendance
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'home' | 'servisim' | 'ogrencim' | 'odemelerim' | 'sozlesmelerim' | 'bildirimler' | 'canli_konum' | 'etkinlikler' | 'anket' | 'destek' | 'profilim'>('home');

  // Multi-child switcher state
  const cleanPhone = (phone: string) => phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  const parentPhone = currentUser?.phone || '';
  const myStudents = students.filter(s => {
    if (!parentPhone) return false;
    const sPhone = cleanPhone(s.parentPhone);
    const pPhone = cleanPhone(parentPhone);
    return sPhone.includes(pPhone) || pPhone.includes(sPhone);
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    activeStudentForParent?.id || myStudents[0]?.id || ''
  );

  const student = students.find(s => s.id === selectedStudentId) || activeStudentForParent || myStudents[0];

  // Colors per student for premium visual representation
  const studentThemes = [
    { bg: 'bg-blue-50/80', text: 'text-blue-700', border: 'border-blue-200', textLight: 'text-blue-600', ring: 'ring-blue-500/20', accent: 'bg-blue-600', gradient: 'from-blue-600 to-sky-500', hover: 'hover:bg-blue-100/50' },
    { bg: 'bg-purple-50/80', text: 'text-purple-700', border: 'border-purple-200', textLight: 'text-purple-600', ring: 'ring-purple-500/20', accent: 'bg-purple-600', gradient: 'from-purple-600 to-indigo-500', hover: 'hover:bg-purple-100/50' },
    { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200', textLight: 'text-amber-600', ring: 'ring-amber-500/20', accent: 'bg-amber-600', gradient: 'from-amber-600 to-yellow-500', hover: 'hover:bg-amber-100/50' },
    { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200', textLight: 'text-emerald-600', ring: 'ring-emerald-500/20', accent: 'bg-emerald-600', gradient: 'from-emerald-600 to-teal-500', hover: 'hover:bg-emerald-100/50' }
  ];

  const getStudentTheme = (studentId: string) => {
    const idx = myStudents.findIndex(s => s.id === studentId);
    return studentThemes[idx >= 0 ? idx % studentThemes.length : 0];
  };

  const currentTheme = getStudentTheme(student?.id || '');

  // Sub-tab / UI states
  const [notRidingReason, setNotRidingReason] = useState<'Hasta' | 'İzinli' | 'Tatil' | 'Aile Sebebi' | 'Diğer'>('Hasta');
  const [showNotRidingModal, setShowNotRidingModal] = useState(false);
  const [notRidingStatus, setNotRidingStatus] = useState<string | null>(null);

  // Live bus tracker simulation
  const [simulatedLat, setSimulatedLat] = useState<number | null>(null);
  const [simulatedLng, setSimulatedLng] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(12);
  const [distanceKm, setDistanceKm] = useState<number>(3.4);

  // Form states
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileAddress, setProfileAddress] = useState('Beşiktaş Kent Sitesi A-Blok D:5 İstanbul');
  const [profileAltAddress, setProfileAltAddress] = useState('Kadıköy İş Ofisi B-Blok İstanbul');
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState('0544 111 22 33');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');

  const [ticketSubject, setTicketSubject] = useState<'Şikayet' | 'Teşekkür' | 'Öneri' | 'Araç' | 'Şoför' | 'Hostes' | 'Ödeme' | 'Etkinlik' | 'Diğer'>('Öneri');
  const [ticketMessage, setTicketMessage] = useState('');
  const [tickets, setTickets] = useState([
    { id: 't1', subject: 'Ödeme', message: 'Taksit ödeme kanalları hakkında bilgi rica ederim.', status: 'Çözüldü', date: '12.07.2026' },
    { id: 't2', subject: 'Hostes', message: 'Sabah binişte rehber hostesimiz son derece ilgiliydi, teşekkürler.', status: 'Açık', date: '15.07.2026' }
  ]);

  const [feedbackRatings, setFeedbackRatings] = useState({
    firma: 5,
    arac: 5,
    sofor: 5,
    hostes: 5,
    sorumlu: 5,
    genel: 5
  });
  const [feedbackComment, setFeedbackComment] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  const [signedContractLocal, setSignedContractLocal] = useState<boolean>(false);
  const [typedName, setTypedName] = useState<string>('');
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');

  // Local storage for keeping parent survey ratings or tickets
  useEffect(() => {
    const savedTickets = localStorage.getItem(`bkt_tickets_${currentUser?.id}`);
    if (savedTickets) setTickets(JSON.parse(savedTickets));
    const savedSurvey = localStorage.getItem(`bkt_survey_${currentUser?.id}`);
    if (savedSurvey) setSurveySubmitted(JSON.parse(savedSurvey));
  }, [currentUser?.id]);

  // Find associated route
  const activeRoute = routes.find(r => r.id === student?.routeId);
  const vehicle = vehicles.find(v => v.id === activeRoute?.vehicleId);
  const driver = users.find(u => u.role === 'driver' && u.vehicleId === vehicle?.id);
  const hostess = users.find(u => u.role === 'hostess' && u.vehicleId === vehicle?.id);

  // Simulated active movement when route is started by driver or simulation loaded
  useEffect(() => {
    if (activeRoute) {
      setSimulatedLat(activeRoute.currentLat || 39.9610);
      setSimulatedLng(activeRoute.currentLng || 32.7900);
      
      if (import.meta.env?.DEV) {
        const interval = setInterval(() => {
          setSimulatedLat(prev => {
            if (!prev) return 39.9610;
            const targetLat = 39.9040;
            const diff = targetLat - prev;
            const step = diff * 0.05 + (Math.random() - 0.5) * 0.0005;
            const newVal = prev + step;
            const rawEta = Math.max(1, Math.round(Math.abs(diff) * 120));
            setEtaMinutes(rawEta);
            setDistanceKm(Number((Math.abs(diff) * 15).toFixed(1)));
            return newVal;
          });
          setSimulatedLng(prev => {
            if (!prev) return 32.7900;
            const targetLng = 32.8610;
            const diff = targetLng - prev;
            const step = diff * 0.05 + (Math.random() - 0.5) * 0.0005;
            return prev + step;
          });
        }, 4000);

        return () => clearInterval(interval);
      }
    } else {
      setSimulatedLat(null);
      setSimulatedLng(null);
    }
  }, [activeRoute?.id]);

  // Handle WhatsApp web share helper
  const triggerWhatsApp = (phone: string, text: string) => {
    const formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '90');
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNotRidingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    // Update attendance state for both morning and evening (not riding)
    updateAttendance(student.id, 'morning', 'absent');
    updateAttendance(student.id, 'evening', 'absent');

    addLog(
      'Servis Yokluğu Bildirildi',
      `Veli ${currentUser?.name}, öğrenci ${student.name} için bugünkü servisleri iptal etti. Sebep: ${notRidingReason}`
    );

    setNotRidingStatus(`Bugün servise binmeyecek bildirimi iletildi (${notRidingReason})`);
    setShowNotRidingModal(false);

    alert(
      `Bildiriminiz başarıyla iletildi!\n\nÖğrenci: ${student.name}\nSebep: ${notRidingReason}\n\nŞoför (${driver?.name || 'Ahmet Bey'}), Rehber Hostes (${hostess?.name || 'Ayşe Hanım'}) ve Okul Sorumlusuna anlık bildirim gönderildi. Öğrenci koltuğu sarı renge boyandı. Puantaj etkilenmeyecektir.`
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profilePhone !== currentUser?.phone) {
      alert("Güvenlik Uyarısı:\n\nTelefon numarası değişikliği okul sorumlusu onayı gerektirmektedir. Onay talebiniz koordinatöre iletilmiştir. Bilgileriniz onay sonrası kalıcı olarak güncellenecektir.");
    }

    addLog(
      'Veli Profil Güncelleme',
      `Veli ${currentUser?.name} iletişim bilgilerini güncelledi. Yeni E-posta: ${profileEmail}`
    );

    alert("Profil bilgileriniz başarıyla kaydedildi. Öğrenci bilgileri güvenliğiniz sebebiyle okul yönetimince değiştirilebilir.");
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    const newTicket = {
      id: `t_${Date.now()}`,
      subject: ticketSubject,
      message: ticketMessage,
      status: 'Açık',
      date: new Date().toLocaleDateString('tr-TR')
    };

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    localStorage.setItem(`bkt_tickets_${currentUser?.id}`, JSON.stringify(updated));

    addLog(
      'Destek Talebi Oluşturuldu',
      `Veli ${currentUser?.name} tarafından "${ticketSubject}" konulu destek talebi iletildi.`
    );

    alert(`Destek talebiniz başarıyla oluşturuldu!\n\nTalebiniz doğrudan Okul Sorumlusuna ve Proje Müdürüne iletilmiştir. En kısa sürede tarafınıza bilgi sunulacaktır.`);
    setTicketMessage('');
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSurveySubmitted(true);
    localStorage.setItem(`bkt_survey_${currentUser?.id}`, JSON.stringify(true));

    addLog(
      'Memnuniyet Anketi Gönderildi',
      `Veli ${currentUser?.name} haftalık memnuniyet anketini tamamladı.`
    );

    alert("Haftalık memnuniyet anketiniz için teşekkür ederiz! Görüşleriniz hizmet standartlarımızı yükseltmekte kullanılacaktır.");
  };

  // Pre-configured installments
  const customInstallments = [
    { no: '1', date: '05.09.2026', amount: 3500, status: 'paid', label: 'Eylül Ayı Taksiti' },
    { no: '2', date: '05.10.2026', amount: 3500, status: 'paid', label: 'Ekim Ayı Taksiti' },
    { no: '3', date: '05.11.2026', amount: 3500, status: 'paid', label: 'Kasım Ayı Taksiti' },
    { no: '4', date: '05.12.2026', amount: 3500, status: 'paid', label: 'Aralık Ayı Taksiti' },
    { no: '5', date: '05.01.2027', amount: 3500, status: 'upcoming', label: 'Ocak Ayı Taksiti' },
    { no: '6', date: '05.02.2027', amount: 3500, status: 'upcoming', label: 'Şubat Ayı Taksiti' },
    { no: '7', date: '05.03.2027', amount: 3500, status: 'upcoming', label: 'Mart Ayı Taksiti' },
    { no: '8', date: '05.04.2027', amount: 3500, status: 'upcoming', label: 'Nisan Ayı Taksiti' },
  ];

  // Activities
  const parentActivities: any[] = [];

  const [activitiesState, setActivitiesState] = useState(parentActivities);

  const toggleActivityApproval = (id: string) => {
    const updated = activitiesState.map(act => {
      if (act.id === id) {
        const nextState = !act.approved;
        addLog(
          'Etkinlik Katılım Durumu Değişti',
          `Veli ${currentUser?.name}, ${act.title} için onay durumunu ${nextState ? 'Katılıyor' : 'Katılmıyor'} olarak güncelledi.`
        );
        return { ...act, approved: nextState };
      }
      return act;
    });
    setActivitiesState(updated);
    alert("Etkinlik katılım tercihiniz başarıyla okul yönetimine bildirilmiştir.");
  };

  const getAttendanceBadgeClass = (status: string) => {
    switch (status) {
      case 'on_bus': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'at_school': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'at_home': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'absent': return 'text-rose-700 bg-rose-100 border-rose-200';
      default: return 'text-slate-500 bg-slate-100 border-slate-200';
    }
  };

  const getAttendanceLabel = (status: string) => {
    switch (status) {
      case 'on_bus': return 'Araçta';
      case 'at_school': return 'Okulda';
      case 'at_home': return 'Evde';
      case 'absent': return 'Gelmeyecek';
      default: return 'Bekliyor';
    }
  };

  // Notification Feed
  const parentNotifications: any[] = [];

  // Leaflet markers configuration
  const mapCenter: [number, number] = student?.latitude && student?.longitude 
    ? [student.latitude, student.longitude] 
    : [41.0082, 28.9784];

  const markers: any[] = [];
  if (student?.latitude && student?.longitude) {
    markers.push({
      lat: student.latitude,
      lng: student.longitude,
      title: `${student.name} (Ev Konumu)`,
      type: 'student'
    });
  }

  // School Coordinate
  markers.push({
    lat: 39.9040,
    lng: 32.8610,
    title: student?.schoolName || 'Okul',
    type: 'school'
  });

  // Current bus coordinates (simulated or real)
  if (simulatedLat && simulatedLng) {
    markers.push({
      lat: simulatedLat,
      lng: simulatedLng,
      title: `${vehicle?.plate || 'Servis'} - Hareket Halinde`,
      description: `Sürücü: ${driver?.name || 'Ahmet Sürücü'} • Rehber: ${hostess?.name || 'Ayşe Rehber'}`,
      type: 'bus'
    });
  }

  // Aggregate stats for survey visualization
  const surveyStats = [
    { name: 'Firma Güveni', puan: 4.8 },
    { name: 'Araç Konforu', puan: 4.7 },
    { name: 'Sürücü Güvenliği', puan: 4.9 },
    { name: 'Rehber İlgisi', puan: 4.6 },
    { name: 'Sorumlu İletişimi', puan: 4.8 },
    { name: 'Genel Memnuniyet', puan: 4.8 }
  ];

  // Helper formatting for current Turkish date
  const getTurkishDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('tr-TR', options);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200 text-white font-extrabold text-lg">
            B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-800 text-lg tracking-tight">BERKAYTUR</h1>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider">Veli Portalı</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Okul Servis Yönetimi & Veli Bilgilendirme</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-700">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 font-semibold">{currentUser?.phone}</p>
          </div>
          <button 
            id="parent-logout-btn"
            onClick={logout}
            className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all cursor-pointer text-slate-600"
            title="Güvenli Çıkış"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Student Fast Selector Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <User className="w-4 h-4 text-blue-500" />
          <span>Lütfen işlem yapmak istediğiniz öğrenciyi seçiniz:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {myStudents.map(stud => {
            const isSelected = stud.id === student?.id;
            const theme = getStudentTheme(stud.id);
            return (
              <button
                key={stud.id}
                onClick={() => setSelectedStudentId(stud.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-left transition-all duration-300 relative ${
                  isSelected 
                    ? `bg-white ${theme.border} text-slate-800 shadow-md ring-2 ${theme.ring} scale-102` 
                    : `bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300`
                } cursor-pointer`}
              >
                {/* Visual colored pill indicator */}
                <span className={`w-3 h-3 rounded-full ${theme.accent}`} />
                <div>
                  <p className="text-xs font-extrabold">{stud.name}</p>
                  <p className="text-[10px] opacity-70 font-medium">{stud.schoolName} • {stud.classLevel}</p>
                </div>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* TAB NAVIGATION RAIL */}
        {activeTab !== 'home' && (
          <button
            onClick={() => setActiveTab('home')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-xs text-xs font-bold transition-all cursor-pointer"
          >
            ← Ana Menüye Dön
          </button>
        )}

        {/* -------------------- HOME TAB (DASHBOARD) -------------------- */}
        {activeTab === 'home' && (
          <div className="space-y-8 py-4 animate-fade-in">
            {/* Dynamic Status Notifications */}
            {student?.registrationStatus === 'Potansiyel' && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-left max-w-3xl mx-auto space-y-3 relative overflow-hidden shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                    🔒
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-amber-950 text-sm">Ön Kayıt Başvurunuz İncelemededir (Potansiyel)</h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Değerli Velimiz, öğrencimiz <strong>{student.name}</strong> için yaptığınız servis ön kayıt başvurusu şu an "Potansiyel Müşteri" aşamasındadır. Okul servis koordinatörümüz güzergahı planlayıp onayladıktan sonra size sözleşme gönderilecektir. Bu süre zarfında şoför, rehber, araç ve canlı konum detayları kapalı tutulmaktadır.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {student?.registrationStatus === 'Sözleşme Bekliyor' && (
              <div className="bg-purple-50 border border-purple-200 rounded-3xl p-6 text-left max-w-3xl mx-auto space-y-3 relative overflow-hidden shadow-xs animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                    ✍️
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-extrabold text-purple-950 text-sm">Hizmet Sözleşmeniz İmza Bekliyor</h4>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Öğrenci servis başvurunuz onaylanmıştır! Servis biniş planlamasının ve araç atamalarının tamamlanabilmesi için lütfen <strong>"Sözleşmelerim"</strong> sekmesine giderek dijital servis sözleşmesini imzalayıp onaylayınız.
                    </p>
                    <button
                      onClick={() => setActiveTab('sozlesmelerim')}
                      className="mt-2.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Şimdi Sözleşmeyi İmzala →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {student?.registrationStatus === 'İmzalandı' && (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-left max-w-3xl mx-auto space-y-3 relative overflow-hidden shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-blue-950 text-sm">Hizmet Sözleşmeniz İmzalanmıştır</h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Harika! Servis hizmet sözleşmeniz başarıyla dijital olarak imzalandı. Plaka, rehber ve şoför atamalarınız koordinatörümüz tarafından tamamlandığında öğrenci servis biniş kaydı tamamen aktifleşecektir.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Center Greeting Showcase */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center max-w-3xl mx-auto space-y-4 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto shadow-sm border border-blue-100/40">
                {student?.name.charAt(0) || 'O'}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">HOŞ GELDİNİZ</span>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Sayın {currentUser?.name}</h2>
                <p className="text-xs text-slate-400 font-semibold">{getTurkishDate()}</p>
              </div>

              <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
                <strong className="text-blue-600 font-bold">Berkaytur Okul Servisi Yönetim Sistemi</strong> Veli Portalı ile çocuğunuzun servis güvenliğini, ödemelerini, sözleşmelerini ve canlı konumunu anlık takip edin.
              </p>

              {notRidingStatus && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{notRidingStatus}</span>
                </div>
              )}
            </div>

            {/* 9 Modern Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 🚌 SERVİSİM */}
              <button 
                onClick={() => setActiveTab('servisim')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  🚌
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Servisim</h3>
                  <p className="text-xs text-slate-400 font-medium">Sürücü, rehber hostes bilgileri ve biniş saatleri.</p>
                </div>
              </button>

              {/* 👨‍🎓 ÖĞRENCİM */}
              <button 
                onClick={() => setActiveTab('ogrencim')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  👨‍🎓
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Öğrencim</h3>
                  <p className="text-xs text-slate-400 font-medium">Öğrencinin okul, şube ve güzergah kartı bilgileri.</p>
                </div>
              </button>

              {/* 💳 ÖDEMELERİM */}
              <button 
                onClick={() => setActiveTab('odemelerim')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  💳
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Ödemelerim</h3>
                  <p className="text-xs text-slate-400 font-medium">Taksitler, toplam bakiye ve dekont arşivi.</p>
                </div>
              </button>

              {/* 📄 SÖZLEŞMELERİM */}
              <button 
                onClick={() => setActiveTab('sozlesmelerim')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  📄
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Sözleşmelerim</h3>
                  <p className="text-xs text-slate-400 font-medium">Hizmet sözleşmeleri ve diğer resmi belgelerim.</p>
                </div>
              </button>

              {/* 📢 BİLDİRİMLER */}
              <button 
                onClick={() => setActiveTab('bildirimler')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-pink-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  📢
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Bildirimler</h3>
                  <p className="text-xs text-slate-400 font-medium">Güzergah, şoför ve ödeme bildirimleri arşivi.</p>
                </div>
              </button>

              {/* 📍 CANLI KONUM */}
              <button 
                onClick={() => setActiveTab('canli_konum')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  📍
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Canlı Konum</h3>
                  <p className="text-xs text-slate-400 font-medium">Servis aracının canlı konumu ve tahmini varış süresi.</p>
                </div>
              </button>

              {/* 📅 ETKİNLİKLER */}
              <button 
                onClick={() => setActiveTab('etkinlikler')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  📅
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Etkinlikler</h3>
                  <p className="text-xs text-slate-400 font-medium">Okul gezileri katılım onayları ve planlamaları.</p>
                </div>
              </button>

              {/* ⭐ MEMNUNİYET ANKETİ */}
              <button 
                onClick={() => setActiveTab('anket')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-cyan-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  ⭐
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Memnuniyet Anketi</h3>
                  <p className="text-xs text-slate-400 font-medium">Haftalık sürücü, rehber ve firma değerlendirmeleri.</p>
                </div>
              </button>

              {/* ☎ DESTEK MERKEZİ */}
              <button 
                onClick={() => setActiveTab('destek')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-rose-300 transition-all cursor-pointer space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-all duration-300 opacity-60" />
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-xl font-bold relative z-10">
                  ☎
                </div>
                <div className="space-y-1 relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-base">Destek Merkezi</h3>
                  <p className="text-xs text-slate-400 font-medium">Şikayet, öneri, talep veya teşekkür bildirimleri.</p>
                </div>
              </button>

            </div>

            {/* Profilim and Fast Action block */}
            <div className="bg-slate-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white text-slate-700 rounded-xl flex items-center justify-center shadow-xs border border-slate-200 font-bold">
                  👤
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">İletişim ve Adres Bilgilerim</h4>
                  <p className="text-xs text-slate-500">Sistemdeki kayıtlı telefon, e-posta ve ev-iş adreslerini görüntüle.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('profilim')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Profili Güncelle
              </button>
            </div>
          </div>
        )}

        {/* -------------------- SERVİSİM TAB -------------------- */}
        {activeTab === 'servisim' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-slate-800">Servis Bilgileri</h2>
              <p className="text-xs text-slate-500 mt-1">Öğrencinizin aktif taşıma aracı ve güzergah sorumlu personeli.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left col: Vehicle & Staff */}
              <div className="md:col-span-5 space-y-6">
                
                {/* Vehicle details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Taşıma Aracı</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">PLAKA</p>
                      <span className="px-2.5 py-1 bg-slate-800 text-white font-mono font-extrabold rounded-lg inline-block text-sm border border-slate-900">
                        {vehicle?.plate || '06 BKT 123'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase text-right">ARAÇ KAPASİTESİ</p>
                      <p className="text-sm font-extrabold text-slate-700 text-right">{vehicle?.capacity || 19} Koltuk</p>
                    </div>
                  </div>
                  <div className="pt-2 text-xs text-slate-500 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <Info className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Araç: <strong className="font-bold">{vehicle?.brand} {vehicle?.model}</strong></span>
                  </div>
                </div>

                {/* Sürücü */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-xl">
                      👨‍✈️
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">SÜRÜCÜ ŞOFÖR</p>
                      <h4 className="font-extrabold text-slate-800 text-base">{driver?.name || 'Ahmet Yılmaz'}</h4>
                      <p className="text-xs text-slate-500">{driver?.phone || '0555 444 55 66'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerWhatsApp(
                        driver?.phone || '05554445566', 
                        `Merhaba Ahmet Bey, ben ${student?.name} öğrencimizin velisiyim.`
                      )}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" /> WhatsApp
                    </button>
                    <a
                      href={`tel:${driver?.phone || '05554445566'}`}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      Ara
                    </a>
                  </div>
                </div>

                {/* Rehber Hostes */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold text-xl">
                      👩‍🏫
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">REHBER HOSTES</p>
                      <h4 className="font-extrabold text-slate-800 text-base">{hostess?.name || 'Ayşe Yıldız'}</h4>
                      <p className="text-xs text-slate-500">{hostess?.phone || '0555 555 66 77'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerWhatsApp(
                        hostess?.phone || '05555556677', 
                        `Merhaba Ayşe Hanım, ben ${student?.name} öğrencimizin velisiyim.`
                      )}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" /> WhatsApp
                    </button>
                    <a
                      href={`tel:${hostess?.phone || '05555556677'}`}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      Ara
                    </a>
                  </div>
                </div>

                {/* Sabah / Akşam saatleri */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                    <p className="text-[9px] font-bold text-blue-500 uppercase">SABAH ALIŞ</p>
                    <p className="text-lg font-extrabold text-blue-900 mt-1">07:45</p>
                  </div>
                  <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 text-center">
                    <p className="text-[9px] font-bold text-purple-500 uppercase">AKŞAM BIRAKIŞ</p>
                    <p className="text-lg font-extrabold text-purple-900 mt-1">16:15</p>
                  </div>
                </div>

              </div>

              {/* Right col: Map */}
              <div className="md:col-span-7">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 h-full flex flex-col">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Güzergah Haritası</h3>
                    <p className="text-xs text-slate-500">Öğrenci ev konumu ve okul koordinatları.</p>
                  </div>
                  <div className="flex-1 min-h-[350px]">
                    <MapView center={mapCenter} zoom={13} markers={markers} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- ÖĞRENCİM TAB -------------------- */}
        {activeTab === 'ogrencim' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-slate-800">Öğrenci Bilgi Kartı</h2>
              <p className="text-xs text-slate-500 mt-1">Öğrencinin servis ve okul kayıt detayları.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Student Card Block */}
              <div className={`bg-white border-2 ${currentTheme.border} rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden`}>
                <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${currentTheme.gradient}`} />
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Photo Section */}
                  <div className={`w-24 h-24 ${currentTheme.bg} ${currentTheme.text} rounded-2xl flex items-center justify-center font-extrabold text-4xl shadow-inner border border-slate-200/50`}>
                    {student?.name.charAt(0)}
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{student?.name}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                        No: {student?.studentNumber}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-500">{student?.schoolName}</p>
                    <p className="text-xs font-medium text-slate-400">
                      Sınıfı: {student?.classLevel.split('-')[0]}. Sınıf • Şubesi: {student?.classLevel.split('-')[1]} Şubesi
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Servis Güzergahı</span>
                    <p className="font-extrabold text-slate-700 mt-0.5">{student?.routeName || 'Yenimahalle Güzergahı'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Araç Plakası</span>
                    <p className="font-extrabold text-slate-700 mt-0.5">{vehicle?.plate || '06 BKT 123'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Şoför Sürücü</span>
                    <p className="font-extrabold text-slate-700 mt-0.5">{driver?.name || 'Ahmet Yılmaz'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Sorumlu Hostes</span>
                    <p className="font-extrabold text-slate-700 mt-0.5">{hostess?.name || 'Ayşe Yıldız'}</p>
                  </div>
                </div>

                {/* Today riding status */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-150">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">BUGÜN YOKLAMA DURUMU</span>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${getAttendanceBadgeClass(student?.morningStatus || 'pending')}`}>
                        Sabah: {getAttendanceLabel(student?.morningStatus || 'pending')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${getAttendanceBadgeClass(student?.eveningStatus || 'pending')}`}>
                        Akşam: {getAttendanceLabel(student?.eveningStatus || 'pending')}
                      </span>
                    </div>
                  </div>
                  
                  {student?.morningStatus !== 'absent' && (
                    <button
                      onClick={() => setShowNotRidingModal(true)}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                    >
                      ⚠️ Bugün Servise Binmeyecek
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* NOT RIDING DIALOG */}
            {showNotRidingModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-100 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 text-lg">Servise Binmeyecek Bildirimi</h3>
                    <button 
                      onClick={() => setShowNotRidingModal(false)}
                      className="p-1 bg-slate-100 hover:bg-slate-200 rounded-full"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-slate-600 text-sm">
                    <strong>{student?.name}</strong> öğrencimizin bugün servisi kullanmayacağını bildirmektesiniz. Lütfen geçerli sebebi seçiniz:
                  </p>

                  <form onSubmit={handleNotRidingSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase">SEBEPLER</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Hasta', 'İzinli', 'Tatil', 'Aile Sebebi', 'Diğer'] as const).map(reason => (
                          <label 
                            key={reason}
                            className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                              notRidingReason === reason 
                                ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="reason"
                              checked={notRidingReason === reason}
                              onChange={() => setNotRidingReason(reason)}
                              className="sr-only"
                            />
                            <span>{reason}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-400 space-y-1">
                      <p>• Bu işlem şoför, hostes ve koordinatöre anlık sms/uygulama bildirimi gönderir.</p>
                      <p>• Sürücü ekranında koltuk sarı renge bürünerek duraktan geçileceğini belirtir.</p>
                      <p>• Aylık puantaj ve bakiye hesabı bu işlemden etkilenmeyecektir.</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNotRidingModal(false)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                      >
                        Kaydet ve Bildir
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* -------------------- ÖDEMELERİM TAB -------------------- */}
        {activeTab === 'odemelerim' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-slate-800">Servis Ödemelerim</h2>
              <p className="text-xs text-slate-500 mt-1">Öğrencinin yıllık ödeme planı, taksitleri ve tahsilat dekontları.</p>
            </div>

            {/* financial summary widgets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Toplam Ücret</span>
                <p className="text-xl font-extrabold text-slate-800 mt-1">28,000 TL</p>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-emerald-500 font-bold uppercase">Ödenen</span>
                <p className="text-xl font-extrabold text-emerald-700 mt-1">14,000 TL</p>
              </div>
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-blue-500 font-bold uppercase">Kalan Borç</span>
                <p className="text-xl font-extrabold text-blue-700 mt-1">14,000 TL</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-rose-500 font-bold uppercase">Son Ödeme</span>
                <p className="text-xs font-extrabold text-rose-700 mt-2">05.11.2026</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Taksitler */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Yıllık Taksit Planı</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customInstallments.map((inst, index) => (
                    <div 
                      key={inst.no}
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        inst.status === 'paid' 
                          ? 'bg-slate-50 border-slate-200' 
                          : 'bg-white border-orange-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500">Taksit #{inst.no}</span>
                          {inst.status === 'paid' ? (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">ÖDENDİ</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] font-bold">YAKLAŞIYOR</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-700">{inst.label}</p>
                        <p className="text-[10px] text-slate-400">Son Ödeme: {inst.date}</p>
                      </div>
                      <p className="text-sm font-black text-slate-800">{inst.amount} TL</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dekontlar */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Ödeme Dekontlarım</h3>
                
                <div className="space-y-3">
                  {[
                    { id: 'dec1', name: 'BKT_DEKONT_EYLUL_421.pdf', date: '05.09.2026', amount: '3500 TL' },
                    { id: 'dec2', name: 'BKT_DEKONT_EKIM_421.pdf', date: '05.10.2026', amount: '3500 TL' },
                    { id: 'dec3', name: 'BKT_DEKONT_KASIM_421.pdf', date: '05.11.2026', amount: '3500 TL' },
                    { id: 'dec4', name: 'BKT_DEKONT_ARALIK_421.pdf', date: '05.12.2026', amount: '3500 TL' }
                  ].map(dec => (
                    <div key={dec.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-extrabold text-slate-700 truncate max-w-[150px]">{dec.name}</h4>
                          <p className="text-[9px] text-slate-400">Tarih: {dec.date} • Tutar: {dec.amount}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Başarılı</span>
                      </div>
                      
                      <div className="flex gap-1.5 pt-1">
                        <button 
                          onClick={() => DownloadService.downloadReceipt(`Veli Dekont Odeme`, { 'Dekont Dosyası': dec.name, 'Tarih': dec.date, 'Tutar': dec.amount, 'Ogrenci': student?.name || 'Belirtilmedi' }, dec.name)}
                          className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FileDown className="w-3 h-3" /> İndir
                        </button>
                        <button 
                          onClick={() => triggerWhatsApp('05551112233', `Merhaba, ${dec.name} nolu dekont dosyasını ekte gönderiyorum.`)}
                          className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center justify-center cursor-pointer"
                          title="WhatsApp Paylaş"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                        <a 
                          href="https://drive.google.com" 
                          target="_blank" 
                          rel="noreferrer"
                          className="py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold flex items-center justify-center"
                          title="Drive'dan Görüntüle"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- SÖZLEŞMELERİM TAB -------------------- */}
        {activeTab === 'sozlesmelerim' && (
          <div className="space-y-6 animate-fade-in">
            {student?.registrationStatus === 'Sözleşme Bekliyor' && !signedContractLocal ? (
              <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 border border-indigo-200/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-wider">İmza Bekliyor</span>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">E-Sözleşme ve Dijital Onay Paneli</h3>
                    <p className="text-xs text-slate-500 font-medium">Lütfen aşağıdaki hizmet sözleşmesi şartlarını okuyup alt kısımda dijital imzanızı onaylayınız.</p>
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs shrink-0 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Hesaplanan Yıllık Ücret</p>
                    <p className="text-2xl font-black text-indigo-600 tracking-tight">{(student as any).calculatedFee || 14700} TL</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">Tüm Vergiler Dahildir</p>
                  </div>
                </div>

                {/* Contract Text Sandbox */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-64 overflow-y-auto text-xs text-slate-600 space-y-4 font-normal shadow-2xs leading-relaxed">
                  <h4 className="font-extrabold text-center text-slate-800 text-sm border-b border-slate-100 pb-2">BERKAYTUR OKUL SERVİS ARAÇLARI HİZMET SÖZLEŞMESİ</h4>
                  <p><strong>1. TARAFLAR:</strong> İşbu sözleşme, bir tarafta Berkaytur Servis Taşımacılık A.Ş. (bundan böyle HİZMET VEREN olarak anılacaktır) ile diğer tarafta Velisi bulunduğunuz <strong>{student.name}</strong> öğrencisi adına hareket eden Velisi <strong>{currentUser?.name || 'Veli'}</strong> (bundan böyle VELİ olarak anılacaktır) arasında akdedilmiştir.</p>
                  <p><strong>2. SÖZLEŞMENİN KONUSU:</strong> HİZMET VEREN'in, VELİ'nin öğrencisini belirlenen güzergahta, güvenli koşullarda, taşıma standartlarına uygun okul servis araçları ile okuluna taşıması ve eğitim öğretim dönemi boyunca servis hizmeti sunmasıdır.</p>
                  <p><strong>3. HİZMET BEDELİ VE ÖDEME:</strong> Taşıma mesafesi İstanbul UKOME genel tarifesine göre hesaplanmış olup yıllık toplam hizmet bedeli <strong>{(student as any).calculatedFee || 14700} TL</strong>'dir. Ödemeler, veli portalı üzerinden kredi kartı veya havale yöntemiyle peşin ya da 9 eşit taksite kadar ödenebilir.</p>
                  <p><strong>4. VELİNİN VE ÖĞRENCİNİN YÜKÜMLÜLÜKLERİ:</strong> Öğrenci, sabah belirlenen biniş saatinden 5 dakika önce biniş noktasında hazır bulunmakla yükümlüdür. Gecikme durumunda servis aracı beklememe hakkına sahiptir. Servis kurallarına aykırı davranan öğrenciler hakkında okul yönetimi bilgilendirilir.</p>
                  <p><strong>5. MÜCBİR SEBEPLER VE FESİH:</strong> Olağanüstü doğa olayları, salgın hastalıklar veya idari makamların kararı ile eğitime ara verilmesi gibi durumlarda, hizmet verilemeyen süreler müteakip dönem planlamasında mahsup edilir.</p>
                  <p className="text-[10px] text-slate-400 font-medium italic mt-4 text-center">Yukarıdaki 5 ana maddeyi ve KVKK Aydınlatma Metnini okudum, anladım ve kabul ediyorum.</p>
                </div>

                {/* Signature Selection and Pad */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-4 shadow-2xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      🖌️ İmza Türünüzü Seçiniz
                    </span>
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setSignatureType('draw')}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${signatureType === 'draw' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Çizerek
                      </button>
                      <button
                        onClick={() => setSignatureType('type')}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${signatureType === 'type' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Yazarak
                      </button>
                    </div>
                  </div>

                  {signatureType === 'draw' ? (
                    <div className="space-y-2">
                      <div className="h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative group cursor-crosshair">
                        <span className="text-slate-300 font-mono text-[9px] pointer-events-none uppercase tracking-wider">İmzanızı Buraya Çiziniz</span>
                        <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                          <span className="px-2 py-1 bg-slate-800 text-white rounded-lg text-[9px] font-bold">Dokunmatik / Mouse Çizim Aktif</span>
                        </div>
                        {/* Simulated drawn signature preview after touch/hover */}
                        <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400">
                          {currentUser?.name} ✓
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Not: Mobil cihazınızda parmağınızla, bilgisayarda mouse yardımıyla kutu içerisine çizim yapabilirsiniz.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Adınızı ve Soyadınızı Yazınız"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl text-center">
                        <span className="font-serif italic text-xl tracking-wide text-indigo-900/60 font-medium">
                          {typedName || currentUser?.name || 'İmza Önizleme'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (signatureType === 'type' && !typedName.trim()) {
                          alert("Lütfen imza yerine geçecek adınızı ve soyadınızı giriniz.");
                          return;
                        }
                        // Perform local state updates and simulated backend updates
                        updateStudent(student.id, { registrationStatus: 'İmzalandı' });
                        setSignedContractLocal(true);
                        addLog('Sözleşme Dijital Olarak İmzalandı', `${student.name} öğrencisinin hizmet sözleşmesi veli ${currentUser?.name} tarafından dijital olarak onaylandı.`);
                        alert("Sözleşmeniz başarıyla imzalandı ve onaylandı! Ödemelerim menüsünden ödeme planını görebilirsiniz.");
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Sözleşmeyi İmzala ve Onayla
                    </button>
                    <button
                      onClick={() => DownloadService.downloadReceipt(`Veli Servis Sozlesmesi`, { 'Sozlesme': 'BKT-2026-SOZLESME-PDF', 'Ogrenci': student?.name || 'Belirtilmedi', 'Imzalayan Veli': currentUser?.name || 'Belirtilmedi', 'Tarih': new Date().toLocaleDateString('tr-TR') }, 'Servis_Sozlesmesi.txt')}
                      className="py-3 px-5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileDown className="w-4 h-4 text-slate-500" /> PDF İndir
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h2 className="text-xl font-extrabold text-slate-800">Sözleşmelerim ve Belgeler</h2>
                  <p className="text-xs text-slate-500 mt-1">Okul taşıma sözleşmeleri, onaylı KVKK evrakları ve yasal belgeler.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Sözleşmeler */}
              <div className="md:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> Aktif Taşıma Sözleşmeleri
                </h3>

                <div className="space-y-3">
                  {[
                    { name: '2026-2027_Ataturk_Anadolu_Lisesi_Sozlesme.pdf', id: 'soz1', size: '2.4 MB', date: '15.06.2026' },
                    { name: 'BKT_Grup_Tasimacilik_Hizmet_Sozlesmesi.pdf', id: 'soz2', size: '1.8 MB', date: '10.06.2026' }
                  ].map(soz => (
                    <div key={soz.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-700">{soz.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Tarih: {soz.date} • Boyut: {soz.size}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => DownloadService.downloadReceipt(`Arsiv Servis Sozlesmesi`, { 'Dosya': soz.name, 'Tarih': soz.date, 'Boyut': soz.size }, soz.name.replace('.pdf', '.txt'))}
                          className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileDown className="w-4 h-4 text-slate-500" /> İndir
                        </button>
                        <button 
                          onClick={() => {
                            DownloadService.downloadReceipt(`Servis Sozlesmesi Telefon Gorunumu`, { 'Dosya': soz.name, 'Tarih': soz.date, 'Cihaz': 'Mobile Phone', 'Boyut': soz.size }, soz.name.replace('.pdf', '_mobil.txt'));
                            alert("Sözleşme akıllı telefon biçiminde başarıyla görüntülendi ve indirildi!");
                          }}
                          className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" /> Telefonunda Aç
                        </button>
                        <a 
                          href="https://drive.google.com" 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center border border-slate-200"
                          title="Google Drive Linki"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Belgelerim */}
              <div className="md:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-purple-500" /> Arşiv Belgelerim
                </h3>

                <div className="space-y-2">
                  {[
                    { label: 'KVKK Veli Onay Formu', icon: '📝' },
                    { label: 'Öğrenci Servis Genel Kuralları Taahhütnamesi', icon: '📜' },
                    { label: 'Tahsilat ve Ödeme Planı Şeması', icon: '📊' },
                    { label: 'Gezi ve Etkinlik Veli İzin Belgesi', icon: '🗺️' },
                    { label: 'Genel Sağlık Beyan Formu Arşivi', icon: '🩺' }
                  ].map((doc, idx) => (
                    <div key={idx} className="p-3 hover:bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{doc.icon}</span>
                        <span className="text-xs font-bold text-slate-700">{doc.label}</span>
                      </div>
                      <button 
                        onClick={() => DownloadService.downloadReceipt(`${doc.label}`, { 'Belge': doc.label, 'Ogrenci': student?.name || 'Belirtilmedi', 'Indiren': currentUser?.name || 'Belirtilmedi' }, `${doc.label.replace(/\s+/g, '_')}.txt`)}
                        className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all text-slate-500 cursor-pointer"
                        title="İndir"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div></div>)}
          </div>
        )}

        {/* -------------------- BİLDİRİMLER TAB -------------------- */}
        {activeTab === 'bildirimler' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Bildirim Arşivi</h2>
                <p className="text-xs text-slate-500 mt-1">Okul yönetimi ve taşıma servisinin veliye gönderdiği tüm bilgilendirmeler.</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
                Toplam 11 Bildirim
              </span>
            </div>

            <div className="space-y-3 max-w-4xl mx-auto">
              {parentNotifications.map((noti, index) => (
                <div key={index} className="p-4 bg-white border border-slate-200 rounded-2xl flex gap-4 hover:shadow-xs transition-all relative overflow-hidden">
                  <div className="w-1.5 absolute inset-y-0 left-0 bg-blue-500" />
                  <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                    {noti.type === 'contract' ? '📄' : noti.type === 'payment' ? '💳' : noti.type === 'reminder' ? '⏰' : noti.type === 'event' ? '📅' : noti.type === 'weather' ? '❄️' : '📢'}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-800">{noti.title}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{noti.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{noti.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- CANLI KONUM TAB -------------------- */}
        {activeTab === 'canli_konum' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Canlı Konum Takibi</h2>
                <p className="text-xs text-slate-500 mt-1">Öğrenci servis aracının anlık güzergah koordinatları ve varış süreleri.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sürücü Aktif
                </span>
                
                <button 
                  onClick={() => {
                    setEtaMinutes(prev => Math.max(2, prev - 1));
                    setDistanceKm(prev => Math.max(0.4, Number((prev - 0.3).toFixed(1))));
                    alert("Simüle araç konumu güncellendi!");
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer"
                  title="Konumu Yenile"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Estimated Arrival Details */}
            <div className="bg-slate-800 text-white rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 text-9xl font-black select-none pointer-events-none -mr-10 -mt-10">
                BUS
              </div>

              <div className="space-y-1 relative z-10">
                <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">TAHMİNİ VARALIK</p>
                <p className="text-4xl font-black text-amber-400 tracking-tight">{etaMinutes} Dakika</p>
              </div>

              <div className="space-y-1 relative z-10 border-t sm:border-t-0 sm:border-x border-white/10 pt-4 sm:pt-0">
                <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">KALAN MESAFE</p>
                <p className="text-4xl font-black text-white tracking-tight">{distanceKm} KM</p>
              </div>

              <div className="space-y-1 relative z-10 pt-4 sm:pt-0">
                <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">GÜZERGAH DURUMU</p>
                <p className="text-lg font-extrabold text-emerald-400 mt-2">Akıcı Trafik</p>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="h-[420px] bg-white border border-slate-200 rounded-3xl overflow-hidden p-2">
              <MapView center={mapCenter} zoom={13} markers={markers} />
            </div>
          </div>
        )}

        {/* -------------------- ETKİNLİKLER TAB -------------------- */}
        {activeTab === 'etkinlikler' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-slate-800">Okul Gezileri & Etkinlikler</h2>
              <p className="text-xs text-slate-500 mt-1">Öğrencinizin katılacağı dış etkinlikler ve taşıma koordinasyon onayları.</p>
            </div>

            <div className="space-y-4 max-w-4xl mx-auto">
              {activitiesState.map(act => (
                <div key={act.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start justify-between gap-6 relative overflow-hidden">
                  <div className={`absolute top-0 inset-y-0 left-0 w-2 ${act.approved ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">Kültürel Etkinlik</span>
                        {act.approved ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">İzin Verildi</span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">Onay Bekliyor</span>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">{act.title}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block">Tarih / Saat:</span>
                        <p className="font-extrabold text-slate-700">{act.date} • {act.time}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Toplanma Yeri:</span>
                        <p className="font-extrabold text-slate-700">{act.place}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Görevli Araç & Kadro:</span>
                        <p className="font-extrabold text-slate-700">{act.vehicle}</p>
                        <p className="text-slate-500">{act.driver} (Sürücü) • {act.hostess} (Hostes)</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Etkinlik Ücreti:</span>
                        <p className="font-black text-blue-600">{act.fee}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:self-center">
                    <button
                      onClick={() => toggleActivityApproval(act.id)}
                      className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                        act.approved 
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {act.approved ? '✕ Katılım İznini Kaldır' : '✓ Katılım Onayı Ver'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- ANKET TAB -------------------- */}
        {activeTab === 'anket' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-slate-800">Memnuniyet Anketi</h2>
              <p className="text-xs text-slate-500 mt-1">Haftalık değerlendirmelerle hizmet standartlarımızı ölçmeye yardımcı olun.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Questionnaire Form */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                
                {surveySubmitted ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto border border-emerald-100">
                      ✓
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800">Haftalık Değerlendirmeniz Kaydedildi</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Bu haftaki anketimizi başarıyla tamamladınız. Katkılarınız için teşekkür ederiz.
                    </p>
                    <button
                      onClick={() => setSurveySubmitted(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Yeniden Oy Ver
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSurveySubmit} className="space-y-5">
                    
                    {([
                      { key: 'firma', label: '1. Kurumsal Firma Hizmet Kalitesi (Berkaytur)' },
                      { key: 'arac', label: '2. Servis Aracının Temizlik ve Konforu' },
                      { key: 'sofor', label: '3. Sürücü Şoförün Trafik Güvenliği ve İletişimi' },
                      { key: 'hostes', label: '4. Rehber Hostesin Öğrenciye İlgisi ve Disiplini' },
                      { key: 'sorumlu', label: '5. Okul Sorumlusu / Koordinatörün Erişilebilirliği' },
                      { key: 'genel', label: '6. Genel Servis Hizmet Memnuniyeti' }
                    ] as const).map(cat => (
                      <div key={cat.key} className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-700 block">{cat.label}</span>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRatings(prev => ({ ...prev, [cat.key]: star }))}
                              className="p-1 cursor-pointer"
                            >
                              <Star 
                                className={`w-6 h-6 ${
                                  feedbackRatings[cat.key] >= star 
                                    ? 'text-amber-500 fill-amber-500' 
                                    : 'text-slate-300'
                                }`} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <label htmlFor="feedback-comment" className="block text-xs font-bold text-slate-600 uppercase">GÖRÜŞ ve ÖNERİLERİNİZ</label>
                      <textarea
                        id="feedback-comment"
                        rows={3}
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Varsa eklemek istediğiniz yorumlarınızı buraya yazabilirsiniz..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                    >
                      Anketi Tamamla ve Gönder
                    </button>

                  </form>
                )}

              </div>

              {/* Aggregated Results visualization */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 flex flex-col">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Haftalık Memnuniyet İndeksi</h3>
                  <p className="text-xs text-slate-500">Berkaytur genelinde velilerden toplanan puan ortalamaları.</p>
                </div>

                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={surveyStats} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                      <XAxis type="number" domain={[0, 5]} hide />
                      <YAxis dataKey="name" type="category" width={100} style={{ fontSize: 10, fontWeight: 'bold', fill: '#475569' }} />
                      <Tooltip formatter={(value) => [`${value} / 5.0`, 'Ortalama']} />
                      <Bar dataKey="puan" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed text-center font-medium">
                  ✓ Değerlendirmeler kalite kontrol birimimizce her Cuma incelenmektedir.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- DESTEK TAB -------------------- */}
        {activeTab === 'destek' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-slate-800">Destek ve Talep Merkezi</h2>
              <p className="text-xs text-slate-500 mt-1">Okul yönetimi, sürücü kadrosu veya muhasebe ile ilgili her türlü talebinizi iletebilirsiniz.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form to submit ticket */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Yeni Destek Talebi</h3>
                
                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ticket-subj" className="block text-xs font-bold text-slate-600 uppercase">KONU SEÇİNİZ</label>
                    <select
                      id="ticket-subj"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold"
                    >
                      {(['Şikayet', 'Teşekkür', 'Öneri', 'Araç', 'Şoför', 'Hostes', 'Ödeme', 'Etkinlik', 'Diğer'] as const).map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ticket-msg" className="block text-xs font-bold text-slate-600 uppercase">MESAJINIZ</label>
                    <textarea
                      id="ticket-msg"
                      required
                      rows={5}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Lütfen talebinizi detaylıca açıklayınız..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    Talebi Koordinasyona İlet
                  </button>
                </form>
              </div>

              {/* Ticket listing */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Geçmiş Destek Taleplerim</h3>
                
                <div className="space-y-3">
                  {tickets.map(t => (
                    <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-bold uppercase">{t.subject}</span>
                          <span className="text-[10px] text-slate-400">{t.date}</span>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'Açık' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-600 italic leading-relaxed">"{t.message}"</p>
                    </div>
                  ))}

                  {tickets.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">Kayıtlı destek talebi bulunmamaktadır.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- PROFİLİM TAB -------------------- */}
        {activeTab === 'profilim' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-slate-800">İletişim Bilgilerim</h2>
              <p className="text-xs text-slate-500 mt-1">Sistemdeki kayıtlı bilgilerinizi düzenleyebilir ve okul sorumlu personeline iletebilirsiniz.</p>
            </div>

            <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6">
              
              <form onSubmit={handleSaveProfile} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="prof-phone" className="block text-xs font-bold text-slate-600 uppercase">TELEFON NUMARASI</label>
                    <input
                      id="prof-phone"
                      type="tel"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400">⚠️ Telefon değişikliği koordinatör onayı gerektirir.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="prof-emergency" className="block text-xs font-bold text-slate-600 uppercase">ACİL DURUM TELEFONU</label>
                    <input
                      id="prof-emergency"
                      type="tel"
                      required
                      value={profileEmergencyPhone}
                      onChange={(e) => setProfileEmergencyPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="prof-email" className="block text-xs font-bold text-slate-600 uppercase">E-POSTA ADRESİ</label>
                  <input
                    id="prof-email"
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="prof-addr" className="block text-xs font-bold text-slate-600 uppercase">EV ADRESİ (ALINIŞ ADRESİ)</label>
                  <textarea
                    id="prof-addr"
                    required
                    rows={2}
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="prof-altaddr" className="block text-xs font-bold text-slate-600 uppercase">İKİNCİ ADRES / İŞ ADRESİ</label>
                  <textarea
                    id="prof-altaddr"
                    rows={2}
                    value={profileAltAddress}
                    onChange={(e) => setProfileAltAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-2 text-xs text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Önemli Not:</strong> Öğrenci bilgileri (okul, şube, biniş durağı koordinatları) veli tarafından doğrudan değiştirilemez. Değişiklik taleplerinizi lütfen <strong>Destek Merkezi</strong> üzerinden okul sorumlusuna iletiniz.
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Bilgileri Güncelle ve Kaydet
                </button>

              </form>

            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-slate-400 text-xs mt-auto font-medium">
        © 2026 Berkaytur Servis A.Ş. Tüm Hakları Saklıdır • Vercel & Google Cloud Platform Entegrasyonu
      </footer>
    </div>
  );
}
