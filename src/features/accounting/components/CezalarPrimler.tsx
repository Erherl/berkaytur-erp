/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { 
  AlertTriangle, Award, Plus, Trash2, Calendar, 
  User, CheckSquare, Search, DollarSign, Eye
} from 'lucide-react';

export default function CezalarPrimler() {
  const { users, vehicles, addLog } = useAppStore();
  const [subTab, setSubTab] = useState<'fine' | 'prime'>('fine');

  // Load penalties / fines list
  const [fines, setFines] = useState<any[]>(() => {
    const list = localStorage.getItem('bkt_accounting_cezalar');
    if (!list) {
      // Seed default inspection-based fines
      const defaults = [
        { id: 'fn_1', date: '2026-07-06', personnelId: 'u4', personnelName: 'Ahmet Yılmaz', vehiclePlate: '06 BKT 123', amount: 1500, reason: 'Koltuk Sensörü Arızası', source: 'Sabah Denetimleri', description: 'Denetimde arka 3. sıra koltuk emniyet sensörü devre dışı tespit edildi.' },
        { id: 'fn_2', date: '2026-07-07', personnelId: 'u4', personnelName: 'Ahmet Yılmaz', vehiclePlate: '06 BKT 123', amount: 2000, reason: 'Gecikmeli Servis Başlangıcı', source: 'Koordinatör Şikayeti', description: 'Gerekçesiz sabah hattına 15 dakika geç başlandı.' }
      ];
      localStorage.setItem('bkt_accounting_cezalar', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(list);
  });

  // Load bonuses / primes list
  const [primes, setPrimes] = useState<any[]>(() => {
    const list = localStorage.getItem('bkt_accounting_primler');
    if (!list) {
      const defaults = [
        { id: 'pr_1', date: '2026-07-05', personnelId: 'u4', personnelName: 'Ahmet Yılmaz', amount: 3000, reason: 'Kusursuz Ay Sonu Ödülü', description: 'Temmuz dönemi boyunca veli memnuniyeti %100 ve sıfır gecikme sağlandı.' }
      ];
      localStorage.setItem('bkt_accounting_primler', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(list);
  });

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [desc, setDesc] = useState('');

  const staffOptions = users.filter(u => u.role === 'driver' || u.role === 'hostess');

  const handleAddFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId || !amount || !reason) return;

    const u = users.find(usr => usr.id === selectedPersonnelId);
    if (!u) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Lütfen geçerli bir tutar giriniz!');
      return;
    }

    const newFine = {
      id: `fn_${Date.now()}`,
      date,
      personnelId: u.id,
      personnelName: u.name,
      vehiclePlate: u.vehicleId ? (vehicles.find((v: any) => v.id === u.vehicleId)?.plate || '06 BKT 123') : 'Plakasız/Sorumlu',
      amount: amt,
      reason,
      source: 'Finans Yönetimi',
      description: desc || 'İdari ceza kesintisi'
    };

    const updated = [newFine, ...fines];
    setFines(updated);
    localStorage.setItem('bkt_accounting_cezalar', JSON.stringify(updated));

    addLog(
      'Ceza Kaydı Girildi', 
      `${u.name} personeline ${reason} gerekçesiyle ${amt.toLocaleString('tr-TR')} ₺ ceza tahakkuk ettirildi. Hakedişinden otomatik düşülecektir.`
    );

    setShowAddForm(false);
    resetForm();
  };

  const handleAddPrime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId || !amount || !reason) return;

    const u = users.find(usr => usr.id === selectedPersonnelId);
    if (!u) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Lütfen geçerli bir tutar giriniz!');
      return;
    }

    const newPrime = {
      id: `pr_${Date.now()}`,
      date,
      personnelId: u.id,
      personnelName: u.name,
      amount: amt,
      reason,
      description: desc || 'Performans teşvik primi'
    };

    const updated = [newPrime, ...primes];
    setPrimes(updated);
    localStorage.setItem('bkt_accounting_primler', JSON.stringify(updated));

    addLog(
      'Prim Hak Edildi', 
      `${u.name} personeline ${reason} gerekçesiyle ${amt.toLocaleString('tr-TR')} ₺ prim tanımlandı. Dönem sonu hakedişine eklenecektir.`
    );

    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedPersonnelId('');
    setAmount('');
    setReason('');
    setDesc('');
  };

  const handleDeleteFine = (id: string, name: string, amt: number) => {
    if (!window.confirm('Bu ceza kaydini iptal etmek istediginize emin misiniz?')) return;
    const updated = fines.filter(f => f.id !== id);
    setFines(updated);
    localStorage.setItem('bkt_accounting_cezalar', JSON.stringify(updated));
    addLog('Ceza Kaydı İptal', `${name} personeline ait ${amt.toLocaleString('tr-TR')} ₺ ceza kaydı iptal edildi.`);
  };

  const handleDeletePrime = (id: string, name: string, amt: number) => {
    if (!window.confirm('Bu prim ödül kaydını silmek istediğinize emin misiniz?')) return;
    const updated = primes.filter(p => p.id !== id);
    setPrimes(updated);
    localStorage.setItem('bkt_accounting_primler', JSON.stringify(updated));
    addLog('Prim Kaydı İptal', `${name} personeline ait ${amt.toLocaleString('tr-TR')} ₺ prim ödülü iptal edildi.`);
  };

  const totalFines = fines.reduce((sum, f) => sum + Number(f.amount), 0);
  const totalPrimes = primes.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER AND TAB SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Ceza & Prim Yönetimi</h2>
          <p className="text-slate-500 text-xs font-semibold">Şoför ve hosteslerin sabah denetimi cezaları ile motivasyon artırıcı prim tanımlamaları.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => { setSubTab('fine'); setShowAddForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'fine' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ⚠️ Ceza Kesintileri
            </button>
            <button
              onClick={() => { setSubTab('prime'); setShowAddForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'prime' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              💰 Performans Primleri
            </button>
          </div>

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> {subTab === 'fine' ? 'Ceza Kaydı Ekle' : 'Prim Tanımla'}
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-rose-600 uppercase">Toplam Tahakkuk Eden Ceza</span>
            <p className="text-xl font-mono font-black text-rose-700">
              {totalFines.toLocaleString('tr-TR')} ₺
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Toplam Hak Edilen Prim</span>
            <p className="text-xl font-mono font-black text-emerald-700">
              {totalPrimes.toLocaleString('tr-TR')} ₺
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-blue-900 p-5 rounded-2xl text-blue-100 flex items-center gap-3">
          <span className="text-2xl">📈</span>
          <p className="text-[11px] leading-relaxed font-semibold">
            Sabah denetimlerindeki eksiklikler veya ihlaller, denetçiler sisteme girdiğinde otomatik olarak muhasebe ekranındaki Ceza listesine yansır.
          </p>
        </div>
      </div>

      {/* ADD FORM PANEL */}
      {showAddForm && (
        <form 
          onSubmit={subTab === 'fine' ? handleAddFine : handleAddPrime} 
          className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4 animate-fade-in"
        >
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              {subTab === 'fine' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <Award className="w-4 h-4 text-emerald-500" />}
              {subTab === 'fine' ? 'Manuel İdari Ceza Kaydı' : 'Yeni Teşvik / Performans Primi Girişi'}
            </h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-xs font-bold text-slate-400">Kapat</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase">Tarih</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-extrabold text-slate-400 uppercase">İlişkili Personel</label>
              <select
                required
                value={selectedPersonnelId}
                onChange={e => setSelectedPersonnelId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold focus:outline-none"
              >
                <option value="">Seçiniz...</option>
                {staffOptions.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.role === 'driver' ? 'Sürücü' : 'Hostes'})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase">Tutar (₺)</label>
              <input
                type="number"
                required
                placeholder="Tutar girin..."
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase">
                {subTab === 'fine' ? 'Ceza Nedeni / Başlık' : 'Prim Başlığı / Teşvik Nedeni'}
              </label>
              <input
                type="text"
                required
                placeholder={subTab === 'fine' ? 'Örn: Hız İhlali, Kılık Kıyafet' : 'Örn: Veli Teşekkür Mektubu'}
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-extrabold text-slate-400 uppercase">Detaylı Açıklama</label>
              <input
                type="text"
                placeholder="Konu hakkında resmi bildirim açıklaması..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              {subTab === 'fine' ? 'Cezayı İşle' : 'Primi Kaydet'}
            </button>
          </div>
        </form>
      )}

      {/* DATA VIEW TABLES */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50">
        {subTab === 'fine' ? (
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Aktif Ceza & Kesinti Detayları</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-2">
                    <th className="pb-3">Tarih</th>
                    <th className="pb-3">Personel</th>
                    <th className="pb-3">Araç Plaka</th>
                    <th className="pb-3">Ceza Nedeni</th>
                    <th className="pb-3">Kaynak</th>
                    <th className="pb-3">Açıklama</th>
                    <th className="pb-3">Tutar</th>
                    <th className="pb-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {fines.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="py-3 font-mono text-slate-500">{f.date}</td>
                      <td className="py-3 font-bold text-slate-800">{f.personnelName}</td>
                      <td className="py-3 font-mono font-semibold">{f.vehiclePlate}</td>
                      <td className="py-3 font-extrabold text-red-600">{f.reason}</td>
                      <td className="py-3 text-[10px] text-slate-400 font-black uppercase">{f.source}</td>
                      <td className="py-3 italic text-slate-400 max-w-[200px] truncate" title={f.description}>
                        {f.description}
                      </td>
                      <td className="py-3 font-mono font-black text-rose-600 text-sm">
                        -{f.amount.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteFine(f.id, f.personnelName, f.amount)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {fines.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Kayıtlı ceza kesintisi bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Performans Primi Hak Edişleri</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-2">
                    <th className="pb-3">Tarih</th>
                    <th className="pb-3">Personel</th>
                    <th className="pb-3">Prim Gerekçesi</th>
                    <th className="pb-3">Detay / Açıklama</th>
                    <th className="pb-3">Tutar</th>
                    <th className="pb-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {primes.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="py-3 font-mono text-slate-500">{p.date}</td>
                      <td className="py-3 font-bold text-slate-800">{p.personnelName}</td>
                      <td className="py-3 font-extrabold text-emerald-600">{p.reason}</td>
                      <td className="py-3 italic text-slate-400 max-w-[250px] truncate" title={p.description}>
                        {p.description}
                      </td>
                      <td className="py-3 font-mono font-black text-emerald-600 text-sm">
                        +{p.amount.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeletePrime(p.id, p.personnelName, p.amount)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {primes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Kayıtlı teşvik primi bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
