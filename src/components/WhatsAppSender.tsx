/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { ApiClient } from '../infrastructure/api/apiClient';
import { 
  MessageSquare, UserCheck, Users, HelpCircle, 
  Send, Check, AlertCircle, Copy, Play, RefreshCw, FileText, Server,
  QrCode, Terminal, AlertTriangle, ShieldCheck, FileSpreadsheet, Paperclip, 
  MapPin, Image as ImageIcon, Volume2, HardDrive
} from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  role: string;
  phone: string;
  selected: boolean;
  studentName?: string;
}

export default function WhatsAppSender() {
  const { students, users, addLog } = useAppStore();

  // Navigation Tabs: 'bulk' | 'connection' | 'nlp' | 'media'
  const [activeSubTab, setActiveSubTab] = useState<'bulk' | 'connection' | 'nlp' | 'media'>('bulk');

  // Selected Template Category State
  const [selectedCategory, setSelectedCategory] = useState<string>('Yeni Kayıt');

  // Interactive Custom Template Strings Map
  const [templates, setTemplates] = useState<Record<string, string>>({
    'Yeni Kayıt': `Değerli Velimiz {VELI_ADI}, {OGRENCI_ADI} isimli öğrencimizin BERKAYTUR servis kaydı başarıyla oluşturulmuştur. Sözleşme belgeniz Google Drive üzerinde arşivlenmiştir. Bizi tercih ettiğiniz için teşekkür ederiz.`,
    'Sözleşme': `Değerli Velimiz {VELI_ADI}, {OGRENCI_ADI} isimli öğrencimize ait servis sözleşmesi onaylanmıştır. Sözleşme kopyasını aşağıdaki Google Drive arşiv adresimizden indirebilirsiniz:\nhttps://drive.google.com/drive/folders/berkaytur`,
    'Tahsilat Makbuzu': `Sayın Velimiz {VELI_ADI}, {OGRENCI_ADI} için {AY} ayı servis ücreti olan {TUTAR} tutarındaki tahsilat işlemi başarıyla gerçekleştirilmiştir. Makbuzunuz e-arşiv olarak Google Drive klasörünüze kaydedilmiştir.`,
    'Dekont': `Değerli Velimiz {VELI_ADI}, {OGRENCI_ADI} öğrencimize ait {AY} ayı ödeme dekontu muhasebe departmanımız tarafından işlenmiştir.`,
    'Hakediş': `Sayın Şoförümüz {SOFOR_ADI}, {AY} ayı hakediş hesaplamanız tamamlanmıştır. Detaylı hakediş cetveli Google Drive kişisel klasörünüze eklenmiştir. Toplam Hakediş: {TUTAR}`,
    'Etkinlik': `Sayın Velimiz {VELI_ADI}, {OGRENCI_ADI} isimli öğrencimizin katılacağı okul gezisi servisi için araç görevlendirmesi yapılmıştır. Plaka: {PLAKA}, Şoför: {SOFOR_ADI}`,
    'Servis Değişikliği': `Değerli Velimiz {VELI_ADI}, {OGRENCI_ADI} isimli öğrencimizin sabah servis saatleri güncellenmiştir. Yeni Sabah Saati: {SAAT}`,
    'Ödeme Hatırlatma': `Sayın Velimiz {VELI_ADI}, {OGRENCI_ADI} için vadesi geçen {TUTAR} servis ücreti ödemesini yapmanızı rica ederiz. Ödemenizi güvenle Kredi Kartı ile yapabilirsiniz.`,
    'Bayram Tebriği': `BERKAYTUR ailesi olarak, {VELI_ADI} ve tüm sevdiklerinizin Ramazan Bayramı'nı en içten bileklerimizle kutlar, sağlıklı ve mutlu günler dileriz.`
  });

  // Load potential recipients based on application state
  const [recipients, setRecipients] = useState<Recipient[]>(() => {
    const list: Recipient[] = [];
    
    // Add Parents
    students.forEach(st => {
      const parentPhoneClean = st.parentPhone.replace(/[^0-9]/g, '');
      if (parentPhoneClean && !list.some(r => r.phone === parentPhoneClean)) {
        list.push({
          id: `rec_p_${st.id}`,
          name: st.parentName,
          role: 'Veli',
          phone: parentPhoneClean,
          selected: true,
          studentName: st.name
        });
      }
    });

    // Add Drivers
    users.filter(u => u.role === 'driver').forEach(dr => {
      const phoneClean = dr.phone.replace(/[^0-9]/g, '');
      if (phoneClean && !list.some(r => r.phone === phoneClean)) {
        list.push({
          id: `rec_dr_${dr.id}`,
          name: dr.name,
          role: 'Şoför',
          phone: phoneClean,
          selected: false
        });
      }
    });

    return list;
  });

  // Connection State Hooks
  const [connectionState, setConnectionState] = useState<any>({
    status: 'DISCONNECTED',
    qrCode: null,
    phoneNumber: null,
    logs: ['Entegrasyon bekleniyor...']
  });
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // NLP Simulation States
  const [senderName, setSenderName] = useState('Mehmet Sağlam (Veli)');
  const [senderPhone, setSenderPhone] = useState('905321112233');
  const [simText, setSimText] = useState('Bugün Ali okula gelmeyecek, geçmiş olsun.');
  const [nlpAnalysis, setNlpAnalysis] = useState<any>(null);
  const [isNlpLoading, setIsNlpLoading] = useState(false);

  // Multimedia Dispatch States
  const [mediaPhone, setMediaPhone] = useState('905329998877');
  const [mediaMessage, setMediaMessage] = useState('Temmuz 2026 dönemi resmi servis sözleşmesi ekte PDF olarak bilginize sunulmuştur.');
  const [selectedMediaType, setSelectedMediaType] = useState<'PDF' | 'IMAGE' | 'LOCATION' | 'AUDIO' | 'FILE'>('PDF');
  const [isMediaSending, setIsMediaSending] = useState(false);

  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [gatewayMode, setGatewayMode] = useState<'web' | 'gateway'>('gateway');
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Fetch WhatsApp Web service connection status
  const refreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const res = await ApiClient.fetchWhatsAppStatus();
      if (res.success && res.data) {
        setConnectionState(res.data);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(() => {
      refreshStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    try {
      const res = await ApiClient.connectWhatsApp();
      if (res.success && res.data) {
        setConnectionState(res.data);
        addLog('WhatsApp Entegrasyonu', 'WhatsApp Web servisi başlatılıyor...');
      }
    } catch (err) {}
  };

  const handleDisconnect = async () => {
    try {
      const res = await ApiClient.disconnectWhatsApp();
      if (res.success && res.data) {
        setConnectionState(res.data);
        addLog('WhatsApp Entegrasyonu', 'WhatsApp Web bağlantısı kesildi.');
      }
    } catch (err) {}
  };

  const handleSendMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaPhone || !mediaMessage) return;
    setIsMediaSending(true);
    try {
      const res = await ApiClient.sendMediaWhatsApp({
        phone: mediaPhone,
        message: mediaMessage,
        mediaType: selectedMediaType
      });
      if (res.success) {
        alert(`✅ [${selectedMediaType}] Medya mesajı başarıyla sıraya alındı ve teslim edildi.`);
        addLog('WhatsApp Entegrasyonu', `Medya mesajı (${selectedMediaType}) başarıyla gönderildi: ${mediaPhone}`);
        refreshStatus();
      }
    } catch (err) {
      alert('Medya gönderimi başarısız oldu.');
    } finally {
      setIsMediaSending(false);
    }
  };

  const handleSelectAll = (val: boolean) => {
    setRecipients(prev => prev.map(r => ({ ...r, selected: val })));
  };

  const handleToggleRecipient = (id: string) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const handleTemplateChange = (text: string) => {
    setTemplates(prev => ({ ...prev, [selectedCategory]: text }));
  };

  const compileMessage = (template: string, recipient: Recipient) => {
    let msg = template;
    msg = msg.replace(/{VELI_ADI}/g, recipient.name);
    msg = msg.replace(/{OGRENCI_ADI}/g, recipient.studentName || 'Öğrenciniz');
    msg = msg.replace(/{SOFOR_ADI}/g, recipient.name);
    msg = msg.replace(/{AY}/g, 'Temmuz 2026');
    msg = msg.replace(/{TUTAR}/g, '2,800 ₺');
    msg = msg.replace(/{PLAKA}/g, '06 BKT 123');
    msg = msg.replace(/{SAAT}/g, '08:15');
    return msg;
  };

  const handleGenerateQueue = () => {
    const activeRecipients = recipients.filter(r => r.selected);
    if (activeRecipients.length === 0) {
      alert('⚠️ Lütfen en az bir alıcı seçin.');
      return;
    }

    const templateText = templates[selectedCategory];
    const queue = activeRecipients.map((rec) => {
      const textCompiled = compileMessage(templateText, rec);
      
      let formattedPhone = rec.phone;
      if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
        formattedPhone = `90${formattedPhone}`;
      } else if (!formattedPhone.startsWith('90') && formattedPhone.length === 11 && formattedPhone.startsWith('0')) {
        formattedPhone = `90${formattedPhone.substring(1)}`;
      }

      const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(textCompiled)}`;

      return {
        recipientId: rec.id,
        recipientName: rec.name,
        phone: rec.phone,
        message: textCompiled,
        url: whatsappUrl,
        sent: false,
        sending: false
      };
    });

    setActiveQueue(queue);
    addLog(
      'WhatsApp Entegrasyonu', 
      `Toplu WhatsApp mesaj listesi hazırlandı. Şablon: ${selectedCategory}, Toplam Alıcı: ${queue.length}`
    );
  };

  const handleMarkAsSent = (idx: number, name: string) => {
    setActiveQueue(prev => prev.map((q, i) => i === idx ? { ...q, sent: true } : q));
    addLog('WhatsApp Entegrasyonu', `WhatsApp mesajı gönderildi olarak işaretlendi: ${name}`);
  };

  const handleGatewaySend = async (idx: number, item: any) => {
    setSendingId(item.recipientId);
    addLog('WhatsApp Entegrasyonu', `Premium API Gateway üzerinden gönderiliyor: ${item.recipientName}`);
    
    const res = await ApiClient.sendWhatsAppMessage({
      recipientPhone: item.phone,
      message: item.message,
      recipientName: item.recipientName,
      templateName: selectedCategory
    });

    if (res.success) {
      setActiveQueue(prev => prev.map((q, i) => i === idx ? { ...q, sent: true } : q));
      addLog('WhatsApp Entegrasyonu', `Mesaj teslim edildi: ${item.recipientName}`);
    } else {
      alert('⚠️ API üzerinden gönderim hatası oluştu!');
    }
    setSendingId(null);
  };

  return (
    <div className="space-y-6" id="whatsapp-integration-workspace">
      
      {/* WHATSAPP HERO SECTION */}
      <div className="bg-emerald-900 text-emerald-50 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-emerald-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/10">
              BERKAYTUR WHATSAPP GATEWAY & AI COPILOT
            </span>
            <h3 className="text-lg font-black tracking-tight mt-1">Okul Servis WhatsApp Haberleşme Merkezi</h3>
            <p className="text-emerald-300 text-xs font-semibold">Tek hattan veya web simülasyonu üzerinden tüm veliler, şoförler ve araçlarla kesintisiz iletişim.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full border ${
            connectionState.status === 'CONNECTED' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : connectionState.status === 'QR_RECEIVED'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connectionState.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            {connectionState.status === 'CONNECTED' ? 'HAT AKTİF' : connectionState.status === 'QR_RECEIVED' ? 'TARAMA BEKLİYOR' : 'ÇEVRİMDIŞI'}
          </span>
          <button 
            onClick={refreshStatus} 
            disabled={isRefreshingStatus}
            className="p-1.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUB-TABS INTERACTION SELECTOR */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-4 pb-px">
        {[
          { id: 'bulk', label: 'Toplu Mesaj Gönderimi', icon: Users },
          { id: 'connection', label: 'Canlı Bağlantı & QR Kod', icon: QrCode },
          { id: 'media', label: 'Evrak & Medya Gönderimi', icon: Paperclip }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`pb-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === tab.id 
                  ? 'border-emerald-600 text-emerald-600 font-extrabold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}

      {/* 1. BULK MESSAGE TAB */}
      {activeSubTab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-8 space-y-6">
            {/* Section 1: Template Choices */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-4 h-4 text-emerald-600" /> Şablon Kütüphanesi
              </h4>
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-2xl border text-xs font-bold text-slate-600">
                {Object.keys(templates).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      selectedCategory === cat 
                        ? 'bg-emerald-600 text-white font-black shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Şablon Mesaj Gövdesi</label>
                <textarea
                  rows={4}
                  value={templates[selectedCategory]}
                  onChange={e => handleTemplateChange(e.target.value)}
                  className="w-full p-3 bg-slate-50 text-slate-700 text-xs font-semibold rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                />
                <div className="flex flex-wrap gap-1.5 text-[9px] font-bold text-slate-400 mt-1">
                  <span>Desteklenen Değişkenler:</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer">&#123;VELI_ADI&#125;</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer">&#123;OGRENCI_ADI&#125;</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer">&#123;SOFOR_ADI&#125;</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer">&#123;PLAKA&#125;</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer">&#123;AY&#125;</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer">&#123;TUTAR&#125;</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer">&#123;SAAT&#125;</span>
                </div>
              </div>
            </div>

            {/* Section 2: Recipient Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-4 h-4 text-emerald-600" /> Alıcı Listesi
                </h4>
                <div className="flex gap-2 text-[10px] font-black">
                  <button onClick={() => handleSelectAll(true)} className="text-blue-600 hover:underline cursor-pointer">Tümünü Seç</button>
                  <span className="text-slate-300">•</span>
                  <button onClick={() => handleSelectAll(false)} className="text-slate-500 hover:underline cursor-pointer">Tümünü Temizle</button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {recipients.map(rec => (
                  <div 
                    key={rec.id}
                    onClick={() => handleToggleRecipient(rec.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      rec.selected 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={rec.selected} 
                        onChange={() => {}} 
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600" 
                      />
                      <div>
                        <span className="text-slate-800">{rec.name}</span>
                        {rec.studentName && <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Öğrenci: {rec.studentName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[10px]">{rec.phone}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        rec.role === 'Veli' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>{rec.role}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleGenerateQueue}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Seçili Kişiler İçin Sıra Oluştur
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Dispatch Queue */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gönderim Modu</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 rounded-xl border text-xs font-bold text-slate-600">
                <button
                  onClick={() => setGatewayMode('gateway')}
                  className={`py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 ${
                    gatewayMode === 'gateway' ? 'bg-emerald-600 text-white font-black' : 'text-slate-500'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" /> Premium API
                </button>
                <button
                  onClick={() => setGatewayMode('web')}
                  className={`py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 ${
                    gatewayMode === 'web' ? 'bg-emerald-600 text-white font-black' : 'text-slate-500'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Web Manuel
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                🚀 GÖNDERİM SIRASI ({activeQueue.length})
              </h4>
              {activeQueue.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {activeQueue.map((item, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-2xl border text-xs font-bold space-y-2 ${
                          item.sent ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-emerald-100 bg-emerald-50/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-800 font-extrabold truncate max-w-[120px]">{item.recipientName}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{item.phone}</p>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${item.sent ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
                            {item.sent ? 'GÖNDERİLDİ' : 'BEKLİYOR'}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border text-[10px] text-slate-500 max-h-16 overflow-y-auto leading-normal">
                          {item.message}
                        </div>
                        <div className="flex gap-1.5">
                          {gatewayMode === 'gateway' ? (
                            <button
                              onClick={() => handleGatewaySend(idx, item)}
                              disabled={sendingId === item.recipientId || item.sent}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-lg text-center text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {sendingId === item.recipientId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              {item.sent ? 'İşlendi' : 'API İle Gönder'}
                            </button>
                          ) : (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => handleMarkAsSent(idx, item.recipientName)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-center text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" /> Şimdi Gönder
                            </a>
                          )}
                          {!item.sent && (
                            <button
                              onClick={() => handleMarkAsSent(idx, item.recipientName)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 border rounded-lg cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-3">
                  <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-black text-slate-500">Gönderim Sırası Boş</p>
                  <p className="text-[10px] text-slate-400">Sol taraftan şablon belirleyip kişileri sıraya ekleyin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CONNECTION AND QR TAB */}
      {activeSubTab === 'connection' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
          {/* QR representation & Connection control */}
          <div className="md:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center space-y-6">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 self-start w-full border-b pb-3">
              <QrCode className="w-4 h-4 text-emerald-600" /> WhatsApp Web Oturumu
            </h4>

            {connectionState.status === 'DISCONNECTED' && (
              <div className="py-12 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Bağlantı Kurulmadı</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Sunucu üzerinde WhatsApp Web oturumu henüz başlatılmadı.</p>
                </div>
                <button 
                  onClick={handleConnect}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  WhatsApp Web Oturumunu Başlat
                </button>
              </div>
            )}

            {connectionState.status === 'CONNECTING' && (
              <div className="py-16 text-center space-y-4">
                <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <div>
                  <p className="text-sm font-black text-slate-800">Sunucu Bağlanıyor...</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Tarayıcı ayağa kaldırılıyor ve el sıkışması yapılıyor.</p>
                </div>
              </div>
            )}

            {connectionState.status === 'QR_RECEIVED' && (
              <div className="text-center space-y-4 w-full">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-3xl inline-block shadow-inner relative overflow-hidden">
                  {/* Decorative Scan Matrix lines */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 animate-bounce opacity-80 z-10"></div>
                  
                  {/* Styled CSS QR Code Block */}
                  <div className="w-48 h-48 bg-slate-900 rounded-2xl flex flex-wrap p-3 relative border-4 border-slate-950">
                    <div className="absolute top-3 left-3 w-12 h-12 border-4 border-emerald-400 rounded-lg"></div>
                    <div className="absolute top-3 right-3 w-12 h-12 border-4 border-emerald-400 rounded-lg"></div>
                    <div className="absolute bottom-3 left-3 w-12 h-12 border-4 border-emerald-400 rounded-lg"></div>
                    <div className="w-full h-full flex items-center justify-center text-center text-slate-400 font-mono text-[9px] font-black break-all px-2 leading-tight">
                      {connectionState.qrCode || 'BERKAYTUR_SECURE'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-black text-slate-800">QR Kodu Tarama Ekranı</p>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Telefonunuzdan WhatsApp {'>'} Bağlı Cihazlar {'>'} Cihaz Bağla bölümünden bu kodu taratın.
                  </p>
                </div>
              </div>
            )}

            {connectionState.status === 'CONNECTED' && (
              <div className="py-8 text-center space-y-5 w-full">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border-2 border-emerald-200">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div>
                  <span className="bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full text-[9px]">OTURUM AKTİF</span>
                  <p className="text-sm font-black text-slate-800 mt-2">WhatsApp Web Bağlandı</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Aktif Telefon Hattı: <span className="font-mono text-slate-700 font-extrabold">+{connectionState.phoneNumber}</span></p>
                </div>
                
                <div className="pt-2 border-t w-full">
                  <button 
                    onClick={handleDisconnect}
                    className="px-6 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Bağlantıyı Kes / Güvenli Çıkış
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Connection Logs */}
          <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Terminal className="w-4 h-4 text-emerald-600" /> Ağ & Entegrasyon Günlüğü (Gateway Logs)
            </h4>

            <div className="flex-1 bg-slate-950 rounded-2xl p-4 font-mono text-[10px] text-slate-300 overflow-y-auto max-h-[380px] space-y-1.5 shadow-inner">
              {connectionState.logs && connectionState.logs.map((log: string, i: number) => (
                <div key={i} className="leading-relaxed border-b border-slate-900/40 pb-1.5 last:border-0">
                  <span className="text-emerald-500">➜</span> {log}
                </div>
              ))}
              {(!connectionState.logs || connectionState.logs.length === 0) && (
                <p className="text-slate-500 italic">Kayıt bulunmuyor.</p>
              )}
            </div>
            
            <p className="text-[10px] text-slate-400 leading-normal font-semibold">
              * Bu ekran, arka planda çalışan WhatsApp Web Puppeteer ve Nginx Gateway kanallarından gelen canlı socket loglarını yansıtır. Herhangi bir bağlantı kopması durumunda sunucu 10 saniye içinde otomatik olarak yeniden bağlanmayı dener (Auto-reconnection loop).
            </p>
          </div>
        </div>
      )}

      {/* 4. MULTIMEDIA DISPATCH TAB */}
      {activeSubTab === 'media' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
          {/* Media Sender form */}
          <div className="md:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Paperclip className="w-4 h-4 text-emerald-600" /> Evrak & Multimedya Gönderim Formu
            </h4>

            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Özel yasal dökümanları, PDF sözleşme eklerini, harita konum koordinatlarını, anlık ses kayıtlarını veya resimli e-arşiv makbuzlarını WhatsApp üzerinden göndermek için tipi seçip içeriği oluşturun.
            </p>

            <form onSubmit={handleSendMedia} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gönderilecek Belge / Medya Türü</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'PDF', label: 'PDF', icon: FileText },
                    { id: 'IMAGE', label: 'Resim', icon: ImageIcon },
                    { id: 'LOCATION', label: 'Konum', icon: MapPin },
                    { id: 'AUDIO', label: 'Ses', icon: Volume2 },
                    { id: 'FILE', label: 'Dosya', icon: HardDrive }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedMediaType(item.id as any)}
                        className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          selectedMediaType === item.id 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-black' 
                            : 'border-slate-200 hover:border-slate-300 text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-black mt-0.5">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Alıcı Telefon Numarası</label>
                <input 
                  type="text" 
                  value={mediaPhone} 
                  onChange={e => setMediaPhone(e.target.value)} 
                  className="w-full p-2.5 bg-slate-50 border rounded-lg font-mono" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Açıklama / Mesaj Altyazısı (Caption)</label>
                <textarea 
                  rows={4}
                  value={mediaMessage} 
                  onChange={e => setMediaMessage(e.target.value)} 
                  className="w-full p-3 bg-slate-50 border rounded-2xl leading-relaxed" 
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isMediaSending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl font-black cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10"
              >
                {isMediaSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Seçili Dosyayı & Metni Gönder
              </button>
            </form>
          </div>

          {/* Informational display */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
                📂 Entegrasyon Altyapı Bilgileri
              </h4>

              <div className="space-y-3 text-xs leading-relaxed text-slate-600 font-semibold">
                <p>
                  Sistem, **whatsapp-web.js** ile gönderilen tüm dökümanları ve medya dosyalarını otomatik olarak Google Drive arşiv kütüphanesine yükler ve buradan paylaşımlı public linkler oluşturarak her mesajın altına ekler.
                </p>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[9px] text-blue-600 font-black uppercase">MEDYA İŞLEME SÜREÇLERİ</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                    <li>**PDF Sözleşmeler:** Mukavele onaylandığı an otomatik üretilir ve Drive API ile taranıp iletilir.</li>
                    <li>**Resimli Makbuzlar:** Muhasebe tahsilat fişleri anında görsel JPG formatına dönüştürülüp gönderilir.</li>
                    <li>**Canlı Konum:** Şoförlerin anlık mobil koordinatları, `waze://` veya `google-maps` koordinat linklerine çevrilir.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-emerald-950/10 border border-emerald-950/5 p-4 rounded-2xl text-[10px] leading-relaxed text-slate-500 font-semibold mt-4">
              🛡️ **Bilgi Güvenliği Standartları:** WhatsApp üzerinden giden tüm ekler uçtan uca şifreli (End-to-End Encrypted) protokoller ile taşınır.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
