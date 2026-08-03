/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppStore } from '../../../store';
import { 
  DollarSign, TrendingUp, CreditCard, Clock, 
  ArrowUpRight, ArrowDownRight, Calendar, Activity, CheckSquare
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

export default function DashboardHome() {
  const { payments, students, vehicles, logs } = useAppStore();

  const today = new Date();
  const formattedDate = today.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // KPI Calculations
  const totalCollections = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCollections = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const overdueCollections = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  // Chart Data preparation
  const chartData = [
    { name: 'Nisan', Gelir: 45000, Gider: 31000, Net: 14000 },
    { name: 'Mayıs', Gelir: 52000, Gider: 33000, Net: 19000 },
    { name: 'Haziran', Gelir: 58000, Gider: 35000, Net: 23000 },
    { name: 'Temmuz', Gelir: totalCollections || 64000, Gider: 38000, Net: (totalCollections || 64000) - 38000 }
  ];

  const transactionData = payments.slice(0, 4);

  return (
    <div id="accounting-dashboard-home-upgraded" className="space-y-6 animate-fade-in">
      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white border border-slate-200 p-6 rounded-3xl gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Muhasebe & Finansal Kontrol Paneli</h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">Berkaytur A.Ş. • Canlı Finansal Göstergeler</p>
        </div>
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-xs font-bold font-mono">
          <Calendar className="w-4 h-4 text-blue-600" />
          {formattedDate}
        </div>
      </div>

      {/* Financial KPI Cards Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Collections Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">TOPLAM TAHSİLAT</span>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{(totalCollections || 0).toLocaleString('tr-TR')} TL</p>
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>%12.4 AY SEYRİ ARTIŞ</span>
            </div>
          </div>
        </div>

        {/* Overdue/Geciken Collections Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">GECİKEN TAHSİLATLAR</span>
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{(overdueCollections || 0).toLocaleString('tr-TR')} TL</p>
            <div className="flex items-center gap-1 text-rose-600 text-[10px] font-black mt-2">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>TAKİBE SEVK EDİLECEK</span>
            </div>
          </div>
        </div>

        {/* Pending/Bekleyen Collections Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">BEKLEYEN TAHSİLATLAR</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{(pendingCollections || 0).toLocaleString('tr-TR')} TL</p>
            <div className="flex items-center gap-1 text-blue-600 text-[10px] font-black mt-2">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>DÜZENLİ VADE BAZLI</span>
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">NET KASA FAALİYETİ</span>
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{((totalCollections || 64000) - 38000).toLocaleString('tr-TR')} TL</p>
            <div className="flex items-center gap-1 text-purple-600 text-[10px] font-black mt-2">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>FİRMA CARİ MUTABAKATI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Gelir & Gider Dönemsel Seyri</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Aylık finansal akış analiz tablosu (TL)</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="Gelir" stroke="#10b981" fillOpacity={1} fill="url(#colorGelir)" strokeWidth={2} />
                <Area type="monotone" dataKey="Gider" stroke="#ef4444" fillOpacity={1} fill="url(#colorGider)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Financial Transactions & Logs */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Son Cari İşlemler</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Sistemde gerçekleştirilen son 4 hakediş/tahsilat</p>
          </div>
          <div className="space-y-3.5">
            {transactionData.map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                <div className="space-y-0.5 leading-none">
                  <p className="text-xs font-black text-slate-800">{tx.studentName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tx.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-900 font-mono">{tx.amount.toLocaleString('tr-TR')} TL</p>
                  <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mt-1 ${
                    tx.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                    tx.status === 'pending' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {tx.status === 'paid' ? 'Tahsil Edildi' :
                     tx.status === 'pending' ? 'Bekliyor' : 'Gecikti'}
                  </span>
                </div>
              </div>
            ))}
            {transactionData.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                Henüz bir cari işlem kaydı bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
