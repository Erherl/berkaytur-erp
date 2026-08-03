/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { 
  Database, FileSpreadsheet, RefreshCw, CheckCircle, 
  Settings, Copy, ArrowRight, Download, Upload, 
  HelpCircle, AlertTriangle, FileText, Info, ShieldAlert,
  Edit3, Play, Sparkles
} from 'lucide-react';
import { generateStrongPassword } from '../../../utils/security';

export default function GoogleSheetsSync() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<'students' | 'vehicles' | 'schools' | 'users' | 'payments'>('students');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [pasteData, setPasteData] = useState('');
  const [pastedHeaders, setPastedHeaders] = useState<string[]>([]);
  const [pastedRows, setPastedRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    total: number;
    errors: string[];
  } | null>(null);

  // Settings
  const [sheetsUrl, setSheetsUrl] = useState(store.settings.googleSheetsUrl || '');
  const [driveId, setDriveId] = useState(store.settings.googleDriveFolderId || '');
  const [isCopied, setIsCopied] = useState(false);
  
  // Real-time edited cells in visual sheets simulator
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Webhook Origin URL
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/sheets-webhook`
    : 'https://ais-dev-gyqfzcco75n5qd2jzlgadk-986793501698.europe-west2.run.app/api/sheets-webhook';

  const appsScriptCode = `/**
 * Berkaytur Google Sheets Bi-Directional Realtime Webhook Sync Script
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. Replace the WEBHOOK_URL variable with your system endpoint if different.
 * 5. Click Save (disk icon) and then Trigger (clock icon) to run onEdit.
 */

var WEBHOOK_URL = "${webhookUrl}";

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();
    var value = range.getValue();
    var sheetName = sheet.getName();
    
    // Skip header edits
    if (row === 1) return;
    
    // Get the header names and full row values to construct accurate entity
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
    
    var payload = {
      sheetName: sheetName,
      row: row,
      col: col,
      value: value,
      rowData: rowData,
      headers: headers,
      timestamp: new Date().toISOString()
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (error) {
    Logger.log("Error in onEdit sync: " + error.toString());
  }
}

