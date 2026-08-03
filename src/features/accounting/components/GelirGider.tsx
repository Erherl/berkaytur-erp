/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUpRight, 
  ArrowDownRight, Plus, Trash2, Calendar, Landmark 
} from 'lucide-react';

export default function GelirGider() {
  const { payments, users } = useAppStore();

  // Load custom other expenses
  const [customTransactions, setCustomTransactions] = useState<any[]>(() => {
    const list = localStorage.getItem('bkt_accounting_custom_transactions');
    if (!list) {
      const defaults = [
        { id: 'ct_1', date: '2026-07-01', type: 'gider', category: 'Ofis Gideri', amount: 12000, description: 'Yenimahalle Merkez Ofis Aylık Kira Ödemesi' },
        { id: 'ct_2', date: '2026-07-05', type: 'gider', category: 'Sigorta', amount: 8500, description: '06 BKT 123 Trafik Sigortası Taksiti' },
        { id: 'ct_3', date: '2026-07-08', type: 'gelir', category: 'Sponsorluk', amount: 15000, description: 'Araç Arkası Reklam Sponsorluk Geliri' }
      ];
      localStorage.setItem('bkt_accounting_custom_transactions', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(list);
  });

  // Load fuel & repair costs to sum them dynamically
  const fuels = JSON.parse(localStorage.getItem('bkt_accounting_yakitlar') || '[]');
  const repairs = JSON.parse(localStorage.getItem('bkt_accounting_tamirler') || '[]');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'gelir' | 'gider'>('gider');
  const [category, setCategory] = useState('Ofis Gideri');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  // Calculations
  const totalCollections = payments.filter(p => p.category === 'Tahsilat' && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const otherIncomes = customTransactions.filter(t => t.type === 'gelir').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalGelir = totalCollections + otherIncomes;

  // Giderler sum
  const fuelGider = fuels.reduce((sum: number, f: any) => sum + Number(f.total), 0);
  const repairGider = repairs.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  
  // Driver & Hostess salary expense calculation
  const staffUsers = users.filter(u => u.role === 'driver' || u.role === 'hostess');
  const salaryGider = staffUsers.length > 0 ? staffUsers.length * 17000 : 0;

  const customGider = customTransactions.filter(t => t.type === 'gider').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalGider = fuelGider + repairGider + salaryGider + customGider;

  const profitLoss = totalGelir - totalGider;

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Lütfen geçerli bir tutar giriniz!');
      return;
    }

    const newTx = {
      id: `ct_${Date.now()}`,
      date,
      type,
      category,
      amount: amt,
      description: desc || `${category} kaydı`
    };

    const updated = [newTx, ...customTransactions];
    setCustomTransactions(updated);
    localStorage.setItem('bkt_accounting_custom_transactions', JSON.stringify(updated));

    setShowForm(false);
    setAmount('');
    setDesc('');
  };

  const handleDeleteTransaction = (id: string) => {
    if (!window.confirm('Bu finansal kaydı silmek istediğinize emin misiniz?')) return;
    const updated = customTransactions.filter(t => t.id !== id);
    setCustomTransactions(updated);
    localStorage.setItem('bkt_accounting_custom_transactions', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Gelir & Gider (P&L Cari Durumu)</h2>
          <p className="text-slate-500 text-xs font-semibold">Şirket genel gelir-gider dengesi, aylık kâr/zarar tabloları ve diğer idari harcamalar.</p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cari Gelir/Gider Ekle
          </button>
        )}
      </div>

      {/* THREE MAIN BOXES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Income Card */}
        <div className="bg-emerald-50 border border-emerald-100/60 p-6 rounded-3xl relative overflow-hidden flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">TOPLAM GELİRLER</span>
            <p className="text-2xl font-mono font-black text-emerald-800">
              {totalGelir.toLocaleString('tr-TR')} ₺
            </p>
            <div className="flex gap-2 text-[9px] font-bold text-emerald-600/80">
              <span>Veliler: {totalCollections.toLocaleString('tr-TR')} ₺</span>
              <span>• Diğer: {otherIncomes.toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>
          <div className="p-4 bg-emerald-600 text-white rounded-2xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-rose-50 border border-rose-100/60 p-6 rounded-3xl relative overflow-hidden flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider block">TOPLAM GİDERLER</span>
            <p className="text-2xl font-mono font-black text-rose-800">
              {totalGider.toLocaleString('tr-TR')} ₺
            </p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-bold text-rose-600/80 max-w-[200px]">
              <span>Yakıt: {fuelGider.toLocaleString('tr-TR')} ₺</span>
              <span>• Servis: {repairGider.toLocaleString('tr-TR')} ₺</span>
              <span>• Maaş: {salaryGider.toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>
          <div className="p-4 bg-rose-600 text-white rounded-2xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Profit Loss Card */}
        <div className={`p-6 rounded-3xl border relative overflow-hidden flex items-center justify-between ${
          profitLoss >= 0 ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-red-50 border-red-100 text-red-900'
        }`}>
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider block">DÖNEM NET KÂR / ZARAR</span>
            <p className="text-2xl font-mono font-black">
              {profitLoss.toLocaleString('tr-TR')} ₺
            </p>
            <p className="text-[9px] font-extrabold uppercase tracking-widest opacity-80">
              {profitLoss >= 0 ? '📈 KÂR POZİSYONU' : '⚠️ ZARAR ALARMI'}
            </p>
          </div>
          <div className={`p-4 rounded-2xl text-white ${
            profitLoss >= 0 ? 'bg-blue-600' : 'bg-red-600'
          }`}>
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <form onSubmit={handleAddTransaction} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-extrabold text-slate-800 text-sm">Cari Gelir / Gider Girişi</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400">Kapat</button>
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

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase">İşlem Yönü</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('gelir')}
                  className={`flex-1 py-3 text-xs font-bold rounded-2xl border text-center transition-all ${
                    type === 'gelir' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-black' : 'bg-white text-slate-500'
                  }`}
                >
                  Gelir (+)
                </button>
                <button
                  type="button"
                  onClick={() => setType('gider')}
                  className={`flex-1 py-3 text-xs font-bold rounded-2xl border text-center transition-all ${
                    type === 'gider' ? 'bg-rose-50 border-rose-500 text-rose-700 font-black' : 'bg-white text-slate-500'
                  }`}
                >
                  Gider (-)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase">Kategori</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold focus:outline-none"
              >
                {type === 'gelir' ? (
                  <>
                    <option value="Sözleşme Geliri">Sözleşme Geliri</option>
                    <option value="Sponsorluk">Sponsorluk</option>
                    <option value="Diğer Gelir">Diğer Gelir</option>
                  </>
                ) : (
                  <>
                    <option value="Ofis Gideri">Ofis Gideri</option>
                    <option value="Sigorta">Sigorta</option>
                    <option value="Yol & Köprü">Yol & Köprü</option>
                    <option value="Fatura & İletişim">Fatura & İletişim</option>
                    <option value="Vergi & Harç">Vergi & Harç</option>
                    <option value="Diğer Gider">Diğer Gider</option>
                  </>
                )}
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

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-400 uppercase">Gerekçe / Açıklama</label>
            <input
              type="text"
              required
              placeholder="Muhasebe fiş kaydı açıklaması..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              Cari Hareketi Ekle
            </button>
          </div>
        </form>
      )}

      {/* GENERAL LEDGER VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Visual Category Allocation Chart Simulation */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-6">
          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Gider Dağılım Analizi</h4>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Şoför & Hostes Maaşları ({((salaryGider / totalGider) * 100).toFixed(0)}%)</span>
                <span className="font-mono text-slate-800">{salaryGider.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(salaryGider / totalGider) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Akaryakıt Giderleri ({((fuelGider / totalGider) * 100).toFixed(0)}%)</span>
                <span className="font-mono text-slate-800">{fuelGider.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(fuelGider / totalGider) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Servis Bakım & Onarım ({((repairGider / totalGider) * 100).toFixed(0)}%)</span>
                <span className="font-mono text-slate-800">{repairGider.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${(repairGider / totalGider) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">İdari ve Diğer Harcamalar ({((customGider / totalGider) * 100).toFixed(0)}%)</span>
                <span className="font-mono text-slate-800">{customGider.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(customGider / totalGider) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Transaction Database List */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4">
          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Cari Gelir/Gider Defter Kayıtları</h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-2">
                  <th className="pb-2">Tarih</th>
                  <th className="pb-2">Yön</th>
                  <th className="pb-2">Kategori</th>
                  <th className="pb-2">Açıklama</th>
                  <th className="pb-2">Tutar</th>
                  <th className="pb-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {customTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-3 font-mono text-slate-500">{tx.date}</td>
                    <td className="py-3">
                      {tx.type === 'gelir' ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">GELİR</span>
                      ) : (
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">GIDER</span>
                      )}
                    </td>
                    <td className="py-3 font-bold text-slate-800">{tx.category}</td>
                    <td className="py-3 italic text-slate-400 max-w-[200px] truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className={`py-3 font-mono font-black text-sm ${
                      tx.type === 'gelir' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'gelir' ? '+' : '-'}{tx.amount.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
