/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { Student, Payment } from '../../../types';
import { 
  Search, CreditCard, DollarSign, ArrowRight, Check, 
  Printer, Share2, Send, Download, RefreshCw, Landmark,
  Smartphone, ShieldAlert, CheckCircle, FileCheck
} from 'lucide-react';

interface TahsilatlarProps {
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function Tahsilatlar({ onAddNotification }: TahsilatlarProps) {
  const { 
    students, schools, payments, addPayment, recordPayment, addLog, currentUser 
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentPhone, setSelectedParentPhone] = useState<string | null>(null);
  
  // Payment Collection Modal / Form State
  const [showCollectForm, setShowCollectForm] = useState(false);
  const [collectType, setCollectType] = useState<'Nakit' | 'POS' | 'Kredi Kartı' | 'Havale' | 'EFT' | 'Diğer'>('Nakit');
  const [collectAmount, setCollectAmount] = useState('');
  const [collectDesc, setCollectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Receipt / Makbuz Overlay State
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [driveSaving, setDriveSaving] = useState(false);
  const [sheetsSyncing, setSheetsSyncing] = useState(false);

  // Derive list of parents from students list
  const parentsList = React.useMemo(() => {
    const map = new Map<string, {
      parentName: string;
      parentPhone: string;
      students: Student[];
      totalDebt: number;
      totalPaid: number;
      remainingDebt: number;
      overdueDebt: number;
    }>();

    students.forEach(st => {
      const key = st.parentPhone.trim();
      const stPayments = payments.filter(p => p.studentId === st.id);
      
      // Assume a standard annual fee of 24,000 ₺ per student
      const annualFee = 24000;
      const paid = stPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const overdue = stPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.students.push(st);
        existing.totalDebt += annualFee;
        existing.totalPaid += paid;
        existing.remainingDebt = existing.totalDebt - existing.totalPaid;
        existing.overdueDebt += overdue;
      } else {
        map.set(key, {
          parentName: st.parentName,
          parentPhone: st.parentPhone,
          students: [st],
          totalDebt: annualFee,
          totalPaid: paid,
          remainingDebt: annualFee - paid,
          overdueDebt: overdue,
        });
      }
    });

    return Array.from(map.values());
  }, [students, payments]);

  // Filter parents based on search terms
  const filteredParents = parentsList.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesParentName = p.parentName.toLowerCase().includes(term);
    const matchesPhone = p.parentPhone.includes(term);
    const matchesStudent = p.students.some(s => s.name.toLowerCase().includes(term));
    const matchesSchool = p.students.some(s => s.schoolName.toLowerCase().includes(term));
    
    return matchesParentName || matchesPhone || matchesStudent || matchesSchool;
  });

  const selectedParent = parentsList.find(p => p.parentPhone === selectedParentPhone);

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent || !collectAmount) return;

    const amount = parseFloat(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Lütfen geçerli bir tutar giriniz!');
      return;
    }

    setIsSubmitting(true);

    // Simulate network processing
    setTimeout(() => {
      // Find a pending/overdue payment for this parent's students to mark as paid, or add a new record
      const student = selectedParent.students[0]; // Apply to first student by default
      const pendingPayment = payments.find(p => p.studentId === student.id && p.status !== 'paid');

      if (pendingPayment) {
        recordPayment(pendingPayment.id, amount);
      } else {
        // Create new collection transaction
        addPayment({
          studentId: student.id,
          studentName: student.name,
          parentName: selectedParent.parentName,
          amount: amount,
          dueDate: new Date().toISOString().split('T')[0],
          category: 'Tahsilat',
          description: `${collectType} Tahsilat: ${collectDesc || 'Servis Hizmet Bedeli'}`
        });

        // Auto-approve newly created payment
        const updatedPayments = useAppStore.getState().payments;
        const newlyCreated = updatedPayments[updatedPayments.length - 1];
        if (newlyCreated && newlyCreated.status !== 'paid') {
          recordPayment(newlyCreated.id, amount);
        }
      }

      // Generate receipt number
      const receiptNo = `MAK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date().toLocaleDateString('tr-TR');

      const receipt = {
        receiptNo,
        date: dateStr,
        time: timeStr,
        company: 'Berkaytur Hizmet İşletmeleri A.Ş.',
        parentName: selectedParent.parentName,
        studentName: student.name,
        schoolName: student.schoolName,
        type: collectType,
        amount,
        description: collectDesc || 'Aylık Okul Servisi Taşıma Bedeli',
        personnel: currentUser?.name || 'Ayhan Sayman'
      };

      // Add log
      addLog(
        'Tahsilat Yapıldı', 
        `${selectedParent.parentName} velisinden ${amount.toLocaleString('tr-TR')} ₺ tutarında ${collectType} tahsilatı yapıldı. Makbuz: ${receiptNo}`
      );

      // Add notification to school responsibles
      onAddNotification(
        'Yeni Tahsilat Kaydı',
        `${student.schoolName} öğrencisi ${student.name} için ${amount.toLocaleString('tr-TR')} ₺ ödeme alındı.`,
        'success'
      );

      setActiveReceipt(receipt);
      setShowCollectForm(false);
      setCollectAmount('');
      setCollectDesc('');
      setIsSubmitting(false);
    }, 800);
  };

  const handleSaveToDrive = () => {
    if (!activeReceipt) return;
    setDriveSaving(true);
    setTimeout(() => {
      setDriveSaving(false);
      alert(`Makbuz (${activeReceipt.receiptNo}) Google Drive klasöründeki "/${activeReceipt.schoolName}/${activeReceipt.studentName}/Makbuzlar/" dizinine başarıyla PDF olarak kaydedildi.`);
      addLog('Google Drive Aktarımı', `${activeReceipt.receiptNo} nolu makbuz Google Drive'a yüklendi.`);
    }, 1500);
  };

  const handleSyncSheets = () => {
    if (!activeReceipt) return;
    setSheetsSyncing(true);
    setTimeout(() => {
      setSheetsSyncing(false);
      alert(`Tahsilat kaydı anlık olarak Google Sheets dosyasına yeni satır olarak eklendi.`);
      addLog('Google Sheets Senkronizasyonu', `${activeReceipt.receiptNo} tahsilat hareketi Google E-Tabloya işlendi.`);
    }, 1200);
  };

  const handleShareWhatsApp = () => {
    if (!activeReceipt) return;
    const text = `Sayın *${activeReceipt.parentName}*, ${activeReceipt.studentName} isimli öğrencimizin okul servis bedeli için *${activeReceipt.amount.toLocaleString('tr-TR')} ₺* tutarındaki ödemeniz *${activeReceipt.type}* olarak alınmıştır. Makbuz No: *${activeReceipt.receiptNo}*. Teşekkür ederiz. - Berkaytur`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareMail = () => {
    if (!activeReceipt) return;
    const subject = `Berkaytur Servis Tahsilat Makbuzu - ${activeReceipt.receiptNo}`;
    const body = `Sayın ${activeReceipt.parentName},\n\n${activeReceipt.studentName} adlı öğrencimizin servis ücretine mahsuben ${activeReceipt.amount.toLocaleString('tr-TR')} ₺ tutarındaki ödemeniz ${activeReceipt.type} ile tahsil edilmiş ve onaylanmıştır.\n\nMakbuz Detayları:\nMakbuz No: ${activeReceipt.receiptNo}\nTarih: ${activeReceipt.date} ${activeReceipt.time}\n\nİyi günler dileriz.\nBerkaytur A.Ş.`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Veli Tahsilat & Alacak Yönetimi</h2>
          <p className="text-slate-500 text-xs font-semibold">Velilerden ödeme alma, borç sorgulama ve anlık makbuz süreçleri.</p>
        </div>
      </div>

      {/* Main Grid: Search on left, Details/Action on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Parent Search Engine */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-100/50 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Veli Hızlı Arama</label>
            <div className="relative">
              <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none w-5 h-5 my-auto" />
              <input
                type="text"
                placeholder="Veli, Öğrenci, Telefon veya Okul ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {filteredParents.map(parent => {
              const isSelected = selectedParentPhone === parent.parentPhone;
              return (
                <button
                  key={parent.parentPhone}
                  onClick={() => {
                    setSelectedParentPhone(parent.parentPhone);
                    setShowCollectForm(false);
                  }}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {parent.parentName}
                    </p>
                    <p className={`text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      📞 {parent.parentPhone}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parent.students.map(s => (
                        <span 
                          key={s.id} 
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-blue-500/50 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {s.name} ({s.classLevel})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <div className="space-y-0.5">
                      <p className={`text-xs font-mono font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {parent.remainingDebt.toLocaleString('tr-TR')} ₺
                      </p>
                      {parent.overdueDebt > 0 && (
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'
                        }`}>
                          Gecikmiş
                        </span>
                      )}
                    </div>
                    <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`} />
                  </div>
                </button>
              );
            })}

            {filteredParents.length === 0 && (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <p className="text-xs font-semibold">Veli bulunamadı.</p>
                <p className="text-[10px] opacity-70">Arama kriterini değiştirmeyi deneyin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Parent Financial Detail & Collect Actions */}
        <div className="lg:col-span-7 space-y-6">
          {selectedParent ? (
            <div className="space-y-6">
              
              {/* Financial Balance Summary Dashboard */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      Veli Cari Kartı
                    </span>
                    <h3 className="text-lg font-black text-slate-800 mt-1.5">{selectedParent.parentName}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedParent.students.length} Kayıtlı Öğrenci</p>
                  </div>

                  {!showCollectForm && (
                    <button
                      onClick={() => setShowCollectForm(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-emerald-100 flex items-center gap-2 cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4" /> Tahsilat Yap
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Yıllık Toplam</span>
                    <p className="text-base font-mono font-black text-slate-800">
                      {selectedParent.totalDebt.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-1">
                    <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Toplam Ödenen</span>
                    <p className="text-base font-mono font-black text-emerald-700">
                      {selectedParent.totalPaid.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1">
                    <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block">Kalan Borç</span>
                    <p className="text-base font-mono font-black text-blue-700">
                      {selectedParent.remainingDebt.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                  <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-1">
                    <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-wider block">Geciken Tutar</span>
                    <p className="text-base font-mono font-black text-rose-700">
                      {selectedParent.overdueDebt.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                </div>
              </div>

              {/* Form: Collect Money */}
              {showCollectForm && (
                <form onSubmit={handleCollectSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Tahsilat Ödeme Girişi
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowCollectForm(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Kapat
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-400 uppercase block">Tahsilat Türü</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Nakit', 'POS', 'Kredi Kartı', 'Havale', 'EFT', 'Diğer'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setCollectType(type)}
                            className={`py-2 text-[10px] font-extrabold rounded-xl border text-center transition-all cursor-pointer ${
                              collectType === type 
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-black shadow-xs' 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-400 uppercase block">Tahsil Edilen Tutar (₺)</label>
                        <input
                          type="number"
                          required
                          placeholder="Örn: 2400"
                          value={collectAmount}
                          onChange={e => setCollectAmount(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono focus:outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-400 uppercase block">Açıklama</label>
                        <input
                          type="text"
                          placeholder="Temmuz Dönemi Servis Aidatı"
                          value={collectDesc}
                          onChange={e => setCollectDesc(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-emerald-50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCollectForm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-100 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Kaydediliyor...' : 'Ödemeyi Tamamla ve Makbuz Üret'}
                    </button>
                  </div>
                </form>
              )}

              {/* Invoices List for Selected Parent */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-100/50 space-y-4">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Son Ödemeler ve Faturalar</h4>
                <div className="divide-y divide-slate-100">
                  {payments
                    .filter(p => selectedParent.students.some(s => s.id === p.studentId))
                    .map(pay => (
                      <div key={pay.id} className="py-3.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{pay.studentName}</p>
                          <p className="text-[10px] text-slate-400">{pay.description} • Vade: {pay.dueDate}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-slate-800">
                            {pay.amount.toLocaleString('tr-TR')} ₺
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            pay.status === 'paid' 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : pay.status === 'pending' 
                                ? 'bg-amber-50 text-amber-600' 
                                : 'bg-rose-50 text-rose-600'
                          }`}>
                            {pay.status === 'paid' ? 'ÖDENDİ' : pay.status === 'pending' ? 'BEKLEYEN' : 'GECİKEN'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-10 shadow-xl shadow-slate-100/50 text-center text-slate-400 py-24 space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-lg">
                👤
              </div>
              <h4 className="text-sm font-black text-slate-700">Veli Seçilmedi</h4>
              <p className="text-xs max-w-xs mx-auto">Sol menüdeki veli listesinden arama yapıp bir veli seçerek alacak bilgilerine ve tahsilat ekranına erişebilirsiniz.</p>
            </div>
          )}
        </div>

      </div>

      {/* Makbuz (Receipt) Modal View Overlay */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-8 space-y-6 animate-scale-up relative">
            
            {/* Stamp logo background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
              <div className="w-72 h-72 rounded-full border-8 border-blue-600 flex items-center justify-center text-blue-600 text-9xl font-black rotate-12">
                BKT
              </div>
            </div>

            {/* Receipt Header */}
            <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-5">
              <div className="space-y-1">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md">
                  B
                </div>
                <h3 className="font-extrabold text-xs text-slate-800 tracking-wide uppercase mt-2">
                  {activeReceipt.company}
                </h3>
                <p className="text-[9px] text-slate-400">Yenimahalle Genel Merkez, Ankara</p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle className="w-3 h-3" /> TAHSİLAT MAKBUZU
                </span>
                <p className="text-[10px] font-mono text-slate-400">No: <span className="text-slate-800 font-extrabold">{activeReceipt.receiptNo}</span></p>
                <p className="text-[9px] text-slate-400">{activeReceipt.date} • {activeReceipt.time}</p>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Ödemeyi Yapan Veli</span>
                  <p className="font-bold text-slate-800">{activeReceipt.parentName}</p>
                </div>
                <div className="space-y-1 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Öğrenci & Okul</span>
                  <p className="font-bold text-slate-800">{activeReceipt.studentName}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{activeReceipt.schoolName}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-black tracking-wider">
                  <span>Ödeme Detayı / Açıklama</span>
                  <span>Tahsilat Türü</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold border-b border-slate-800 pb-2">
                  <span>{activeReceipt.description}</span>
                  <span className="bg-blue-600 px-2 py-0.5 rounded text-[10px]">{activeReceipt.type}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">Tahsil Edilen Toplam Tutar</span>
                  <span className="text-xl font-black text-emerald-400">{activeReceipt.amount.toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold italic">
                <span>* Bu makbuz elektronik olarak üretilmiştir ve mali geçerliliği bulunmaktadır.</span>
                <span>Vezne: {activeReceipt.personnel}</span>
              </div>
            </div>

            {/* Action Triggers for Workspace, WhatsApp and Printing */}
            <div className="border-t border-dashed border-slate-200 pt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSaveToDrive}
                  disabled={driveSaving}
                  className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-200/50"
                >
                  <Download className={`w-4 h-4 ${driveSaving ? 'animate-spin' : ''}`} />
                  {driveSaving ? 'Drive\'a Kaydediliyor...' : 'Google Drive\'a Yedekle'}
                </button>
                <button
                  onClick={handleSyncSheets}
                  disabled={sheetsSyncing}
                  className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-200/50"
                >
                  <RefreshCw className={`w-4 h-4 ${sheetsSyncing ? 'animate-spin' : ''}`} />
                  {sheetsSyncing ? 'Senkronize Ediliyor...' : 'Google Sheets\'e İşle'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" /> WhatsApp'tan Gönder
                </button>
                <button
                  onClick={handleShareMail}
                  className="py-2 bg-slate-800 hover:bg-slate-900 text-slate-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> E-Posta Gönder
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Yazdır / PDF İndir
                </button>
              </div>

              <button
                onClick={() => setActiveReceipt(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all block text-center cursor-pointer"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
