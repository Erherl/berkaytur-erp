import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle, Database, AlertCircle, RefreshCw, 
  Play, Download, Server, Key, Eye, Clock, List, RefreshCcw
} from 'lucide-react';
import { ApiClient } from '../infrastructure/api/apiClient';

interface Stats {
  uptimeSeconds: number;
  nodeVersion: string;
  memoryHeapUsedMb: number;
  memoryHeapTotalMb: number;
  dbStorageSizeBytes: number;
  tablesCount: number;
  backupsCount: number;
  activeSessionsCount: number;
  apiHealthStatus: string;
  apiGatewayUptimePercent: number;
  jwtSecretConfigured: boolean;
  rateLimiterWindowMs: number;
  rateLimiterMaxRequests: number;
}

interface TableSummary {
  name: string;
  count: number;
  sizeBytes: number;
}

interface Backup {
  id: string;
  filename: string;
  timestamp: string;
  sizeBytes: number;
  createdBy: string;
}

interface TestResult {
  id: string;
  name: string;
  status: 'pass' | 'fail';
  desc: string;
}

export default function ProductionReadiness() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testRunSummary, setTestRunSummary] = useState<any | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const resStats = await ApiClient.fetchSystemStats();
      if (resStats.success && resStats.data) {
        setStats(resStats.data);
      }
      
      const resTables = await ApiClient.fetchDatabaseTables();
      if (resTables.success && resTables.data) {
        setTables(resTables.data);
      }

      const resBackups = await ApiClient.fetchBackups();
      if (resBackups.success && resBackups.data) {
        setBackups(resBackups.data);
      }
    } catch (e) {
      console.error('Error fetching readiness info:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRunTests = async () => {
    try {
      setLoadingTests(true);
      const res = await ApiClient.runTests();
      if (res.success && res.data) {
        const payload = res.data;
        setTests(payload.tests || []);
        setTestRunSummary({
          passed: payload.passedCount,
          total: payload.testsRun,
          timestamp: payload.timestamp
        });
      }
    } catch (e) {
      console.error('Test suite runner failed:', e);
    } finally {
      setLoadingTests(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupMessage(null);
      const res = await ApiClient.createBackup();
      if (res.success && res.data) {
        const payload = res.data;
        const filename = payload.backup?.filename || payload.filename || 'Yedek_Dosyasi';
        setBackupMessage(`Yedekleme Başarılı: ${filename}`);
        fetchStats();
      } else {
        setBackupMessage(res.error || 'Yedekleme işlemi başarısız oldu.');
      }
    } catch (e: any) {
      setBackupMessage('Bağlantı hatası: Yedekleme yapılamadı. ' + (e.message || ''));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`${filename} yedeğinden tüm sistemi geri yüklemek istediğinize emin misiniz? Bu işlem mevcut verileri değiştirecektir.`)) {
      return;
    }
    try {
      setRestoringFilename(filename);
      const res = await ApiClient.restoreBackup(filename);
      if (res.success) {
        alert(res.error || 'Geri yükleme tamamlandı!');
        fetchStats();
      } else {
        alert(res.error || 'Geri yükleme başarısız oldu.');
      }
    } catch (e: any) {
      alert('Geri yükleme sırasında ağ hatası oluştu: ' + (e.message || ''));
    } finally {
      setRestoringFilename(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}s ${mins}dk ${secs}sn`;
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      
      {/* Visual Elegant Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
          <Shield className="w-96 h-96" />
        </div>
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase text-emerald-400 tracking-wider">
            🛡️ Production-Ready Environment
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Canlıya Geçiş ve Sistem Mimarisi Konsolu
          </h2>
          <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
            Berkaytur Okul Servis Otomasyonu, demo / mock veri yapılarından arındırılmış; kriptografik JWT yetkilendirme, rate-limiting, Zod şema korumalı API'ler ve disk yedekleme rotasyonlarına sahip gerçek bir SaaS platformudur.
          </p>
          <div className="pt-2 flex flex-wrap gap-3 text-xs font-mono text-slate-400">
            <span>• Database Type: <strong className="text-white">Neon PostgreSQL (via Prisma)</strong></span>
            <span>• Auth Type: <strong className="text-white">JWT (HMAC-SHA256)</strong></span>
            <span>• Node Runtime: <strong className="text-white">{stats?.nodeVersion || 'v20'}</strong></span>
          </div>
        </div>
      </div>

      {/* Grid of live statistics and monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Live Container Performance Metrics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" /> Canlı Sistem İzleme
            </h3>
            <button 
              onClick={fetchStats} 
              disabled={loadingStats}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-all cursor-pointer"
              title="Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {stats ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-black block">RAM (Heap Used)</span>
                  <p className="text-sm font-extrabold text-slate-800">{stats.memoryHeapUsedMb} MB</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-black block">RAM (Total Allocated)</span>
                  <p className="text-sm font-extrabold text-slate-800">{stats.memoryHeapTotalMb} MB</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-black block">Server Uptime</span>
                  <p className="text-sm font-extrabold text-slate-800 truncate" title={formatUptime(stats.uptimeSeconds)}>
                    {formatUptime(stats.uptimeSeconds)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 uppercase font-black block">DB File Size</span>
                  <p className="text-sm font-extrabold text-slate-800">{formatBytes(stats.dbStorageSizeBytes)}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-500">API Gateway Durumu:</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {stats.apiHealthStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-500">Gereksiz HMR Hızı:</span>
                  <span className="font-mono text-slate-500">DEV MODE</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-500">Uptime Yüzdesi:</span>
                  <span className="font-mono font-bold text-slate-800">%{stats.apiGatewayUptimePercent}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-semibold italic text-center py-6">Sistem verileri alınamadı...</p>
          )}
        </div>

        {/* Panel 2: Secure Dynamic Database Tables Console (15 Tables) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" /> Kalıcı Veritabanı Tabloları (15 Tablo Şeması)
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Total Size: {stats ? formatBytes(stats.dbStorageSizeBytes) : '0 KB'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[170px] overflow-y-auto scrollbar-thin text-xs">
            {tables.length > 0 ? (
              tables.map(table => (
                <div key={table.name} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-extrabold text-slate-800 text-[11px] truncate capitalize" title={table.name}>
                    📂 {table.name}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>Count: <strong className="text-slate-700">{table.count}</strong></span>
                    <span>{formatBytes(table.sizeBytes)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-xs text-slate-400 italic text-center py-6">Tablo bilgileri yükleniyor...</p>
            )}
          </div>
        </div>

      </div>

      {/* Grid for Backups & Automated Testing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Panel A: Backups Rotation & Recovery Console */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Yerel Disk Yedekleme & Felaket Kurtarma (Disaster Recovery)
            </h3>
            <button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
            >
              {isBackingUp ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Anlık Yedek Al
            </button>
          </div>

          {backupMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-[11px] font-bold">
              ✅ {backupMessage}
            </div>
          )}

          <div className="space-y-2 text-xs max-h-[220px] overflow-y-auto scrollbar-thin">
            {backups.length > 0 ? (
              backups.map(backup => (
                <div key={backup.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 truncate max-w-[200px]" title={backup.filename}>
                      💾 {backup.filename}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">Tarih: {backup.timestamp} • Boyut: {formatBytes(backup.sizeBytes)}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreBackup(backup.filename)}
                    disabled={restoringFilename !== null}
                    className="px-2.5 py-1 text-[10px] bg-slate-200 text-slate-800 hover:bg-rose-600 hover:text-white rounded-lg font-bold transition-all cursor-pointer"
                  >
                    {restoringFilename === backup.filename ? 'Kurtarılıyor...' : 'Yedekten Dön'}
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <p className="text-slate-400 italic font-semibold">Henüz alınmış bir sistem yedeği bulunmuyor.</p>
                <p className="text-[10px] text-slate-400">Gelişmiş veri güvenliği için sağ üstten ilk yedeğinizi alın.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel B: Live API Automated Test Suite Runner (Saves manual checking, ensures production quality) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600" /> Otomatik Test Suite Koşturucu (Self-Healing Tests)
            </h3>
            <button
              onClick={handleRunTests}
              disabled={loadingTests}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              {loadingTests ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-white" />}
              Testleri Çalıştır
            </button>
          </div>

          {testRunSummary && (
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 flex items-center justify-between text-xs font-bold font-mono">
              <span>Test Sonucu: {testRunSummary.passed} / {testRunSummary.total} BAŞARILI</span>
              <span className="text-[10px] text-blue-500 font-medium">Saat: {testRunSummary.timestamp}</span>
            </div>
          )}

          <div className="space-y-2 text-xs max-h-[220px] overflow-y-auto scrollbar-thin">
            {tests.length > 0 ? (
              tests.map(test => (
                <div key={test.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <span className="text-emerald-500 font-extrabold text-sm pt-0.5">✓</span>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-800 text-[11px]">{test.name}</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{test.desc}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <p className="text-slate-400 italic font-semibold">Test suite hazır.</p>
                <p className="text-[10px] text-slate-400">Tek tıkla API'lerin, kimlik doğrulamanın ve şemaların testlerini çalıştırabilirsiniz.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Production Guidelines and Best Practices */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs leading-relaxed">
        <h3 className="font-extrabold text-sm text-slate-900 uppercase">Güvenli Canlı Operasyon Bilgileri</h3>
        <p className="text-slate-500">
          Bu entegrasyon, projenizin üretim aşamasına (Production) hazır olmasını garantilemek için sunucu tarafında bulut tabanlı ilişkisel Neon PostgreSQL veritabanı (Prisma ORM ile entegre) kullanır. Bu sayede tarayıcı konsolundan, Zustand state manipülasyonuyla sisteme yetkisiz veri eklenmesi kesinlikle engellenmiştir.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 font-medium text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-mono text-[11px]">
          <div className="space-y-1">
            <p className="text-slate-900 font-bold uppercase text-[10px] text-blue-600">Veri Güvenliği</p>
            <p>• Tüm veriler sunucu tarafında Neon PostgreSQL veritabanında saklanır.</p>
            <p>• Parolalar veritabanına asla düz metin yazılmaz, Argon2 ile hashlenir.</p>
            <p>• Zod kütüphanesiyle plaka ve kapasite doğrulaması yapılır.</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-900 font-bold uppercase text-[10px] text-purple-600">Altyapı Güvenceleri</p>
            <p>• express-rate-limit mekanizmasıyla brute-force engellenmiştir.</p>
            <p>• Otomatik yedekleme ve SSL bağlantı havuzuyla korunmaktadır.</p>
            <p>• JWT yetkilendirme katmanıyla şoför ve veli rolleri ayrıştırılmıştır.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
