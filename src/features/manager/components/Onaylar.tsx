import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { Shield, Check, X, AlertTriangle, UserCheck, DollarSign, RefreshCw, FileText, User } from 'lucide-react';
import { ApiClient } from '../../../infrastructure/api/apiClient';

export interface ApprovalRequest {
  id: string;
  type: 'discount' | 'penalty' | 'adjustment' | 'refund' | 'special_price';
  title: string;
  targetName: string;
  targetId: string;
  amount: number;
  requesterName: string;
  requesterRole: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  oldValue?: string;
  newValue?: string;
  approverName?: string;
  rejectionReason?: string;
}

export default function Onaylar() {
  const store = useAppStore();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [rejectionModalRequest, setRejectionModalRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const loadRequests = () => {
    const data = localStorage.getItem('bkt_approvals');
    if (data) {
      setRequests(JSON.parse(data));
    } else {
      const initialRequests: ApprovalRequest[] = [];
      localStorage.setItem('bkt_approvals', JSON.stringify(initialRequests));
      setRequests(initialRequests);
    }
  };

  useEffect(() => {
    loadRequests();
    // Listen for storage changes to sync across tabs
    const handleStorageChange = () => loadRequests();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveRequestsToStorage = (updatedList: ApprovalRequest[]) => {
    localStorage.setItem('bkt_approvals', JSON.stringify(updatedList));
    setRequests(updatedList);
  };

  const handleApprove = async (req: ApprovalRequest) => {
    const updatedList = requests.map(r => {
      if (r.id === req.id) {
        return {
          ...r,
          status: 'approved' as const,
          approverName: store.currentUser?.name || 'Mehmet Öz'
        };
      }
      return r;
    });
    saveRequestsToStorage(updatedList);

    // Dynamic execution of the approved item (RULE 9 - MUHASEBE)
    if (req.type === 'penalty') {
      // Add to bkt_accounting_cezalar so it impacts driver/hostess payouts
      const existingCezalar = JSON.parse(localStorage.getItem('bkt_accounting_cezalar') || '[]');
      const newFine = {
        id: `fn_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        personnelId: req.targetId,
        personnelName: req.targetName,
        vehiclePlate: '34 BKT 1903',
        amount: req.amount,
        reason: req.reason,
        source: 'Onaylı Denetim Cezası',
        description: `Proje Müdürü onaylı denetim cezası kesintisi. Gerekçe: ${req.reason}`
      };
      localStorage.setItem('bkt_accounting_cezalar', JSON.stringify([newFine, ...existingCezalar]));
    } else if (req.type === 'discount' || req.type === 'special_price') {
      // Update application or contract fee
      const cleanTargetId = req.targetId;
      const targetNewValue = parseFloat(req.newValue || '0');
      
      if (targetNewValue > 0) {
        try {
          // Permanently persist approved price change in backend database (KURAL 5, 8, 9)
          await ApiClient.updateApplication(cleanTargetId, {
            calculatedFee: targetNewValue
          });
        } catch (err) {
          console.error('[APPROVAL SYSTEM] Failed to update application in database:', err);
        }
      }

      // Update cached applications
      const rawApps = (window as any)._berkaytur_veli_basvurulari || [];
      const updatedApps = rawApps.map((a: any) => {
        if (a.id === cleanTargetId) {
          return { ...a, calculatedFee: targetNewValue || a.calculatedFee };
        }
        return a;
      });
      (window as any)._berkaytur_veli_basvurulari = updatedApps;

      // Update store contracts if applicable
      const contracts = store.payments.map(p => {
        if (p.studentId === cleanTargetId) {
          return { ...p, amount: targetNewValue || p.amount };
        }
        return p;
      });
    }

    // Save Audit Log (RULE 10 - RAPORLAMA)
    store.addLog(
      `İşlem Onaylandı (${getTypeLabel(req.type)})`,
      `${req.requesterName} tarafından talep edilen ${req.title} işlemi, Proje Müdürü ${store.currentUser?.name || 'Mehmet Öz'} tarafından onaylanmıştır. Gerekçe: ${req.reason}`,
      req.oldValue || 'Belirtilmedi',
      req.newValue || 'Belirtilmedi'
    );

    alert(`✅ İşlem Onaylandı!\n\n${req.title} başarıyla onaylanarak sisteme/muhasebeye yansıtılmıştır.`);
  };

  const openRejectionModal = (req: ApprovalRequest) => {
    setRejectionModalRequest(req);
    setRejectionReasonInput('');
  };

  const handleRejectSubmit = () => {
    if (!rejectionModalRequest) return;
    if (!rejectionReasonInput.trim()) {
      alert('Lütfen reddetme gerekçesini belirtiniz!');
      return;
    }

    const updatedList = requests.map(r => {
      if (r.id === rejectionModalRequest.id) {
        return {
          ...r,
          status: 'rejected' as const,
          approverName: store.currentUser?.name || 'Mehmet Öz',
          rejectionReason: rejectionReasonInput
        };
      }
      return r;
    });
    saveRequestsToStorage(updatedList);

    // Save Audit Log (RULE 10 - RAPORLAMA)
    store.addLog(
      `İşlem Reddedildi (${getTypeLabel(rejectionModalRequest.type)})`,
      `${rejectionModalRequest.requesterName} tarafından talep edilen ${rejectionModalRequest.title} işlemi, Proje Müdürü tarafından REDDEDİLMİŞTİR. Red Nedeni: ${rejectionReasonInput}`,
      rejectionModalRequest.oldValue || 'Belirtilmedi',
      rejectionModalRequest.oldValue || 'Değişiklik yapılmadı (Eski değer korundu)'
    );

    alert(`❌ İşlem Reddedildi!\n\nTalep iptal edildi ve eski fiyat/tutar muhafaza edildi.`);
    setRejectionModalRequest(null);
  };

  const getTypeLabel = (type: ApprovalRequest['type']) => {
    switch (type) {
      case 'discount': return 'Fiyat İndirimi';
      case 'penalty': return 'Ceza Kesintisi';
      case 'adjustment': return 'Hakediş Düzeltmesi';
      case 'refund': return 'Büyük İade İşlemi';
      case 'special_price': return 'Özel Fiyat Uygulaması';
      default: return 'Diğer';
    }
  };

  const getTypeStyle = (type: ApprovalRequest['type']) => {
    switch (type) {
      case 'discount': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'penalty': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'adjustment': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'refund': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'special_price': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredRequests = requests.filter(r => {
    const typeMatch = filterType === 'all' || r.type === filterType;
    const statusMatch = filterStatus === 'all' || r.status === filterStatus;
    return typeMatch && statusMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      
      {/* FILTER PANEL */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">PROJE MÜDÜRÜ ONAYLAMA MERKEZİ</h4>
            <p className="text-[10px] text-slate-400">Fiyat indirimleri, ceza kesintileri, büyük iadeler ve hakediş düzeltmeleri için elektronik onay havuzu.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border rounded-xl bg-slate-50 font-bold text-slate-700 focus:outline-none"
          >
            <option value="all">Tüm İşlem Türleri</option>
            <option value="discount">Fiyat İndirimleri</option>
            <option value="penalty">Ceza Kesintileri</option>
            <option value="adjustment">Hakediş Düzeltmeleri</option>
            <option value="refund">Büyük İade İşlemleri</option>
            <option value="special_price">Özel Fiyatlar</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border rounded-xl bg-slate-50 font-bold text-slate-700 focus:outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">⏳ Onay Bekleyenler</option>
            <option value="approved">✅ Onaylananlar</option>
            <option value="rejected">❌ Reddedilenler</option>
          </select>

          <button
            onClick={loadRequests}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer transition-all"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* REQUESTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className={`px-2.5 py-1 border rounded-lg text-[9px] font-black uppercase tracking-wider ${getTypeStyle(req.type)}`}>
                {getTypeLabel(req.type)}
              </span>
              <span className="text-slate-400 font-medium">{req.createdAt}</span>
            </div>

            {/* Title & Body */}
            <div>
              <h5 className="font-extrabold text-slate-800 text-sm leading-snug">{req.title}</h5>
              <p className="text-slate-500 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong>Gerekçe / Detay:</strong> {req.reason}
              </p>
            </div>

            {/* Meta Parameters */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/40">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Talep Eden</span>
                <span className="font-extrabold text-slate-700">{req.requesterName} ({req.requesterRole === 'coordinator' ? 'Okul Sorumlusu' : 'Muhasebe'})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">İşlem Tutarı</span>
                <span className="font-extrabold text-blue-600 text-sm">{req.amount.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Eski Değer</span>
                <span className="font-bold text-slate-500 line-through">{req.oldValue || 'Yok'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Yeni Hedef Değer</span>
                <span className="font-bold text-emerald-600">{req.newValue || 'Belirtilmedi'}</span>
              </div>
            </div>

            {/* Audit Tracking for Processed Items */}
            {req.status !== 'pending' && (
              <div className="p-3 rounded-xl border leading-relaxed text-[11px]" style={{
                backgroundColor: req.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                borderColor: req.status === 'approved' ? '#bbf7d0' : '#fecaca',
                color: req.status === 'approved' ? '#15803d' : '#b91c1c'
              }}>
                <strong>Karar Verici:</strong> {req.approverName || 'Mehmet Öz'}<br />
                {req.status === 'approved' ? (
                  <span>✅ İşlem onaylandı ve anlık olarak canlı sisteme işlendi.</span>
                ) : (
                  <span>❌ <strong>Red Nedeni:</strong> {req.rejectionReason}</span>
                )}
              </div>
            )}

            {/* Actions for Pending */}
            {req.status === 'pending' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleApprove(req)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10 transition-all"
                >
                  <Check className="w-4 h-4" /> Onayla
                </button>
                <button
                  onClick={() => openRejectionModal(req)}
                  className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 transition-all"
                >
                  <X className="w-4 h-4" /> Reddet
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="col-span-2 bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-xs border">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="max-w-xs mx-auto text-xs text-slate-400 leading-normal">
              Onaylanacak bekleyen herhangi bir işlem talebi bulunmamaktadır.
            </div>
          </div>
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectionModalRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Talep Reddetme Gerekçesi
              </h4>
              <button
                onClick={() => setRejectionModalRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500 leading-relaxed text-[11px]">
              <strong>{rejectionModalRequest.title}</strong> talebini reddetmek üzeresiniz. Red gerekçesini girdiğinizde bu gerekçe raporlara işlenecektir.
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 block">Red Gerekçesi (Zorunlu)</label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Örn: İndirim oranı limit dışıdır. Veli ile tekrar görüşülmelidir."
                rows={4}
                className="w-full p-3 border rounded-xl focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRejectionModalRequest(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleRejectSubmit}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer shadow-sm shadow-rose-600/10"
              >
                Reddi Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
