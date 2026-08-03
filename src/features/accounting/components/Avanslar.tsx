/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { 
  DollarSign, Calendar, User, Trash2, Plus, 
  Search, ShieldAlert, FileText, CheckCircle
} from 'lucide-react';

export default function Avanslar() {
  const { users, addLog } = useAppStore();

  const [advances, setAdvances] = useState<any[]>(() => {
    const list = localStorage.getItem('bkt_accounting_avanslar');
    if (!list) {
      // Seed realistic defaults
      const defaults = [
        { id: 'av_1', date: '2026-07-02', personnelId: 'u4', personnelName: 'Ahmet Yılmaz', role: 'Sürücü', amount: 3000, description: 'Sıra Dışı Kişisel Masraf Avansı' },
        { id: 'av_2', date: '2026-07-05', personnelId: 'u5', personnelName: 'Ayşe Yıldız', role: 'Hostes', amount: 1500, description: 'Temmuz Başı Eğitim Katılım Avansı' }
      ];
      localStorage.setItem('bkt_accounting_avanslar', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(list);
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Combine drivers & hostesses for dropdown select
  const staffOptions = users.filter(u => u.role === 'driver' || u.role === 'hostess');

  const handleAddAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId || !amount) return;

    const selectedUser = users.find(u => u.id === selectedPersonnelId);
    if (!selectedUser) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Lütfen geçerli bir tutar giriniz!');
      return;
    }

    const newAv: any = {
      id: `av_${Date.now()}`,
      date,
      personnelId: selectedUser.id,
      personnelName: selectedUser.name,
      role: selectedUser.role === 'driver' ? 'Sürücü' : 'Hostes',
      amount: amt,
      description: description || 'Dönem İçi Nakit Avansı'
    };

    const updated = [newAv, ...advances];
    setAdvances(updated);
    localStorage.setItem('bkt_accounting_avanslar', JSON.stringify(updated));

    addLog(
      'Avans Tanımlandı', 
      `${selectedUser.name} (${newAv.role}) için ${amt.toLocaleString('tr-TR')} ₺ tutarında avans girişi yapıldı. Dönem sonu hakedişinden otomatik mahsup edilecektir.`
    );

    setShowAddForm(false);
    setSelectedPersonnelId('');
    setAmount('');
    setDescription('');
  };

  const handleDeleteAdvance = (id: string, name: string, amt: number) => {
    if (!window.confirm('Bu avans kaydını silmek istediğinize emin misiniz?')) return;
    const updated = advances.filter(a => a.id !== id);
    setAdvances(updated);
    localStorage.setItem('bkt_accounting_avanslar', JSON.stringify(updated));
    addLog('Avans İptal Edildi', `${name} adlı personelin ${amt.toLocaleString('tr-TR')} ₺ tutarındaki avans kaydı silindi.`);
  };

  const totalAdvancePaid = advances.reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Avans Ödemeleri & Talep Kayıtları</h2>
          <p className="text-slate-500 text-xs font-semibold">Şoför, hostes veya tedarikçilerin dönem içi avans ödemeleri. (Ay sonunda otomatik olarak hakedişlerinden düşecektir.)</p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Avans Tanımla
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Toplam Ödenen Avans</span>
            <p className="text-xl font-mono font-black text-slate-800">
              {totalAdvancePaid.toLocaleString('tr-TR')} ₺
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Aktif Avans Kaydı</span>
            <p className="text-xl font-mono font-black text-slate-800">
              {advances.length} Kişi
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-blue-900 p-5 rounded-2xl text-blue-100 flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <p className="text-[11px] leading-relaxed font-semibold">
            Avanslar, personelin hakediş dönemi tamamlandığında hesaplanan Brüt Hakedişinden otomatik mahsup edilir. El ile kesinti yapılmasına gerek yoktur.
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddAdvanceSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-extrabold text-slate-800 text-sm">Dönem İçi Avans Girişi</h4>
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
              <label className="text-xs font-extrabold text-slate-400 uppercase">Personel</label>
              <select
                required
                value={selectedPersonnelId}
                onChange={e => setSelectedPersonnelId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold focus:outline-none"
              >
                <option value="">Seçiniz...</option>
                {staffOptions.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.role === 'driver' ? 'Sürücü' : 'Hostes'})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase">Tutar (₺)</label>
              <input
                type="number"
                required
                placeholder="Örn: 1500"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-400 uppercase">Gerekçe / Açıklama</label>
            <input
              type="text"
              required
              placeholder="Yol harcı, acil araç yedek parça alımı vb."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold"
            />
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
              Avans Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Avans List Database */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4">
        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Aktif Avans Hareketleri</h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-2">
                <th className="pb-3">Tarih</th>
                <th className="pb-3">Personel</th>
                <th className="pb-3">Görev</th>
                <th className="pb-3">Açıklama</th>
                <th className="pb-3">Tutar</th>
                <th className="pb-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {advances.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/20 transition-colors">
                  <td className="py-3 font-mono text-slate-500">{a.date}</td>
                  <td className="py-3 font-bold text-slate-800">{a.personnelName}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.role === 'Sürücü' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {a.role}
                    </span>
                  </td>
                  <td className="py-3 italic text-slate-400">{a.description}</td>
                  <td className="py-3 font-mono font-black text-slate-900 text-sm">
                    {a.amount.toLocaleString('tr-TR')} ₺
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDeleteAdvance(a.id, a.personnelName, a.amount)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {advances.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Kayıtlı avans bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
