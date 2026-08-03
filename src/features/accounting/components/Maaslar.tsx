/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { 
  Users, UserCheck, ShieldCheck, Landmark, DollarSign,
  TrendingUp, Download, CheckCircle2, Search, ArrowUpRight
} from 'lucide-react';

export default function Maaslar() {
  const { users, vehicles, addLog } = useAppStore();
  const [subTab, setSubTab] = useState<'driver' | 'hostess' | 'supplier'>('driver');
  const [search, setSearch] = useState('');

  const drivers = users.filter(u => u.role === 'driver');
  const hostesses = users.filter(u => u.role === 'hostess');

  // Supplier companies
  const suppliers = [
    { id: 'sup1', name: 'BERKAYTUR A Bölgesi Ortaklığı', manager: 'Hasan Saygılı', phone: '0532 555 12 34', bank: 'Vakıfbank', iban: 'TR90 0001 5001 2007 0001 1234 56', totalVehicles: 3, totalHakedis: 74200, status: 'Onaylandı' },
    { id: 'sup2', name: 'BERKAYTUR B Bölgesi Ortaklığı', manager: 'Kemal Sönmez', phone: '0533 444 88 99', bank: 'Ziraat Bankası', iban: 'TR44 0001 2003 4005 0002 9876 54', totalVehicles: 5, totalHakedis: 118400, status: 'Bekliyor' },
    { id: 'sup3', name: 'Akıncı Turizm Taşımacılık', manager: 'Selahattin Akıncı', phone: '0544 333 22 11', bank: 'Garanti BBVA', iban: 'TR12 0006 2000 1111 2222 3333 44', totalVehicles: 2, totalHakedis: 46100, status: 'Ödendi' }
  ];

  // Load rates or set realistic defaults
  const dailyDriverRate = Number(localStorage.getItem('bkt_daily_driver_rate')) || 1200;
  const dailyHostessRate = Number(localStorage.getItem('bkt_daily_hostess_rate')) || 800;

  // Track paid status locally or in localStorage
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>(() => {
    return JSON.parse(localStorage.getItem('bkt_salaries_paid_status') || '{}');
  });

  const handlePayStaff = (id: string, name: string, role: string, amount: number) => {
    const updated = { ...paidStatus, [id]: true };
    setPaidStatus(updated);
    localStorage.setItem('bkt_salaries_paid_status', JSON.stringify(updated));
    addLog('Maaş Ödemesi Yapıldı', `${role} ${name} için ${amount.toLocaleString('tr-TR')} ₺ tutarındaki maaş ödemesi bankadan transfer edildi.`);
    alert(`${name} isimli personelin maaş ödemesi başarıyla yapıldı. Banka dekontu Google Drive'a kaydedildi.`);
  };

  const handlePaySupplier = (supId: string, name: string, amount: number) => {
    const updated = { ...paidStatus, [supId]: true };
    setPaidStatus(updated);
    localStorage.setItem('bkt_salaries_paid_status', JSON.stringify(updated));
    addLog('Tedarikçi Ödemesi Yapıldı', `${name} tedarikçisi için ${amount.toLocaleString('tr-TR')} ₺ cari hakediş ödemesi tamamlandı.`);
    alert(`${name} tedarikçi hakediş ödemesi başarıyla gerçekleştirildi. Excel ekstresi ve tediye fişi Google Drive'a işlendi.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Maaş & Tedarikçi Hakediş Yönetimi</h2>
          <p className="text-slate-500 text-xs font-semibold">Tüm sürücü, hostes ve alt tedarikçilerin net cari ödeme onayları.</p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => { setSubTab('driver'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'driver' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sürücü Maaşları
          </button>
          <button
            onClick={() => { setSubTab('hostess'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'hostess' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hostes Maaşları
          </button>
          <button
            onClick={() => { setSubTab('supplier'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'supplier' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tedarikçi Ödemeleri
          </button>
        </div>
      </div>

      {/* SEARCH BOX */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none w-4 h-4 my-auto" />
          <input
            type="text"
            placeholder="İsim veya telefon ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold focus:outline-none"
          />
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
          {subTab === 'driver' ? 'Toplam Sürücü: ' + drivers.length : subTab === 'hostess' ? 'Toplam Hostes: ' + hostesses.length : 'Toplam Tedarikçi: ' + suppliers.length}
        </span>
      </div>

      {/* RENDERING TABLES */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50">
        {subTab === 'driver' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <th className="pb-3">Sürücü Personel</th>
                  <th className="pb-3">Telefon / E-posta</th>
                  <th className="pb-3">Araç Plaka</th>
                  <th className="pb-3">Çalışılan Gün</th>
                  <th className="pb-3">Maaş Tutarı</th>
                  <th className="pb-3">Banka Bilgisi</th>
                  <th className="pb-3 text-right">Maaş Ödeme Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {drivers
                  .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
                  .map(d => {
                    const isPaid = paidStatus[d.id] || false;
                    const v = vehicles.find(veh => veh.driverId === d.id) || vehicles[0];
                    const workedDays = d.id === 'u4' ? 24 : 25;
                    const grossSalary = workedDays * dailyDriverRate;

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-slate-800">{d.name}</p>
                          <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Kadrolu Şoför</span>
                        </td>
                        <td className="py-4">
                          <p className="text-slate-700">{d.phone}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{d.email}</p>
                        </td>
                        <td className="py-4 font-mono font-bold text-slate-800">{v?.plate || '06 BKT 123'}</td>
                        <td className="py-4 font-mono font-bold text-slate-800">{workedDays} Gün</td>
                        <td className="py-4 font-mono font-black text-slate-900 text-sm">
                          {grossSalary.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-4 font-mono text-[10px] text-slate-400 font-semibold">
                          <span className="font-extrabold text-slate-700 block">Garanti BBVA</span>
                          TR56 0006 2000 1234 5678 9012 34
                        </td>
                        <td className="py-4 text-right">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ÖDENDİ
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePayStaff(d.id, d.name, 'Sürücü', grossSalary)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold tracking-wide cursor-pointer transition-colors"
                            >
                              Maaş Öde
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'hostess' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <th className="pb-3">Rehber Hostes</th>
                  <th className="pb-3">Telefon / E-posta</th>
                  <th className="pb-3">Araç Plaka</th>
                  <th className="pb-3">Çalışılan Gün</th>
                  <th className="pb-3">Maaş Tutarı</th>
                  <th className="pb-3">Banka Bilgisi</th>
                  <th className="pb-3 text-right">Maaş Ödeme Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {hostesses
                  .filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
                  .map(h => {
                    const isPaid = paidStatus[h.id] || false;
                    const v = vehicles.find(veh => veh.hostessId === h.id) || vehicles[0];
                    const workedDays = h.id === 'u5' ? 24 : 26;
                    const grossSalary = workedDays * dailyHostessRate;

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-slate-800">{h.name}</p>
                          <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">Rehber Personel</span>
                        </td>
                        <td className="py-4">
                          <p className="text-slate-700">{h.phone}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{h.email}</p>
                        </td>
                        <td className="py-4 font-mono font-bold text-slate-800">{v?.plate || '06 BKT 123'}</td>
                        <td className="py-4 font-mono font-bold text-slate-800">{workedDays} Gün</td>
                        <td className="py-4 font-mono font-black text-slate-900 text-sm">
                          {grossSalary.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-4 font-mono text-[10px] text-slate-400 font-semibold">
                          <span className="font-extrabold text-slate-700 block">Yapı Kredi</span>
                          TR12 0003 3000 9876 5432 1012 34
                        </td>
                        <td className="py-4 text-right">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ÖDENDİ
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePayStaff(h.id, h.name, 'Rehber', grossSalary)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold tracking-wide cursor-pointer transition-colors"
                            >
                              Maaş Öde
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'supplier' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <th className="pb-3">Tedarikçi Firma / Yetkili</th>
                  <th className="pb-3">İletişim</th>
                  <th className="pb-3">Araç Sayısı</th>
                  <th className="pb-3">Hakediş Tutarı</th>
                  <th className="pb-3">Banka IBAN Detayı</th>
                  <th className="pb-3 text-right">Cari Ödeme Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {suppliers
                  .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
                  .map(s => {
                    const isPaid = paidStatus[s.id] || false;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Müdür: {s.manager}</p>
                        </td>
                        <td className="py-4 text-slate-700">{s.phone}</td>
                        <td className="py-4 font-mono font-bold text-slate-800 text-center">{s.totalVehicles} Araç</td>
                        <td className="py-4 font-mono font-black text-slate-900 text-sm">
                          {s.totalHakedis.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-4 font-mono text-[10px] text-slate-400 font-semibold">
                          <span className="font-extrabold text-slate-700 block">{s.bank}</span>
                          {s.iban}
                        </td>
                        <td className="py-4 text-right">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ÖDENDİ
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePaySupplier(s.id, s.name, s.totalHakedis)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold tracking-wide cursor-pointer transition-colors"
                            >
                              Hakediş Öde
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