/**
 * Creates custom menu inside Google Sheets for manual full-sync pushing
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Berkaytur Sync")
    .addItem("Tüm Tabloları Programa Gönder", "pushFullSync")
    .addToUi();
}

function pushFullSync() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var syncData = {};
  
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      syncData[name] = {
        headers: values[0],
        rows: values.slice(1)
      };
    }
  });
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ type: "full_sync", data: syncData }),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  SpreadsheetApp.getUi().alert("Senkronizasyon Başarılı: " + response.getContentText());
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveSettings = () => {
    store.updateSettings({
      googleSheetsUrl: sheetsUrl,
      googleDriveFolderId: driveId
    });
    store.addLog('Google Sheets Entegrasyonu', 'Google Apps Script ve Drive parametreleri güncellendi.');
    alert('✅ Google Entegrasyon Ayarları Başarıyla Kaydedildi.');
  };

  const handleFullSync = async () => {
    setSyncing(true);
    setSyncProgress(25);
    store.addLog('Sync Başladı', 'Google Sheets bi-directional sync başlatıldı...');
    
    try {
      setSyncProgress(50);
      const res = await fetch('/api/v1/sheets-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full_sync', source: 'GoogleSheetsSync' })
      });
      const data = await res.json();
      setSyncProgress(100);
      setSyncing(false);

      if (data.success) {
        store.updateSettings({ lastBackupTime: new Date().toLocaleString() });
        store.addLog('Sync Durum', data.message);
        alert(`🎉 ${data.message}`);
      } else {
        store.addLog('Sync Hata', data.message);
        alert(`⚠️ Google Sheets Senkronizasyon Uyarısı:\n${data.message}`);
      }
    } catch (err: any) {
      setSyncing(false);
      store.addLog('Sync Hata', err.message);
      alert(`❌ Eşitleme Bağlantı Hatası: ${err.message}`);
    }
  };

  // Immediate edit inside simulation triggers instant system state modification
  const handleSheetCellChange = (rowId: string, field: string, newValue: string) => {
    if (activeTab === 'students') {
      const parsedFields: any = {};
      if (field === 'name') parsedFields.name = newValue;
      if (field === 'classLevel') parsedFields.classLevel = newValue;
      if (field === 'parentPhone') parsedFields.parentPhone = newValue;
      if (field === 'parentName') parsedFields.parentName = newValue;
      if (field === 'studentNumber') parsedFields.studentNumber = newValue;
      store.updateStudent(rowId, parsedFields);
      store.addLog('Sheets Simülatör Düzenleme', `Google Sheets üzerinden öğrenci "${newValue}" anında güncellendi.`);
    } else if (activeTab === 'vehicles') {
      const parsedFields: any = {};
      if (field === 'plate') parsedFields.plate = newValue;
      if (field === 'brand') parsedFields.brand = newValue;
      if (field === 'model') parsedFields.model = newValue;
      if (field === 'capacity') parsedFields.capacity = Number(newValue);
      store.updateVehicle(rowId, parsedFields);
      store.addLog('Sheets Simülatör Düzenleme', `Google Sheets üzerinden araç "${newValue}" anında güncellendi.`);
    } else if (activeTab === 'schools') {
      const parsedFields: any = {};
      if (field === 'name') parsedFields.name = newValue;
      if (field === 'address') parsedFields.address = newValue;
      if (field === 'phone') parsedFields.phone = newValue;
      store.updateSchool(rowId, parsedFields);
      store.addLog('Sheets Simülatör Düzenleme', `Google Sheets üzerinden okul "${newValue}" anında güncellendi.`);
    } else if (activeTab === 'users') {
      const parsedFields: any = {};
      if (field === 'name') parsedFields.name = newValue;
      if (field === 'phone') parsedFields.phone = newValue;
      if (field === 'email') parsedFields.email = newValue;
      store.updateUser(rowId, parsedFields);
      store.addLog('Sheets Simülatör Düzenleme', `Google Sheets üzerinden kullanıcı "${newValue}" anında güncellendi.`);
    }
    setEditingCell(null);
  };

  // Real copy-paste TSV parser
  const handleParsePaste = () => {
    if (!pasteData.trim()) return;
    
    const lines = pasteData.trim().split('\n');
    if (lines.length < 2) {
      alert('Hata: En az bir başlık satırı ve bir veri satırı bulunmalıdır.');
      return;
    }

    // Detect column separator (Tab for Excel, Semicolon or Comma for CSV)
    const firstLine = lines[0];
    let separator = '\t';
    if (firstLine.includes(';')) separator = ';';
    else if (firstLine.includes(',') && !firstLine.includes('\t')) separator = ',';

    const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      return line.split(separator).map(val => val.trim().replace(/^"|"$/g, ''));
    });

    setPastedHeaders(headers);
    setPastedRows(rows);
    setImportResult(null);
  };

  const handleExecuteImport = () => {
    if (pastedRows.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // Columns mapping
    if (activeTab === 'students') {
      pastedRows.forEach((row, idx) => {
        try {
          const numberIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('no') || h.toLowerCase().includes('numara'));
          const nameIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('ad') || h.toLowerCase().includes('isim'));
          const classIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('sınıf') || h.toLowerCase().includes('sube'));
          const schoolIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('okul'));
          const parentIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('veli'));
          const phoneIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('tel') || h.toLowerCase().includes('telefon'));

          const studentNo = numberIdx !== -1 ? row[numberIdx] : `STN-${100 + idx}`;
          const studentName = nameIdx !== -1 ? row[nameIdx] : '';
          const classLevel = classIdx !== -1 ? row[classIdx] : 'Belirtilmedi';
          const parentName = parentIdx !== -1 ? row[parentIdx] : 'Veli';
          const parentPhone = phoneIdx !== -1 ? row[phoneIdx] : '0555 000 00 00';
          
          if (!studentName) {
            errors.push(`Satır ${idx + 2}: Öğrenci Adı alanı boş olamaz.`);
            return;
          }

          // Check if exists
          const existing = store.students.find(s => s.studentNumber === studentNo || s.name.toLowerCase() === studentName.toLowerCase());
          if (existing) {
            store.updateStudent(existing.id, {
              classLevel,
              parentName,
              parentPhone
            });
            updatedCount++;
          } else {
            store.addStudent({
              name: studentName,
              studentNumber: studentNo,
              classLevel,
              schoolId: 's1', // Default
              schoolName: 'SEVİNÇ',
              parentName,
              parentPhone,
              latitude: 41.025,
              longitude: 29.155
            });
            addedCount++;
          }
        } catch (err: any) {
          errors.push(`Satır ${idx + 2}: ${err.message}`);
        }
      });
    } else if (activeTab === 'vehicles') {
      pastedRows.forEach((row, idx) => {
        try {
          const plateIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('plaka'));
          const brandIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('marka'));
          const modelIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('model'));
          const capIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('kapasite') || h.toLowerCase().includes('koltuk'));

          const plate = plateIdx !== -1 ? row[plateIdx] : '';
          const brand = brandIdx !== -1 ? row[brandIdx] : 'Bilinmeyen';
          const model = modelIdx !== -1 ? row[modelIdx] : 'Araç';
          const capacity = capIdx !== -1 ? Number(row[capIdx]) || 19 : 19;

          if (!plate) {
            errors.push(`Satır ${idx + 2}: Plaka alanı boş olamaz.`);
            return;
          }

          const existing = store.vehicles.find(v => v.plate.replace(/\s+/g, '').toLowerCase() === plate.replace(/\s+/g, '').toLowerCase());
          if (existing) {
            store.updateVehicle(existing.id, { brand, model, capacity });
            updatedCount++;
          } else {
            store.addVehicle({
              plate,
              brand,
              model,
              capacity,
              status: 'active'
            });
            addedCount++;
          }
        } catch (err: any) {
          errors.push(`Satır ${idx + 2}: ${err.message}`);
        }
      });
    } else if (activeTab === 'schools') {
      pastedRows.forEach((row, idx) => {
        try {
          const nameIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('okul') || h.toLowerCase().includes('ad'));
          const addrIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('adres'));
          const phoneIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('tel') || h.toLowerCase().includes('telefon'));

          const name = nameIdx !== -1 ? row[nameIdx] : '';
          const address = addrIdx !== -1 ? row[addrIdx] : 'Adres Tanımsız';
          const phone = phoneIdx !== -1 ? row[phoneIdx] : '0555 111 22 33';

          if (!name) {
            errors.push(`Satır ${idx + 2}: Okul Adı boş olamaz.`);
            return;
          }

          const existing = store.schools.find(s => s.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            store.updateSchool(existing.id, { address, phone });
            updatedCount++;
          } else {
            store.addSchool({ name, address, phone, email: 'okul@berkaytur.com' });
            addedCount++;
          }
        } catch (err: any) {
          errors.push(`Satır ${idx + 2}: ${err.message}`);
        }
      });
    } else if (activeTab === 'users') {
      pastedRows.forEach((row, idx) => {
        try {
          const nameIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('ad') || h.toLowerCase().includes('isim'));
          const roleIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('rol'));
          const userIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('kullanıcı') || h.toLowerCase().includes('username'));
          const passIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('şifre') || h.toLowerCase().includes('parola'));
          const phoneIdx = pastedHeaders.findIndex(h => h.toLowerCase().includes('tel') || h.toLowerCase().includes('telefon'));

          const name = nameIdx !== -1 ? row[nameIdx] : '';
          const role = roleIdx !== -1 ? row[roleIdx].toLowerCase() : 'parent';
          const username = userIdx !== -1 ? row[userIdx] : `user_${Date.now()}`;
          const password = passIdx !== -1 && row[passIdx] ? row[passIdx] : generateStrongPassword();
          const phone = phoneIdx !== -1 ? row[phoneIdx] : '0555 111 22 33';

          if (!name) {
            errors.push(`Satır ${idx + 2}: İsim boş olamaz.`);
            return;
          }

          const existing = store.users.find(u => u.username.toLowerCase() === username.toLowerCase());
          if (existing) {
            store.updateUser(existing.id, { name, phone });
            updatedCount++;
          } else {
            store.addUser({
              name,
              role: role as any,
              username,
              password,
              phone,
              email: `${username}@berkaytur.com`,
              status: 'active'
            });
            addedCount++;
          }
        } catch (err: any) {
          errors.push(`Satır ${idx + 2}: ${err.message}`);
        }
      });
    }

    setImportResult({
      added: addedCount,
      updated: updatedCount,
      total: pastedRows.length,
      errors
    });

    store.addLog('Sheets İçe Aktar', `Google Sheets kopyala-yapıştır üzerinden ${addedCount} kayıt eklendi, ${updatedCount} kayıt güncellendi.`);
    
    // Reset paste previews
    setPasteData('');
    setPastedHeaders([]);
    setPastedRows([]);
  };

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let sampleData: string[] = [];
    let filename = '';

    if (activeTab === 'students') {
      headers = ['Öğrenci No', 'Adı Soyadı', 'Sınıfı', 'Okul Adı', 'Veli Adı', 'Veli Telefonu'];
      sampleData = ['421', 'Ali Yılmaz', '4-B', 'SEVİNÇ', 'Kamil Yılmaz', '0532 999 88 77'];
      filename = 'ogrenci_sablonu.csv';
    } else if (activeTab === 'vehicles') {
      headers = ['Plaka', 'Marka', 'Model', 'Kapasite'];
      sampleData = ['06 BKT 123', 'Mercedes-Benz', 'Sprinter 2023', '19'];
      filename = 'arac_sablonu.csv';
    } else if (activeTab === 'schools') {
      headers = ['Okul Adı', 'Adres', 'Telefon'];
      sampleData = ['Sevinç Koleji', 'Çankaya, Ankara', '0312 444 55 66'];
      filename = 'okul_sablonu.csv';
    } else if (activeTab === 'users') {
      headers = ['İsim Soyadı', 'Rol', 'Kullanıcı Adı', 'Şifre', 'Telefon'];
      sampleData = ['Ahmet Yılmaz', 'driver', 'ahmet_sofor', '123', '0555 444 55 66'];
      filename = 'personel_sablonu.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(';') + '\n' 
      + sampleData.join(';');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      
      {/* 1. Header & Live Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600">
              <FileSpreadsheet className="w-6 h-6" />
              <span className="font-extrabold text-sm uppercase tracking-wider">Google Tablolar Bi-Directional Canlı Eşitleme</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-tight">Otomatik Senkronizasyon & Veri Entegrasyon Merkezi</h3>
            <p className="text-slate-500 font-medium">
              Sisteminizdeki tüm araçlar, okullar, veliler ve öğrenciler Google Sheets ile çift yönlü anlık olarak haberleşir. 
              E-Tablolar üzerinde yaptığınız tüm eklemeler, silmeler veya güncellemeler anında programa yansır.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleFullSync}
              disabled={syncing}
              className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/10 transition-all ${
                syncing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? `Eşitleniyor %${syncProgress}...` : 'Google E-Tablo ile Şimdi Eşitle (Çift Yönlü)'}
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" /> Sablon Şeması İndir
            </button>
          </div>
        </div>

        {/* Sync Status Panel */}
        <div className="bg-slate-900 text-slate-300 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bağlantı Durumu</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-black rounded-full text-[9px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                CANLI AKTİF
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[10px]">
              <p className="text-slate-400">🔗 Webhook Alıcı: <span className="text-blue-400 truncate block">{webhookUrl}</span></p>
              <p className="text-slate-400">📅 Son Eşitleme: <span className="text-slate-200">{store.settings.lastBackupTime || '15 Temmuz 2026, 12:00'}</span></p>
              <p className="text-slate-400">📊 Toplam Senkronize Veri: <span className="text-emerald-400 font-black">{store.students.length + store.vehicles.length + store.schools.length + store.users.length} Kayıt</span></p>
            </div>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80 text-[10px] leading-relaxed">
            💡 <b>Anında Entegrasyon İpucu:</b> Tablolarda yaptığınız düzenlemelerin programa anında akması için Apps Script Webhook tetikleyicisini aktif edin.
          </div>
        </div>
      </div>

      {/* 2. Interactive Spreadsheet visual simulator */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Google E-Tablolar Bulut Görsel Simülatörü</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Bulutta barınan sayfaların anlık canlı matrisi (Veri düzenlemek için hücreye çift tıklayın)</p>
            </div>
          </div>

          {/* Table Tab list selector */}
          <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-xl">
            {[
              { id: 'students', label: '👥 Öğrenciler' },
              { id: 'vehicles', label: '🚐 Araçlar' },
              { id: 'schools', label: '🏫 Okullar' },
              { id: 'users', label: '👤 Veliler & Personel' },
              { id: 'payments', label: '💳 Ödemeler' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setImportResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Spreadsheet Grid Layout */}
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold divide-x divide-slate-200 border-b border-slate-200">
                <th className="p-2 w-10 text-center bg-slate-200">#</th>
                {activeTab === 'students' && (
                  <>
                    <th className="p-2">Öğrenci No</th>
                    <th className="p-2">Adı Soyadı</th>
                    <th className="p-2">Sınıfı</th>
                    <th className="p-2">Anlaşmalı Okul</th>
                    <th className="p-2">Veli Adı Soyadı</th>
                    <th className="p-2">Veli Telefonu</th>
                    <th className="p-2">Sabah Yoklama</th>
                    <th className="p-2">Akşam Yoklama</th>
                  </>
                )}
                {activeTab === 'vehicles' && (
                  <>
                    <th className="p-2">Plaka Kodu</th>
                    <th className="p-2">Markası</th>
                    <th className="p-2">Model Tanımı</th>
                    <th className="p-2">Yolcu Kapasitesi</th>
                    <th className="p-2">Şoför Ataması</th>
                    <th className="p-2">Rehber Ataması</th>
                    <th className="p-2">Çalışma Durumu</th>
                  </>
                )}
                {activeTab === 'schools' && (
                  <>
                    <th className="p-2">ID</th>
                    <th className="p-2">Okul / Kurum Adı</th>
                    <th className="p-2">Fiziksel Adres</th>
                    <th className="p-2">Resmi Telefon</th>
                    <th className="p-2">Resmi E-Posta</th>
                  </>
                )}
                {activeTab === 'users' && (
                  <>
                    <th className="p-2">Kullanıcı ID</th>
                    <th className="p-2">İsim Soyadı</th>
                    <th className="p-2">Kullanıcı Rolü</th>
                    <th className="p-2">Sistem Kullanıcı Adı</th>
                    <th className="p-2">E-Posta Adresi</th>
                    <th className="p-2">Mobil Telefon No</th>
                  </>
                )}
                {activeTab === 'payments' && (
                  <>
                    <th className="p-2">Ödeme ID</th>
                    <th className="p-2">Öğrenci Adı</th>
                    <th className="p-2">Veli Adı</th>
                    <th className="p-2">Tutar (TL)</th>
                    <th className="p-2">Son Ödeme Tarihi</th>
                    <th className="p-2">Ödeme Durumu</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 divide-x divide-slate-200">
              
              {/* STUDENTS TAB */}
              {activeTab === 'students' && store.students.map((st, index) => (
                <tr key={st.id} className="hover:bg-slate-50 divide-x divide-slate-150">
                  <td className="p-2 bg-slate-50 text-center text-slate-400 font-bold">{index + 2}</td>
                  <td className="p-2 font-bold text-slate-800" onDoubleClick={() => { setEditingCell({ rowId: st.id, col: 'studentNumber' }); setEditValue(st.studentNumber); }}>
                    {editingCell?.rowId === st.id && editingCell?.col === 'studentNumber' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(st.id, 'studentNumber', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(st.id, 'studentNumber', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden font-bold" autoFocus />
                    ) : st.studentNumber}
                  </td>
                  <td className="p-2 text-slate-900 font-bold" onDoubleClick={() => { setEditingCell({ rowId: st.id, col: 'name' }); setEditValue(st.name); }}>
                    {editingCell?.rowId === st.id && editingCell?.col === 'name' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(st.id, 'name', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(st.id, 'name', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden font-bold" autoFocus />
                    ) : st.name}
                  </td>
                  <td className="p-2" onDoubleClick={() => { setEditingCell({ rowId: st.id, col: 'classLevel' }); setEditValue(st.classLevel); }}>
                    {editingCell?.rowId === st.id && editingCell?.col === 'classLevel' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(st.id, 'classLevel', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(st.id, 'classLevel', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : st.classLevel}
                  </td>
                  <td className="p-2 font-bold text-blue-600">{st.schoolName}</td>
                  <td className="p-2 font-bold text-slate-700" onDoubleClick={() => { setEditingCell({ rowId: st.id, col: 'parentName' }); setEditValue(st.parentName); }}>
                    {editingCell?.rowId === st.id && editingCell?.col === 'parentName' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(st.id, 'parentName', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(st.id, 'parentName', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : st.parentName}
                  </td>
                  <td className="p-2" onDoubleClick={() => { setEditingCell({ rowId: st.id, col: 'parentPhone' }); setEditValue(st.parentPhone); }}>
                    {editingCell?.rowId === st.id && editingCell?.col === 'parentPhone' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(st.id, 'parentPhone', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(st.id, 'parentPhone', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : st.parentPhone}
                  </td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${(st.morningStatus as string) !== 'pending' && (st.morningStatus as string) !== 'absent' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{(st.morningStatus as string) !== 'pending' && (st.morningStatus as string) !== 'absent' ? 'BİNDİ / OKULDA' : 'BEKLİYOR'}</span></td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${(st.eveningStatus as string) !== 'pending' && (st.eveningStatus as string) !== 'absent' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{(st.eveningStatus as string) !== 'pending' && (st.eveningStatus as string) !== 'absent' ? 'BİNDİ / EVDE' : 'BEKLİYOR'}</span></td>
                </tr>
              ))}

              {/* VEHICLES TAB */}
              {activeTab === 'vehicles' && store.vehicles.map((v, index) => (
                <tr key={v.id} className="hover:bg-slate-50 divide-x divide-slate-150">
                  <td className="p-2 bg-slate-50 text-center text-slate-400 font-bold">{index + 2}</td>
                  <td className="p-2 font-bold text-emerald-600" onDoubleClick={() => { setEditingCell({ rowId: v.id, col: 'plate' }); setEditValue(v.plate); }}>
                    {editingCell?.rowId === v.id && editingCell?.col === 'plate' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(v.id, 'plate', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(v.id, 'plate', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden font-bold" autoFocus />
                    ) : v.plate}
                  </td>
                  <td className="p-2 text-slate-900" onDoubleClick={() => { setEditingCell({ rowId: v.id, col: 'brand' }); setEditValue(v.brand); }}>
                    {editingCell?.rowId === v.id && editingCell?.col === 'brand' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(v.id, 'brand', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(v.id, 'brand', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : v.brand}
                  </td>
                  <td className="p-2" onDoubleClick={() => { setEditingCell({ rowId: v.id, col: 'model' }); setEditValue(v.model); }}>
                    {editingCell?.rowId === v.id && editingCell?.col === 'model' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(v.id, 'model', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(v.id, 'model', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : v.model}
                  </td>
                  <td className="p-2 font-bold font-mono" onDoubleClick={() => { setEditingCell({ rowId: v.id, col: 'capacity' }); setEditValue(String(v.capacity)); }}>
                    {editingCell?.rowId === v.id && editingCell?.col === 'capacity' ? (
                      <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(v.id, 'capacity', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(v.id, 'capacity', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden font-mono" autoFocus />
                    ) : `${v.capacity} Kişilik`}
                  </td>
                  <td className="p-2 text-slate-600">Ahmet Yılmaz</td>
                  <td className="p-2 text-slate-600">Ayşe Yıldız</td>
                  <td className="p-2"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[9px]">AKTİF</span></td>
                </tr>
              ))}

              {/* SCHOOLS TAB */}
              {activeTab === 'schools' && store.schools.map((s, index) => (
                <tr key={s.id} className="hover:bg-slate-50 divide-x divide-slate-150">
                  <td className="p-2 bg-slate-50 text-center text-slate-400 font-bold">{index + 2}</td>
                  <td className="p-2 text-slate-500 font-mono">{s.id}</td>
                  <td className="p-2 font-bold text-slate-900" onDoubleClick={() => { setEditingCell({ rowId: s.id, col: 'name' }); setEditValue(s.name); }}>
                    {editingCell?.rowId === s.id && editingCell?.col === 'name' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(s.id, 'name', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(s.id, 'name', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden font-bold" autoFocus />
                    ) : s.name}
                  </td>
                  <td className="p-2 text-slate-600" onDoubleClick={() => { setEditingCell({ rowId: s.id, col: 'address' }); setEditValue(s.address); }}>
                    {editingCell?.rowId === s.id && editingCell?.col === 'address' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(s.id, 'address', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(s.id, 'address', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : s.address}
                  </td>
                  <td className="p-2 text-slate-600" onDoubleClick={() => { setEditingCell({ rowId: s.id, col: 'phone' }); setEditValue(s.phone); }}>
                    {editingCell?.rowId === s.id && editingCell?.col === 'phone' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(s.id, 'phone', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(s.id, 'phone', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : s.phone}
                  </td>
                  <td className="p-2 text-blue-500 font-bold">okul@berkaytur.com</td>
                </tr>
              ))}

              {/* USERS TAB */}
              {activeTab === 'users' && store.users.map((u, index) => (
                <tr key={u.id} className="hover:bg-slate-50 divide-x divide-slate-150">
                  <td className="p-2 bg-slate-50 text-center text-slate-400 font-bold">{index + 2}</td>
                  <td className="p-2 font-mono text-slate-400">{u.id}</td>
                  <td className="p-2 font-bold text-slate-800" onDoubleClick={() => { setEditingCell({ rowId: u.id, col: 'name' }); setEditValue(u.name); }}>
                    {editingCell?.rowId === u.id && editingCell?.col === 'name' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(u.id, 'name', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(u.id, 'name', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden font-bold" autoFocus />
                    ) : u.name}
                  </td>
                  <td className="p-2 font-black"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[9px]">{u.role.toUpperCase()}</span></td>
                  <td className="p-2 text-slate-900 font-bold">{u.username}</td>
                  <td className="p-2 text-blue-500" onDoubleClick={() => { setEditingCell({ rowId: u.id, col: 'email' }); setEditValue(u.email || ''); }}>
                    {editingCell?.rowId === u.id && editingCell?.col === 'email' ? (
                      <input type="email" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(u.id, 'email', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(u.id, 'email', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : u.email || `${u.username}@berkaytur.com`}
                  </td>
                  <td className="p-2 text-slate-700" onDoubleClick={() => { setEditingCell({ rowId: u.id, col: 'phone' }); setEditValue(u.phone); }}>
                    {editingCell?.rowId === u.id && editingCell?.col === 'phone' ? (
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleSheetCellChange(u.id, 'phone', editValue)} onKeyDown={e => e.key === 'Enter' && handleSheetCellChange(u.id, 'phone', editValue)} className="p-0.5 border border-blue-500 bg-white w-full outline-hidden" autoFocus />
                    ) : u.phone}
                  </td>
                </tr>
              ))}

              {/* PAYMENTS TAB */}
              {activeTab === 'payments' && store.payments.map((p, index) => (
                <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-150">
                  <td className="p-2 bg-slate-50 text-center text-slate-400 font-bold">{index + 2}</td>
                  <td className="p-2 font-mono text-slate-400">{p.id}</td>
                  <td className="p-2 font-bold text-slate-800">{p.studentName}</td>
                  <td className="p-2 font-bold text-slate-700">{p.parentName}</td>
                  <td className="p-2 font-bold text-slate-900 font-mono">{p.amount} TL</td>
                  <td className="p-2 text-slate-500">{p.dueDate}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : p.status === 'overdue' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {p.status === 'paid' ? '✓ ÖDENDİ' : p.status === 'overdue' ? '⚠️ GECİKTİ' : '⌛ BEKLİYOR'}
                    </span>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Apps Script Integration Wizard & Webhook Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Apps Script Code Copy Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-5 h-5 text-blue-600 animate-spin-slow" /> Google Apps Script Entegrasyon Sihirbazı
            </h4>
            <p className="text-slate-500 leading-relaxed font-medium">
              E-Tablolar üzerinde yapılan her işlemin <b>anında</b> programa işlenmesi için aşağıdaki modern Apps Script kodunu 
              Google E-Tablonuzun makro editörüne yapıştırın. Bu kod, hücre değişikliklerini dinleyip sisteme anında iletir.
            </p>
          </div>

          <div className="relative bg-slate-950 rounded-2xl overflow-hidden p-4 border border-slate-800 font-mono text-[9px] text-slate-300 max-h-56 overflow-y-auto">
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              <button
                onClick={copyToClipboard}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer flex items-center gap-1 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                {isCopied ? 'Kopyalandı!' : 'Kodu Kopyala'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{appsScriptCode}</pre>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-blue-800 flex items-start gap-2.5">
            <Info className="w-4.5 h-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 font-medium text-[10px]">
              <p className="font-black">💡 Kurulum Adımları:</p>
              <p>1. Google E-Tablonuzu açın, üst menüden <b>Uzantılar {`>`} Apps Script</b> seçeneğine tıklayın.</p>
              <p>2. Açılan editördeki tüm kodları silin ve kopyaladığınız kodu yapıştırıp kaydedin (Disket İkonu).</p>
              <p>3. Artık Google Sheets üzerindeki her hücre güncellemesi anında sisteminize senkronize olur!</p>
            </div>
          </div>
        </div>

        {/* Real copy-paste TSV parser & simulator importer */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-5 h-5 text-emerald-600" /> Excel / Google Sheets İçe Aktarım Paneli
            </h4>
            <p className="text-slate-500 leading-relaxed font-medium">
              Google E-Tablolar'dan veya Excel'den kopyaladığınız tüm satırları aşağıdaki alana yapıştırarak sisteme 
              anında aktarabilirsiniz. Sistem sütunları otomatik eşleştirir ve çift yönlü güvenli birleşme sağlar.
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={5}
              placeholder={`Örn: Öğrencileri aktarmak için (Öğrenci No;Adı Soyadı;Sınıfı;Okul Adı;Veli Adı;Veli Telefonu) formatında kopyalayın ve buraya yapıştırın...`}
              value={pasteData}
              onChange={e => setPasteData(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            
            <div className="flex justify-between gap-2">
              <button
                onClick={handleParsePaste}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all"
              >
                📋 Yapıştırılan Veriyi Analiz Et
              </button>
              {pastedRows.length > 0 && (
                <button
                  onClick={handleExecuteImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer transition-all flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" /> Eşitlemeyi Başlat ({pastedRows.length} Satır)
                </button>
              )}
            </div>
          </div>

          {/* Pasted Preview Grid */}
          {pastedRows.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-2">
              <span className="font-extrabold text-slate-700 block uppercase text-[9px]">Hazırlanan Veri Önizleme Matrisi</span>
              <table className="w-full font-mono text-[9px] text-left border-collapse border border-slate-200 bg-white">
                <thead>
                  <tr className="bg-slate-100 divide-x divide-slate-200">
                    {pastedHeaders.map((h, i) => <th key={i} className="p-1 border border-slate-200">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 divide-x divide-slate-150">
                  {pastedRows.slice(0, 3).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((val: any, cIdx: number) => <td key={cIdx} className="p-1 border border-slate-200 max-w-[120px] truncate font-semibold">{val}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {pastedRows.length > 3 && <p className="text-[9px] text-slate-400 font-bold text-center">+ {pastedRows.length - 3} satır daha hazırlanıyor...</p>}
            </div>
          )}

          {/* Import Result Card */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-xs uppercase tracking-wider">İçe Aktarım Rapor Kartı</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-emerald-800 font-bold text-[10px]">
                <div className="bg-white p-2 border border-emerald-100 rounded-xl">
                  <span className="text-slate-400 block font-bold text-[8px] uppercase">Yeni Eklenen</span>
                  <span className="text-base text-emerald-600 font-black font-mono">{importResult.added}</span>
                </div>
                <div className="bg-white p-2 border border-emerald-100 rounded-xl">
                  <span className="text-slate-400 block font-bold text-[8px] uppercase">Güncellenen</span>
                  <span className="text-base text-blue-600 font-black font-mono">{importResult.updated}</span>
                </div>
                <div className="bg-white p-2 border border-emerald-100 rounded-xl">
                  <span className="text-slate-400 block font-bold text-[8px] uppercase">Toplam İşlenen</span>
                  <span className="text-base text-slate-900 font-black font-mono">{importResult.total}</span>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-rose-700 text-[9px] bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-semibold space-y-0.5">
                  <p className="font-bold flex items-center gap-1 text-[10px]"><AlertTriangle className="w-3.5 h-3.5" /> Bazı satırlarda uyarılar oluştu:</p>
                  {importResult.errors.slice(0, 3).map((err, i) => <p key={i}>• {err}</p>)}
                  {importResult.errors.length > 3 && <p>• ve {importResult.errors.length - 3} hata daha...</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. API URLs Connection & Settings Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
          <Database className="w-5 h-5 text-blue-600" /> Google API & E-Tablo Bağlantı Parametreleri
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500">Google Apps Script Web App URL</label>
            <input
              type="text"
              value={sheetsUrl}
              onChange={e => setSheetsUrl(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px]"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500">Google Drive Evrak Klasör ID (Folder ID)</label>
            <input
              type="text"
              value={driveId}
              onChange={e => setDriveId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px]"
              placeholder="1_GOOGLE_DRIVE_FOLDER_ID_BERKAYTUR"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all"
          >
            Google Bağlantı Ayarlarını Kaydet
          </button>
        </div>
      </div>

    </div>
  );
}
