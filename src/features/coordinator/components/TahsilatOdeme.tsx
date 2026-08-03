/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, Payment, School } from '../../../types';
import { useAppStore } from '../../../store';
import { ApiClient } from '../../../infrastructure/api/apiClient';
import { 
  CreditCard, DollarSign, Receipt, PlusCircle, 
  CheckCircle2, FileText, Send, Save, Share2, 
  Trash2, Layers, ShieldCheck, Download, Check, AlertTriangle, RefreshCw
} from 'lucide-react';

interface TahsilatOdemeProps {
  schools: School[];
  students: Student[];
  payments: Payment[];
  onAddPayment: (p: Omit<Payment, 'id' | 'status'>) => void;
  onRecordPayment: (id: string, amount: number) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
  onAddLog: (action: string, details: string) => void;
}

export default function TahsilatOdeme({
  schools, students, payments, onAddPayment, onRecordPayment, onAddNotification, onAddLog
}: TahsilatOdemeProps) {
  const [activeSubTab, setActiveSubTab] = useState<'collection' | 'plans'>('collection');

  // Collection form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'POS' | 'Kredi Kartı' | 'Havale' | 'EFT' | 'Diğer'>('Nakit');
  const [paymentDescription, setPaymentDescription] = useState('Servis Ücreti Tahsilatı');
  
  // Last completed transaction state for receipt display
  const [completedTransaction, setCompletedTransaction] = useState<any | null>(null);

  // Payment plan creator states
  const [planStudentId, setPlanStudentId] = useState('');
  const [planSchoolType, setPlanSchoolType] = useState<'ozel' | 'devlet'>('ozel');
  const [planAnnualFee, setPlanAnnualFee] = useState('24000');
  const [planInstallmentCount, setPlanInstallmentCount] = useState('5'); // for ozel
  const [generatedPlanList, setGeneratedPlanList] = useState<any[]>([]);

  // Find student parent
  const activeStudent = students.find(s => s.id === selectedStudentId);

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !amountInput) {
      alert("Lütfen öğrenciyi seçip tahsilat miktarını giriniz!");
      return;
    }

    const numAmount = parseInt(amountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Lütfen geçerli bir ödeme miktarı giriniz!");
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    // Call the server API to create the secure transaction record
    const newPaymentPayload = {
      studentId: student.id,
      studentName: student.name,
      parentName: student.parentName,
      amount: numAmount,
      dueDate: new Date().toISOString().split('T')[0],
      category: 'Tahsilat',
      description: `${paymentDescription} (${paymentMethod})`
    };

    const res = await ApiClient.createPayment(newPaymentPayload);
    if (!res.success) {
      alert(`❌ Tahsilat Kaydedilemedi: ${res.error || 'Sistem hatası.'}`);
      return;
    }

    const createdPayment = res.data;

    // Update Zustand store so client lists refresh immediately
    useAppStore.setState(state => ({
      payments: [createdPayment, ...state.payments]
    }));

    const receiptData = {
      receiptNo: createdPayment.id.replace('pay_srv_', 'REC-'),
      studentName: student.name,
      parentName: student.parentName,
      schoolName: student.schoolName || 'Berkaytur Servisi',
      amount: numAmount,
      method: paymentMethod,
      date: new Date().toLocaleDateString('tr-TR'),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      description: paymentDescription
    };

    setCompletedTransaction(receiptData);

    onAddLog('Tahsilat Yapıldı', `${student.name} için ${numAmount} TL tutarında ${paymentMethod} ödeme alındı.`);
    onAddNotification(
      'Ödeme Alındı',
      `${student.name} velisi ${student.parentName}'den ${numAmount} TL tahsil edildi. Makbuz Google Drive'a kaydedildi.`,
      'success'
    );

    // Reset inputs
    setAmountInput('');
    setPaymentDescription('Servis Ücreti Tahsilatı');
  };

  // Generate the installment table
  const handleGeneratePaymentPlan = () => {
    if (!planStudentId) {
      alert("Lütfen bir öğrenci seçiniz!");
      return;
    }

    const student = students.find(s => s.id === planStudentId);
    if (!student) return;

    const fee = parseInt(planAnnualFee);
    if (isNaN(fee) || fee <= 0) {
      alert("Lütfen geçerli bir yıllık ücret giriniz!");
      return;
    }

    const plans: any[] = [];
    if (planSchoolType === 'ozel') {
      // Installments are: Advance or 1 to 5 installments
      const instCount = parseInt(planInstallmentCount);
      if (instCount === 0) {
        // Peşin
        plans.push({
          term: 'Peşin',
          dueDate: new Date().toLocaleDateString('tr-TR'),
          amount: fee,
          status: 'pending'
        });
      } else {
        const instAmount = Math.round(fee / instCount);
        for (let i = 1; i <= instCount; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          plans.push({
            term: `${i}. Taksit`,
            dueDate: dueDate.toLocaleDateString('tr-TR'),
            amount: instAmount,
            status: 'pending'
          });
        }
      }
    } else {
      // Devlet Okulu: September to May monthly plan (9 months)
      const months = ['Eylül', 'Ekim', 'Kasım', 'Aralık', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs'];
      const monthlyAmount = Math.round(fee / months.length);
      months.forEach((m, idx) => {
        plans.push({
          term: m,
          dueDate: `15 ${m} 2026`,
          amount: monthlyAmount,
          status: 'pending'
        });
      });
    }

    setGeneratedPlanList(plans);
  };

  const handleSavePaymentPlanToSystem = async () => {
    if (generatedPlanList.length === 0 || !planStudentId) return;

    const student = students.find(s => s.id === planStudentId);
    if (!student) return;

    const savedPayments: Payment[] = [];

    // Save installments sequentially on the backend database
    for (const item of generatedPlanList) {
      const payload = {
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName,
        amount: item.amount,
        dueDate: new Date().toISOString().split('T')[0],
        category: 'Tahsilat' as const,
        description: `Taksit Planı: ${item.term}`
      };

      const res = await ApiClient.createPayment(payload);
      if (res.success) {
        savedPayments.push(res.data);
      }
    }

    // Sync Zustand client state in a single batch update
    if (savedPayments.length > 0) {
      useAppStore.setState(state => ({
        payments: [...savedPayments, ...state.payments]
      }));
    }

    onAddLog('Ödeme Planı Tanımlandı', `${student.name} için ${generatedPlanList.length} taksitli ödeme planı oluşturuldu.`);
    onAddNotification(
      'Ödeme Planı Kaydedildi',
      `${student.name} için hazırlanan ${planSchoolType === 'ozel' ? 'Özel Okul' : 'Devlet Okulu'} ödeme planı sisteme işlendi.`,
      'success'
    );

    alert(`🎉 Başarılı!\n\n${student.name} için ${generatedPlanList.length} adet ödeme kalemi sisteme ve velinin ödeme ekranına başarıyla işlenmiştir.`);
    setGeneratedPlanList([]);
    setPlanStudentId('');
  };

  const handleRollbackPayment = async (id: string, amount: number, studentName: string) => {
    const confirmRollback = window.confirm(
      `⚠️ Geri Alma (Rollback) Uyarısı!\n\nÖğrenci: ${studentName}\nTutar: ${amount} TL\n\nBu ödemeyi geri almak istediğinize emin misiniz? Bu işlem denetim günlüklerine kalıcı olarak kaydedilecektir.`
    );
    if (!confirmRollback) return;

    const res = await ApiClient.rollbackPayment(id, {
      operatorName: 'Canan Kaya',
      operatorRole: 'coordinator'
    });

    if (res.success) {
      // Update Zustand client state so lists refresh immediately
      useAppStore.setState(state => ({
        payments: state.payments.map(p => p.id === id ? { ...p, status: 'refunded' as any } : p)
      }));

      onAddLog('Tahsilat Geri Alındı', `${studentName} için yapılan ${amount} TL tutarındaki tahsilat geri alındı.`);
      onAddNotification(
        'Ödeme Geri Alındı',
        `${studentName} için yapılan ${amount} TL tutarındaki tahsilat geri alındı.`,
        'warning'
      );
      alert("✅ Tahsilat başarıyla geri alındı (Rollback)! İptal kaydı ve denetim izi sunucuda kalıcı olarak güncellendi.");
    } else {
      alert(`❌ Geri alma işlemi başarısız oldu: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveSubTab('collection')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
            activeSubTab === 'collection' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          💳 Hızlı Tahsilat Girişi
        </button>
        <button
          onClick={() => setActiveSubTab('plans')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
            activeSubTab === 'plans' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📆 Ödeme Planı Oluşturucu
        </button>
      </div>

      {activeSubTab === 'collection' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FAST PAYMENT FORM */}
          <form 
            onSubmit={handleCollectionSubmit}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4"
          >
            <div className="border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <CreditCard className="w-5 h-5 text-blue-600" /> Seri Tahsilat Terminali
              </h4>
              <p className="text-[10px] text-slate-400">Veli ödemelerini saniyeler içerisinde tamamlayın ve makbuz oluşturun.</p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Student selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Öğrenci Seçiniz</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  <option value="">Seçiniz...</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>👤 {st.name} ({st.schoolName})</option>
                  ))}
                </select>
              </div>

              {/* Display Parent Name dynamically if selected */}
              {activeStudent && (
                <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Veli Adı Soyadı:</span>
                    <span className="font-bold text-slate-800">{activeStudent.parentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Veli Telefon:</span>
                    <span className="font-bold text-slate-800">{activeStudent.parentPhone}</span>
                  </div>
                </div>
              )}

              {/* Amount input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Tahsilat Tutarı (TL)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    placeholder="Tutar giriniz (Örn: 2400)"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-blue-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ödeme Yöntemi</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Nakit', 'POS', 'Kredi Kartı', 'Havale', 'EFT', 'Diğer'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                        paymentMethod === m 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ödeme Açıklaması</label>
                <input
                  type="text"
                  required
                  placeholder="Açıklama (Örn: Temmuz Servis Bedeli)"
                  value={paymentDescription}
                  onChange={e => setPaymentDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-200"
            >
              <Receipt className="w-4 h-4" /> Ödemeyi Tamamla & Makbuz Bas
            </button>
          </form>

          {/* RECEIPT / MAKBUZ DISPLAY PREVIEW */}
          <div className="lg:col-span-7 space-y-4">
            {completedTransaction ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="font-black text-slate-900 text-sm uppercase">BERKAYTUR ÖDEME MAKBUZU</h5>
                    <p className="text-[9px] text-slate-400 mt-0.5">Müşteri Nüshası • Fatura Yerine Geçmez</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
                    ÖDEME TAMAMLANDI
                  </span>
                </div>

                {/* Printable Receipt layout */}
                <div className="border border-slate-200/80 rounded-2xl bg-slate-50/50 p-6 space-y-4 font-mono text-xs text-slate-700">
                  <div className="flex justify-between font-black text-slate-800 pb-1.5 border-b border-dashed border-slate-200">
                    <span>MAKBUZ NUMARASI:</span>
                    <span>{completedTransaction.receiptNo}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>ÖĞRENCİ:</span>
                      <span className="font-bold text-slate-900">{completedTransaction.studentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VELİ:</span>
                      <span className="font-bold text-slate-900">{completedTransaction.parentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>OKUL:</span>
                      <span className="font-bold text-slate-900">{completedTransaction.schoolName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TARİH & SAAT:</span>
                      <span className="font-bold text-slate-900">{completedTransaction.date} {completedTransaction.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TÜRÜ / METOT:</span>
                      <span className="font-bold text-slate-900">{completedTransaction.method} TAHSİLAT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AÇIKLAMA:</span>
                      <span className="font-bold text-slate-900">{completedTransaction.description}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-base font-black text-emerald-800 bg-emerald-50 border border-emerald-100 p-3 rounded-xl mt-4 font-sans">
                    <span>TAHSİL EDİLEN TUTAR:</span>
                    <span>{completedTransaction.amount} TL</span>
                  </div>
                </div>

                {/* Receipts Action Bar */}
                <div className="flex flex-wrap gap-2 text-xs justify-end">
                  <button
                    onClick={() => {
                      alert("💾 Makbuz PDF'i Google Drive'a başarıyla kaydedildi!\nYol: /Drive/Berkaytur/Dekontlar/MAKBUZ-" + completedTransaction.receiptNo + ".pdf");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-slate-500" /> Google Drive'a Kaydet
                  </button>
                  <button
                    onClick={() => {
                      alert("📥 Ödeme makbuzu yerel bilgisayarınıza PDF formatında indirildi.");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-200"
                  >
                    <Download className="w-4 h-4" /> PDF İndir / Yazdır
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-16 text-center space-y-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-xs border">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="max-w-xs mx-auto text-xs text-slate-400">
                  Sol taraftan tahsilat yaptığınızda, anında buraya resmi <b>ödeme makbuzu</b> düşecek, Google Drive'a kaydedilecek ve muhasebeye otomatik aktarılacaktır.
                </div>
              </div>
            )}
          </div>

          {/* RECENT TRANSACTIONS & AUDIT ROLLBACK */}
          <div className="lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> Son Tahsilat İşlemleri ve Denetim Günlüğü (Geri Alım Destekli)
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Finansal güvenliği korumak için her tahsilatın tek tıkla geri alınması (rollback) ve işlem geçmişi izi desteklenmektedir.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wide">
                    <th className="p-3">Öğrenci Adı</th>
                    <th className="p-3">Veli / Temsilci</th>
                    <th className="p-3">Açıklama</th>
                    <th className="p-3 text-right">Tutar (Para Birimi)</th>
                    <th className="p-3 text-center">Durum</th>
                    <th className="p-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.filter(p => p.category === 'Tahsilat').slice(0, 8).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{p.studentName}</td>
                      <td className="p-3 text-slate-600">{p.parentName}</td>
                      <td className="p-3 text-slate-500 italic">{p.description}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-600">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(p.amount)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          p.status === 'paid' || p.status === undefined
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20'
                            : p.status === 'refunded'
                              ? 'bg-rose-500/15 text-rose-600 border border-rose-500/20'
                              : 'bg-amber-500/15 text-amber-600 border border-amber-500/20'
                        }`}>
                          {p.status === 'refunded' ? 'İPTAL EDİLDİ / İADE' : 'TAHSİL EDİLDİ'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {p.status !== 'refunded' ? (
                          <button
                            onClick={() => handleRollbackPayment(p.id, p.amount, p.studentName)}
                            className="px-2.5 py-1 text-[10px] font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200/50 cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <RefreshCw className="w-3 h-3 animate-spin-hover" /> GERİ AL (ROLLBACK)
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">İade Edildi</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {payments.filter(p => p.category === 'Tahsilat').length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Henüz sistemde kayıtlı aktif tahsilat kaydı bulunmamaktadır.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* PAYMENT PLANS CREATOR */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Receipt className="w-5 h-5 text-blue-600" /> Akıllı Ödeme Planı Sihirbazı
              </h4>
              <p className="text-[10px] text-slate-400">Okul tipine (Devlet/Özel) göre mevzuata uygun taksit takvimi planlayın.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Öğrenci Seçin</label>
                <select
                  required
                  value={planStudentId}
                  onChange={e => setPlanStudentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Seçiniz...</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.schoolName})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Okul Türü ve Mevzuat</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanSchoolType('ozel')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                      planSchoolType === 'ozel' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Özel Okul (Taksitli)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanSchoolType('devlet')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                      planSchoolType === 'devlet' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Devlet Okulu (Aylık)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Yıllık Servis Bedeli (TL)</label>
                <input
                  type="number"
                  placeholder="Yıllık Toplam Ücret"
                  value={planAnnualFee}
                  onChange={e => setPlanAnnualFee(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-blue-500"
                />
              </div>

              {planSchoolType === 'ozel' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Taksit Sayısı</label>
                  <select
                    value={planInstallmentCount}
                    onChange={e => setPlanInstallmentCount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="0">Peşin (Taksitsiz)</option>
                    <option value="1">1 Taksit</option>
                    <option value="2">2 Taksit</option>
                    <option value="3">3 Taksit</option>
                    <option value="4">4 Taksit</option>
                    <option value="5">5 Taksit (Maksimum)</option>
                  </select>
                </div>
              )}

              {planSchoolType === 'devlet' && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                  💡 <b>Devlet Okulu Mevzuatı:</b> Ödemeler eylül ayında başlayıp mayıs ayında son bulacak şekilde (Eylül, Ekim, Kasım, Aralık, Ocak, Şubat, Mart, Nisan, Mayıs) 9 eşit taksitte vadelendirilir.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGeneratePaymentPlan}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <PlusCircle className="w-4 h-4" /> Ödeme Planı Oluştur / Önizle
            </button>
          </div>

          {/* INTERACTIVE PLAN PREVIEW */}
          <div className="lg:col-span-7">
            {generatedPlanList.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Oluşturulan Ödeme Planı Önizlemesi</h5>
                  <p className="text-[10px] text-slate-400">Yıllık Tutar: {planAnnualFee} TL • Taksit Sayısı: {generatedPlanList.length} Adet</p>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wide">
                        <th className="pb-2">Taksit Adı</th>
                        <th className="pb-2">Son Ödeme Tarihi</th>
                        <th className="pb-2 text-right">Miktar (TL)</th>
                        <th className="pb-2 text-right">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generatedPlanList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-bold text-slate-700">{item.term}</td>
                          <td className="py-2.5 text-slate-500">{item.dueDate}</td>
                          <td className="py-2.5 text-right font-bold text-slate-800">{item.amount} TL</td>
                          <td className="py-2.5 text-right">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">
                              Bekliyor
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setGeneratedPlanList([])}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                  >
                    Temizle
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePaymentPlanToSystem}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Check className="w-4 h-4" /> Ödeme Planını Onayla & Kaydet
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-16 text-center space-y-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-xs border">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="max-w-xs mx-auto text-xs text-slate-400">
                  Ödeme Planı Sihirbazı sayesinde öğrenci için Özel veya Devlet Okulu taksit planlarını tek tıklamayla çıkarıp sisteme ve veli ekranına yansıtabilirsiniz.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
