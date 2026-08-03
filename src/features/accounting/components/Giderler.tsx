/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { 
  Fuel, Wrench, Plus, Trash2, Calendar, FileText, 
  Settings, CheckSquare, Search, DollarSign, Calculator
} from 'lucide-react';

export default function Giderler() {
  const { vehicles, addLog } = useAppStore();
  const [subTab, setSubTab] = useState<'fuel' | 'repair'>('fuel');

  // Load fuel list
  const [fuels, setFuels] = useState<any[]>(() => {
    const list = localStorage.getItem('bkt_accounting_yakitlar');
    if (!list) {
      const defaults = [
        { id: 'f_1', date: '2026-07-04', vehiclePlate: '06 BKT 123', liters: 60, pricePerLiter: 42.50, total: 2550, receiptNo: 'YKT-99882', deductFromHakedis: true, description: 'Haftalık Rutin Dolum' },
        { id: 'f_2', date: '2026-07-08', vehiclePlate: '06 BKT 456', liters: 75, pricePerLiter: 42.50, total: 3187.50, receiptNo: 'YKT-99901', deductFromHakedis: false, description: 'Şirket Karşılamalı Şehir Dışı Görev' }
      ];
      localStorage.setItem('bkt_accounting_yakitlar', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(list);
  });

  // Load repairs list
  const [repairs, setRepairs] = useState<any[]>(() => {
    const list = localStorage.getItem('bkt_accounting_tamirler');
    if (!list) {
      const defaults = [
        { id: 'r_1', date: '2026-07-03', vehiclePlate: '06 BKT 123', repairType: 'Periyodik Bakım', serviceShop: 'BERKAYTUR Yetkili Servisi', amount: 8500, invoiceNo: 'FTR-2026-0034', deductFromHakedis: true, description: '120,000 KM Ağır Bakım ve Balatalar' }
      ];
      localStorage.setItem('bkt_accounting_tamirler', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(list);
  });

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState('');
  const [deduct, setDeduct] = useState(true);
  const [desc, setDesc] = useState('');

  // Fuel Form Fields
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('42.50');
  const [receiptNo, setReceiptNo] = useState('');

  // Repair Form Fields
  const [repairType, setRepairType] = useState('Periyodik Bakım');
  const [serviceShop, setServiceShop] = useState('BERKAYTUR Yetkili Servisi');
  const [amount, setAmount] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiclePlate || !liters || !pricePerLiter) return;

    const lit = parseFloat(liters);
    const prc = parseFloat(pricePerLiter);
    if (isNaN(lit) || isNaN(prc) || lit <= 0 || prc <= 0) {
      alert('Lütfen geçerli girdiler yapınız!');
      return;
    }

    const total = lit * prc;
    const newFuel = {
      id: `f_${Date.now()}`,
      date,
      vehiclePlate: selectedVehiclePlate,
      liters: lit,
      pricePerLiter: prc,
      total,
      receiptNo: receiptNo || `YKT-${Math.floor(10000 + Math.random() * 90000)}`,
      deductFromHakedis: deduct,
      description: desc || 'Rutin Depo Dolumu'
    };

    const updated = [newFuel, ...fuels];
    setFuels(updated);
    localStorage.setItem('bkt_accounting_yakitlar', JSON.stringify(updated));

    addLog(
      'Yakıt Gideri İşlendi', 
      `${selectedVehiclePlate} aracı için ${lit}L yakıt alındı. Toplam: ${total.toLocaleString('tr-TR')} ₺. ${deduct ? 'Hakedişten düşülecektir.' : 'Şirket gideridir.'}`
    );

    setShowAddForm(false);
    resetForm();
  };

  const handleAddRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiclePlate || !amount || !serviceShop) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Lütfen geçerli bir tutar giriniz!');
      return;
    }

    const newRepair = {
      id: `r_${Date.now()}`,
      date,
      vehiclePlate: selectedVehiclePlate,
      repairType,
      serviceShop,
      amount: amt,
      invoiceNo: invoiceNo || `FTR-${Math.floor(10000 + Math.random() * 90000)}`,
      deductFromHakedis: deduct,
      description: desc || 'Sanayi Servis İşlemi'
    };

    const updated = [newRepair, ...repairs];
    setRepairs(updated);
    localStorage.setItem('bkt_accounting_tamirler', JSON.stringify(updated));

    addLog(
      'Tamir Gideri İşlendi', 
      `${selectedVehiclePlate} aracı için ${repairType} yapıldı. Maliyet: ${amt.toLocaleString('tr-TR')} ₺. Servis: ${serviceShop}. ${deduct ? 'Hakedişten düşülecektir.' : 'Şirket gideridir.'}`
    );

    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedVehiclePlate('');
    setLiters('');
    setPricePerLiter('42.50');
    setReceiptNo('');
    setAmount('');
    setInvoiceNo('');
    setDesc('');
    setDeduct(true);
  };

  const handleDeleteFuel = (id: string, plate: string, tot: number) => {
    if (!window.confirm('Bu yakıt kaydını silmek istediğinize emin misiniz?')) return;
    const updated = fuels.filter(f => f.id !== id);
    setFuels(updated);
    localStorage.setItem('bkt_accounting_yakitlar', JSON.stringify(updated));
    addLog('Yakıt Gider Kaydı İptal', `${plate} plakasının ${tot.toLocaleString('tr-TR')} ₺ tutarındaki yakıt fiş kaydı silindi.`);
  };

  const handleDeleteRepair = (id: string, plate: string, amt: number) => {
    if (!window.confirm('Bu bakım/tamir gider kaydını silmek istediğinize emin misiniz?')) return;
    const updated = repairs.filter(r => r.id !== id);
    setRepairs(updated);
    localStorage.setItem('bkt_accounting_tamirler', JSON.stringify(updated));
    addLog('Tamir Bakım Gider Kaydı İptal', `${plate} plakasının ${amt.toLocaleString('tr-TR')} ₺ tutarındaki servis fatura kaydı silindi.`);
  };

  const totalFuelCost = fuels.reduce((sum, f) => sum + Number(f.total), 0);
  const totalRepairCost = repairs.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER AND TAB BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Araç Gider Yönetimi</h2>
          <p className="text-slate-500 text-xs font-semibold">Tüm filo araçlarının yakıt harcamaları ve servis/tamir fatura takip operasyonları.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => { setSubTab('fuel'); setShowAddForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'fuel' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ⛽ Yakıt Alımları
            </button>
            <button
              onClick={() => { setSubTab('repair'); setShowAddForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'repair' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🔧 Servis & Tamirler
            </button>
          </div>

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Yeni Gider Ekle
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Toplam Yakıt Gideri</span>
            <p className="text-xl font-mono font-black text-slate-800">
              {totalFuelCost.toLocaleString('tr-TR')} ₺
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Fuel className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Toplam Servis/Tamir</span>
            <p className="text-xl font-mono font-black text-slate-800">
              {totalRepairCost.toLocaleString('tr-TR')} ₺
            </p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl text-slate-100 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <p className="text-[11px] leading-relaxed font-semibold">
            Gider kaydedilirken "Hakedişten Düş" seçeneği işaretlenirse, bu tutar dönem sonunda doğrudan ilişkili aracın hakediş hakedişinden düşülecektir.
          </p>
        </div>
      </div>

      {/* ADD FORM OVERLAY / IN-LINE PANEL */}
      {showAddForm && (
        <form 
          onSubmit={subTab === 'fuel' ? handleAddFuel : handleAddRepair} 
          className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4 animate-fade-in"
        >
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              {subTab === 'fuel' ? <Fuel className="w-4 h-4 text-amber-500" /> : <Wrench className="w-4 h-4 text-red-500" />}
              {subTab === 'fuel' ? 'Yeni Akaryakıt Fiş Girişi' : 'Yeni Araç Bakım/Arıza Fatura Girişi'}
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

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase">Araç Plaka</label>
              <select
                required
                value={selectedVehiclePlate}
                onChange={e => setSelectedVehiclePlate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold focus:outline-none"
              >
                <option value="">Seçiniz...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.plate}>{v.plate} ({v.brand})</option>
                ))}
              </select>
            </div>

            {subTab === 'fuel' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Litre</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Litre girin..."
                    value={liters}
                    onChange={e => setLiters(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Litre Fiyatı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pricePerLiter}
                    onChange={e => setPricePerLiter(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Servis Firması</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: BERKAYTUR Yetkili Servisi"
                    value={serviceShop}
                    onChange={e => setServiceShop(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Fatura Tutarı (₺)</label>
                  <input
                    type="number"
                    required
                    placeholder="Servis bedeli..."
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-extrabold text-slate-400 uppercase">Açıklama</label>
              <input
                type="text"
                placeholder={subTab === 'fuel' ? 'Yakıt istasyonu, fiş no vb.' : 'Değişen parçalar, işçilik detayları'}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold"
              />
            </div>
            
            {subTab === 'fuel' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-400 uppercase">Fiş No</label>
                <input
                  type="text"
                  placeholder="YKT-001"
                  value={receiptNo}
                  onChange={e => setReceiptNo(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-400 uppercase">Fatura No</label>
                <input
                  type="text"
                  placeholder="FTR-001"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono"
                />
              </div>
            )}
          </div>

          {/* Hakedişten Düş Checker */}
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/40">
            <input
              type="checkbox"
              id="deduct-checkbox"
              checked={deduct}
              onChange={e => setDeduct(e.target.checked)}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="deduct-checkbox" className="text-xs text-slate-700 font-extrabold cursor-pointer">
              ❌ Bu harcamayı ilgili araç sahibinin / şoförün hakedişinden düş (Mahsup et).
            </label>
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
              Kaydet
            </button>
          </div>
        </form>
      )}

      {/* DATA VIEW TABLES */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50">
        {subTab === 'fuel' ? (
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Son Yakıt Alım Ekstreleri</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-2">
                    <th className="pb-3">Tarih</th>
                    <th className="pb-3">Plaka</th>
                    <th className="pb-3">Miktar (Litre)</th>
                    <th className="pb-3">Litre Fiyatı</th>
                    <th className="pb-3">Toplam Tutar</th>
                    <th className="pb-3">Fiş / No</th>
                    <th className="pb-3">Mahsup Durumu</th>
                    <th className="pb-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {fuels.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="py-3 font-mono text-slate-500">{f.date}</td>
                      <td className="py-3 font-bold text-slate-800">{f.vehiclePlate}</td>
                      <td className="py-3 font-mono">{f.liters} L</td>
                      <td className="py-3 font-mono">{f.pricePerLiter.toLocaleString('tr-TR')} ₺</td>
                      <td className="py-3 font-mono font-black text-slate-900 text-sm">
                        {f.total.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="py-3 font-mono text-[10px] text-slate-400">{f.receiptNo}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.deductFromHakedis ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {f.deductFromHakedis ? 'HAKEDİŞTEN DÜŞECEK' : 'ŞİRKET GİDERİ'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteFuel(f.id, f.vehiclePlate, f.total)}
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
        ) : (
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Son Servis & Tamir Fatura Kayıtları</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-2">
                    <th className="pb-3">Tarih</th>
                    <th className="pb-3">Plaka</th>
                    <th className="pb-3">Bakım / Tamir Türü</th>
                    <th className="pb-3">Servis İstasyonu</th>
                    <th className="pb-3">Toplam Tutar</th>
                    <th className="pb-3">Fatura No</th>
                    <th className="pb-3">Mahsup Durumu</th>
                    <th className="pb-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {repairs.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="py-3 font-mono text-slate-500">{r.date}</td>
                      <td className="py-3 font-bold text-slate-800">{r.vehiclePlate}</td>
                      <td className="py-3 font-extrabold text-blue-600">{r.repairType}</td>
                      <td className="py-3">{r.serviceShop}</td>
                      <td className="py-3 font-mono font-black text-slate-900 text-sm">
                        {r.amount.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="py-3 font-mono text-[10px] text-slate-400">{r.invoiceNo}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.deductFromHakedis ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.deductFromHakedis ? 'HAKEDİŞTEN DÜŞECEK' : 'ŞİRKET GİDERİ'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteRepair(r.id, r.vehiclePlate, r.amount)}
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
        )}
      </div>

    </div>
  );
}
