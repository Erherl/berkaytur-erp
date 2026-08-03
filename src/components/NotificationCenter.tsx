/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Bell, FileText, DollarSign, Calendar, AlertTriangle, 
  Check, ShieldAlert, Award, Star, Settings, ExternalLink, X, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterProps {
  onTabNavigate?: (tabId: string) => void;
  userRole?: string;
}

export default function NotificationCenter({ onTabNavigate, userRole }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'application' | 'payment' | 'document' | 'defect' | 'accrual'>('all');

  // Dynamic notification state to support live "Onaylama" or actions
  const [applications, setApplications] = useState([
    { id: 'app_1', student: 'Arda Kaya', school: 'Atatürk Anadolu Lisesi', time: '09:30', km: '4.2 KM', status: 'Onay Bekliyor' },
    { id: 'app_2', student: 'Zeynep Yıldız', school: 'Cumhuriyet İlkokulu', time: '11:15', km: '2.8 KM', status: 'Onay Bekliyor' },
  ]);

  const [accruals, setAccruals] = useState([
    { id: 'accr_1', recipient: 'Sürücü Ahmet Yılmaz', amount: '15,000 ₺', type: 'Şoför Hakediş', status: 'Onay Bekliyor', period: 'Temmuz 2026' },
    { id: 'accr_2', recipient: 'Tedarikçi BERKAYTUR Grubu', amount: '45,200 ₺', type: 'Tedarikçi Hakediş', status: 'Onay Bekliyor', period: 'Temmuz 2026' },
  ]);

  const [payments, setPayments] = useState([
    { id: 'over_1', parent: 'Murat Öz', student: 'Can Öz', amount: '2,800 ₺', delayDays: 30 },
    { id: 'over_2', parent: 'Mehmet Kaplan', student: 'Zehra Kaplan', amount: '3,000 ₺', delayDays: 12 },
  ]);

  // Today's collections
  const collections = [
    { id: 'coll_1', parent: 'Kamil Yılmaz', student: 'Ali Yılmaz', type: 'Kredi Kartı', amount: '2,400 ₺', personnel: 'Ayhan Sayman', time: '14:20' },
    { id: 'coll_2', parent: 'Murat Öz', student: 'Can Öz', type: 'EFT/Havale', amount: '2,800 ₺', personnel: 'Canan Kaya', time: '10:05' },
  ];

  // Document Expirations
  const expiringDocs = [
    { id: 'doc_exp_1', docName: 'Ahmet Yılmaz - SRC Belgesi', remainingDays: 3, type: 'SRC' },
    { id: 'doc_exp_2', docName: '06 BKT 123 - Muayene Raporu', remainingDays: 7, type: 'Muayene' },
    { id: 'doc_exp_3', docName: 'Ayşe Yıldız - Psikoteknik Raporu', remainingDays: 15, type: 'Psikoteknik' },
  ];

  // Inspection Logs (Sabah Denetimleri)
  const inspections = [
    { id: 'insp_1', vehicle: '06 BKT 123', status: 'Eksik Var', details: 'İlk yardım çantası eksik', date: 'Bugün 07:45' },
    { id: 'insp_2', vehicle: '06 BKT 456', status: 'Sorunsuz', details: 'Denetim başarılı', date: 'Bugün 08:00' },
  ];

  // Satisfaction Feedback
  const satisfactions = [
    { id: 'sat_1', target: '06 BKT 123 Sürücüsü (Ahmet Y.)', rating: 2, feedback: 'Hızlı sürüş şikayeti', parent: 'Kamil Yılmaz' },
    { id: 'sat_2', target: 'Yenimahalle Hostesi (Ayşe Y.)', rating: 1, feedback: 'Öğrenciyi durakta unutma', parent: 'Aysel Yıldız' },
  ];

  // Vehicle Failures (Araç Arızaları)
  const [failures, setFailures] = useState([
    { id: 'fail_1', driver: 'Ahmet Yılmaz', type: 'Motor', plate: '06 BKT 123', details: 'Motor arıza lambası yanıyor', status: 'Gecikme Var' },
    { id: 'fail_2', driver: 'Mehmet Koç', type: 'Lastik', plate: '06 BKT 789', details: 'Sol ön lastik basıncı düşük', status: 'Giderildi' },
  ]);

  // School events
  const events = [
    { id: 'evt_1', title: 'Anıtkabir Kültür Gezisi', school: 'Cumhuriyet İlkokulu', date: 'Bugün 10:00', vehicles: '3 Araç' },
    { id: 'evt_2', title: 'Tiyatro Gösterimi Etkinliği', school: 'Atatürk Anadolu Lisesi', date: 'Yarın 13:30', vehicles: '2 Araç' },
  ];

  const approveAccrual = (id: string) => {
    setAccruals(accruals.map(a => a.id === id ? { ...a, status: 'Onaylandı' } : a));
  };

  const approveApplication = (id: string) => {
    setApplications(applications.map(a => a.id === id ? { ...a, status: 'Onaylandı' } : a));
  };

  const activeApplications = applications.filter(a => a.status === 'Onay Bekliyor');
  const activeAccruals = accruals.filter(a => a.status === 'Onay Bekliyor');

  // Badge count calculation
  const totalCount = 
    activeApplications.length + 
    activeAccruals.length + 
    payments.length + 
    expiringDocs.filter(d => d.remainingDays <= 7).length +
    failures.filter(f => f.status !== 'Giderildi').length;

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 text-slate-600 transition-all cursor-pointer"
        title="Bildirim Merkezi"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center animate-bounce shadow-md">
            {totalCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-outside backdrop */}
            <div 
              className="fixed inset-0 z-100" 
              onClick={() => setIsOpen(false)} 
            />

            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="absolute right-0 mt-3 w-96 max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-xl z-200 flex flex-col overflow-hidden max-h-[550px]"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" /> Bildirim Kontrol Merkezi
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Anlık operasyon ve mali onay akışları</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categorization Tabs */}
              <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-none">
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'application', label: 'Başvuru' },
                  { id: 'payment', label: 'Ödeme' },
                  { id: 'document', label: 'Evrak' },
                  { id: 'defect', label: 'Arıza/Kaza' },
                  { id: 'accrual', label: 'Hakediş' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeFilter === filter.id 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Notifications list */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-3 max-h-[380px]">
                
                {/* CATEGORY: BUGÜNKÜ BAŞVURULAR */}
                {(activeFilter === 'all' || activeFilter === 'application') && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Veli Kayıt Başvuruları</h4>
                    {applications.map(app => (
                      <div key={app.id} className="p-3 bg-blue-50/50 border border-blue-100/60 rounded-2xl flex flex-col gap-2 transition-all hover:bg-blue-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{app.student}</p>
                            <p className="text-[10px] text-slate-500">{app.school} • {app.km}</p>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">{app.time}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          {app.status === 'Onaylandı' ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Onaylandı
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  approveApplication(app.id);
                                  if (onTabNavigate) onTabNavigate('parents');
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                              >
                                Başvuruyu Onayla
                              </button>
                              <button
                                onClick={() => {
                                  setIsOpen(false);
                                  if (onTabNavigate) onTabNavigate('parents');
                                }}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                              >
                                Detay <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CATEGORY: TAHSİLAT BİLDİRİMLERİ */}
                {(activeFilter === 'all' || activeFilter === 'payment') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Bugünkü Tahsilatlar</h4>
                    {collections.map(coll => (
                      <div key={coll.id} className="p-3 bg-emerald-50/40 border border-emerald-100/60 rounded-2xl flex flex-col gap-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-slate-800 text-xs">Veli: {coll.parent}</p>
                            <p className="text-[10px] text-slate-500">Öğrenci: {coll.student} • {coll.type}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-700">{coll.amount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium pt-1 border-t border-emerald-100/20">
                          <span>Kasa: {coll.personnel}</span>
                          <span>{coll.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CATEGORY: GECİKEN ÖDEMELER */}
                {(activeFilter === 'all' || activeFilter === 'payment') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest pl-1">Geciken Ödemeler (Gecikmiş)</h4>
                    {payments.map(pay => (
                      <div 
                        key={pay.id} 
                        className="p-3 bg-rose-50/60 border border-rose-100/80 rounded-2xl flex items-center justify-between hover:bg-rose-50 cursor-pointer"
                        onClick={() => {
                          setIsOpen(false);
                          if (onTabNavigate) onTabNavigate('accounting');
                        }}
                      >
                        <div>
                          <p className="font-bold text-rose-800 text-xs">{pay.parent}</p>
                          <p className="text-[10px] text-rose-500">Öğrenci: {pay.student} • {pay.delayDays} gündür gecikmiş</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs font-bold text-rose-700">{pay.amount}</p>
                          <span className="text-[8px] font-extrabold text-rose-600 bg-rose-100/50 px-1 py-0.5 rounded tracking-wider uppercase">Gecikmiş</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CATEGORY: YAKLAŞAN EVRAKLAR */}
                {(activeFilter === 'all' || activeFilter === 'document') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Süresi Dolan Belgeler</h4>
                    {expiringDocs.map(doc => {
                      const colorClass = doc.remainingDays <= 3 
                        ? 'bg-rose-50 border-rose-100 text-rose-800' 
                        : doc.remainingDays <= 7 
                          ? 'bg-amber-50 border-amber-100 text-amber-800' 
                          : 'bg-slate-50 border-slate-100 text-slate-700';

                      return (
                        <div 
                          key={doc.id} 
                          className={`p-3 border rounded-2xl flex items-center justify-between ${colorClass} cursor-pointer`}
                          onClick={() => {
                            setIsOpen(false);
                            if (onTabNavigate) onTabNavigate('documents');
                          }}
                        >
                          <div>
                            <p className="font-bold text-xs">{doc.docName}</p>
                            <p className="text-[10px] opacity-80">Evrak Kategorisi: {doc.type}</p>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-white/80 border shadow-xs whitespace-nowrap">
                            Son {doc.remainingDays} Gün
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* CATEGORY: DENETİM BİLDİRİMLERİ */}
                {(activeFilter === 'all' || activeFilter === 'document') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Sabah Araç Denetimleri</h4>
                    {inspections.map(insp => (
                      <div key={insp.id} className={`p-3 border rounded-2xl flex flex-col gap-1 ${
                        insp.status === 'Eksik Var' ? 'bg-rose-50/40 border-rose-100' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-slate-800">{insp.vehicle}</p>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            insp.status === 'Eksik Var' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>{insp.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">{insp.details}</p>
                        <span className="text-[8px] font-bold text-slate-400 self-end mt-1">{insp.date}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CATEGORY: MEMNUNİYET GERİ BİLDİRİMLERİ */}
                {(activeFilter === 'all' || activeFilter === 'document') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Veli Memnuniyet Şikayetleri</h4>
                    {satisfactions.map(sat => (
                      <div key={sat.id} className="p-3 bg-amber-50/40 border border-amber-100/60 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-slate-800">{sat.target}</p>
                          <div className="flex gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < sat.rating ? 'fill-current' : 'text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-600 italic">"{sat.feedback}"</p>
                        <p className="text-[9px] text-slate-400">Bildiren: {sat.parent}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* CATEGORY: ARAÇ ARIZALARI */}
                {(activeFilter === 'all' || activeFilter === 'defect') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Şoför Arıza / Kaza Bildirimleri</h4>
                    {failures.map(fail => (
                      <div key={fail.id} className={`p-3 border rounded-2xl flex flex-col gap-1.5 ${
                        fail.status === 'Gecikme Var' ? 'bg-rose-50 border-rose-100/80 text-rose-900' : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-xs">{fail.plate} ({fail.driver})</p>
                            <p className="text-[10px] opacity-90">Arıza Türü: {fail.type}</p>
                          </div>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            fail.status === 'Gecikme Var' ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}>{fail.status}</span>
                        </div>
                        <p className="text-[10px] italic">"{fail.details}"</p>
                        {fail.status !== 'Giderildi' && (
                          <button
                            onClick={() => setFailures(failures.map(f => f.id === fail.id ? { ...f, status: 'Giderildi' } : f))}
                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[9px] font-bold rounded-lg self-end cursor-pointer"
                          >
                            Arızayı Çözüldü Olarak İşaretle
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* CATEGORY: HAKEDİŞ ONAYLARI */}
                {(activeFilter === 'all' || activeFilter === 'accrual') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Muhasebe Hakediş Onayları</h4>
                    {accruals.map(acc => (
                      <div key={acc.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{acc.recipient}</p>
                            <p className="text-[10px] text-slate-500">{acc.type} • {acc.period}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-900">{acc.amount}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {acc.status === 'Onaylandı' ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ödeme Onaylandı
                            </span>
                          ) : (
                            <button
                              id={`approve-accrual-btn-${acc.id}`}
                              onClick={() => approveAccrual(acc.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Hakedişi Öde
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CATEGORY: ETKİNLİKLER */}
                {(activeFilter === 'all') && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Bugünkü & Yaklaşan Etkinlikler</h4>
                    {events.map(evt => (
                      <div key={evt.id} className="p-3 bg-purple-50/40 border border-purple-100/60 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{evt.title}</p>
                          <p className="text-[10px] text-slate-500">{evt.school} • Refakatçi: {evt.vehicles}</p>
                        </div>
                        <span className="text-[9px] font-extrabold text-purple-700 bg-purple-100/50 px-1.5 py-0.5 rounded whitespace-nowrap">{evt.date}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* View all button */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onTabNavigate) onTabNavigate('notifications');
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Tüm Bildirim Günlüklerini Aç
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
