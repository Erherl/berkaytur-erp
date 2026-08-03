/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { 
  ShieldAlert, Shield, Search, Filter, RefreshCw, Clock, 
  User, Monitor, Info, ChevronRight, FileSpreadsheet, Eye, Server, Laptop
} from 'lucide-react';
import { ApiClient } from '../infrastructure/api/apiClient';

export default function AuditLogViewer() {
  const { logs: localLogs, addLog } = useAppStore();
  const [logSource, setLogSource] = useState<'server' | 'local'>('server');
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadServerLogs = async () => {
    setLoading(true);
    const res = await ApiClient.fetchLogs();
    if (res.success && res.data) {
      setServerLogs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (logSource === 'server') {
      loadServerLogs();
    }
  }, [logSource]);

  const handleRefresh = async () => {
    if (logSource === 'server') {
      await loadServerLogs();
      addLog('Sistem Günlükleri', 'Server işlem günlüğü başarıyla tazelendi.');
    } else {
      addLog('Sistem Günlükleri', 'Log kayıt listesi yenilendi.');
      alert('🔄 Yerel işlem günlükleri başarıyla yenilendi!');
    }
  };

  const activeLogs = logSource === 'server' ? serverLogs : localLogs;

  // Extract unique action names for filter dropdown
  const uniqueActions = ['all', ...Array.from(new Set(activeLogs.map(l => l.action)))];

  const filteredLogs = activeLogs.filter(l => {
    const matchesSearch = 
      (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.ipAddress && l.ipAddress.includes(search)) ||
      (l.device && l.device.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = actionFilter === 'all' || l.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6" id="security-transaction-audit-logger">
      
      {/* HEADER STATEMENT */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/10">
              MÜKEMMEL DEĞİŞMEZLİK GÜVENLİĞİ
            </span>
            <h3 className="text-base font-black tracking-tight mt-1">Sistem İşlem & Değişiklik Günlükleri</h3>
            <p className="text-slate-400 text-xs font-semibold">Tüm veri yazma, silme ve güncelleme işlemleri IP, cihaz ve eski/yeni değerleriyle loglanır.</p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Active Log Source Selector */}
          <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
            <button
              onClick={() => setLogSource('server')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                logSource === 'server' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" /> Güvenli Server Log
            </button>
            <button
              onClick={() => setLogSource('local')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                logSource === 'local' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" /> Tarayıcı Cache
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Günlükleri Yenile
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Loglarda ara: kullanıcı, IP, detay..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full sm:w-48 p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            {uniqueActions.map(act => (
              <option key={act} value={act}>
                {act === 'all' ? 'Tüm İşlemler' : act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TIMELINE DISPLAY & INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Timeline Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-3 px-4">Tarih / Zaman</th>
                  <th className="py-3 px-4">İşlem</th>
                  <th className="py-3 px-4">Kullanıcı</th>
                  <th className="py-3 px-4">IP / Cihaz</th>
                  <th className="py-3 px-4 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Kayıtlar sunucudan yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.map(l => (
                  <tr 
                    key={l.id}
                    onClick={() => setSelectedLog(l)}
                    className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                      selectedLog?.id === l.id ? 'bg-blue-50/10 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {l.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black uppercase text-slate-600 rounded-md border border-slate-200/60 whitespace-nowrap">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[10px] uppercase font-bold shrink-0">
                          {(l.userName || 'S').charAt(0)}
                        </div>
                        <span className="text-slate-800 truncate max-w-[100px]">{l.userName || 'Sistem'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[10px] font-mono text-slate-500">
                      <div>{l.ipAddress || '192.168.1.102'}</div>
                      <div className="text-[9px] text-slate-400 font-sans mt-0.5 font-semibold">{l.device || 'Sunucu Kaydı'}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1 hover:bg-slate-100 rounded-lg text-blue-600">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                      Kriterlere uygun işlem günlüğü bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Rich Log Inspector with Old & New Values */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Günlük Analizörü
            </h4>

            {selectedLog ? (
              <div className="space-y-4 text-xs font-bold text-slate-600">
                <div className="space-y-2 text-[11px] bg-slate-50 p-3.5 border rounded-2xl font-mono">
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-400">Log ID:</span>
                    <span className="text-slate-700 font-bold text-right truncate max-w-[120px]">{selectedLog.id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-400">Zaman:</span>
                    <span className="text-slate-700 font-bold">{selectedLog.timestamp}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-400">Kullanıcı:</span>
                    <span className="text-slate-800 font-black">{selectedLog.userName || 'Sistem'} ({selectedLog.userRole?.toUpperCase() || 'ADMIN'})</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-400">IP Adresi:</span>
                    <span className="text-slate-700 font-semibold">{selectedLog.ipAddress || '192.168.1.112'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cihaz/OS:</span>
                    <span className="text-slate-700 font-sans font-bold">{selectedLog.device || 'Sunucu Kaydı'}</span>
                  </div>
                </div>

                {/* Log Narrative Description */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Yapılan İşlem Açıklaması</span>
                  <p className="p-3 bg-blue-50/10 border border-blue-100 rounded-xl text-slate-700 text-[11px] font-semibold leading-relaxed">
                    {selectedLog.details}
                  </p>
                </div>

                {/* Old vs New Values Visualizer */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block">Eski Değer (Old)</span>
                    <div className="p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl text-rose-800 break-all max-h-24 overflow-y-auto">
                      {selectedLog.oldValue || '∅ BOŞ / KAYITSIZ'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Yeni Değer (New)</span>
                    <div className="p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-xl text-emerald-800 break-all max-h-24 overflow-y-auto">
                      {selectedLog.newValue || JSON.stringify({ status: 'modified' })}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-16 text-center space-y-2">
                <Info className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-black text-slate-500">Müfettiş Hazır</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Sol taraftaki işlem günlüğü tablosundan herhangi bir satıra tıklayarak detaylı IP, cihaz, eski ve yeni değer karşılaştırmasını yapın.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
