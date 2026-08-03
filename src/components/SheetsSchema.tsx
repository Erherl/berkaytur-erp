/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, Table, FileSpreadsheet, Key, Check, Copy, HelpCircle, 
  Terminal, ShieldCheck, Cpu, Code
} from 'lucide-react';

export default function SheetsSchema() {
  const [copied, setCopied] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('Kullanıcılar');

  const sheetsMetadata: Record<string, { desc: string; columns: string[] }> = {
    'Kullanıcılar': {
      desc: 'Sisteme erişebilen tüm personellerin rolleri (admin, manager, accounting, driver, hostess vb.) ve kimlik bilgileri.',
      columns: ['id', 'role', 'name', 'username', 'password_hash', 'email', 'phone', 'status', 'created_at']
    },
    'Okullar': {
      desc: 'Servis taşımacılığı yapılan anlaşmalı tüm devlet ve özel eğitim kurumları.',
      columns: ['id', 'name', 'address', 'phone', 'email', 'latitude', 'longitude', 'created_at']
    },
    'Öğrenciler': {
      desc: 'Hizmet alan tüm öğrencilerin detayları, okul eşleşmeleri, veli bilgileri ve aktif servis güzergahları.',
      columns: ['id', 'name', 'student_number', 'class_level', 'school_id', 'parent_name', 'parent_phone', 'route_id', 'morning_status', 'evening_status', 'latitude', 'longitude']
    },
    'Veliler': {
      desc: 'Tahsilat takipleri ve iletişim için öğrencilerin birinci derece sorumlu veli listesi.',
      columns: ['id', 'name', 'phone', 'email', 'address', 'tc_no', 'company_association']
    },
    'Araçlar': {
      desc: 'Filoda kayıtlı tüm özmal veya kiralık servis araçlarının plakaları, ruhsat, muayene ve bakım takipleri.',
      columns: ['id', 'plate', 'brand', 'model', 'capacity', 'driver_id', 'hostess_id', 'status', 'muayene_tarihi', 'sigorta_tarihi']
    },
    'Şoförler': {
      desc: 'Araç kullanan tüm personeller, ehliyet sınıfları, SRC belgeleri, psikoteknik raporları ve hakediş detayları.',
      columns: ['id', 'name', 'phone', 'email', 'ehliyet_no', 'src_no', 'psikoteknik_status', 'sabika_kaydi_url', 'salary_type']
    },
    'Hostesler': {
      desc: 'Rehber personellerin iletişim bilgileri, sağlık raporları ve puantaj hakediş katsayıları.',
      columns: ['id', 'name', 'phone', 'email', 'saglik_raporu_status', 'active_vehicle_id']
    },
    'Tedarikçiler': {
      desc: 'Konsorsiyumda iş ortaklığı yapılan alt yükleniciler, kiralık araç sahipleri ve hakediş katsayıları.',
      columns: ['id', 'company_name', 'authorized_person', 'phone', 'email', 'iban', 'commission_rate']
    },
    'Puantaj': {
      desc: 'Araçların sabah ve akşam servis seferlerinin başarıyla tamamlanma/yoklama kayıtları.',
      columns: ['id', 'date', 'route_id', 'driver_id', 'hostess_id', 'morning_completed', 'evening_completed', 'delay_minutes', 'remarks']
    },
    'Hakedişler': {
      desc: 'Şoför, hostes ve tedarikçi hak ediş dönem hesaplamaları ve ödeme emirleri.',
      columns: ['id', 'period_month', 'target_id', 'target_type', 'base_amount', 'bonus_amount', 'deduction_amount', 'net_amount', 'payment_status']
    },
    'Tahsilatlar': {
      desc: 'Velilerden alınan aylık taksitler, nakit veya kredi kartı ödeme fişleri.',
      columns: ['id', 'student_id', 'parent_id', 'amount', 'due_date', 'payment_date', 'payment_method', 'status', 'received_by']
    },
    'Etkinlikler': {
      desc: 'Okul gezileri, spor müsabakaları servis talepleri ve özel tur planlamaları.',
      columns: ['id', 'title', 'school_id', 'date', 'vehicle_id', 'driver_id', 'price', 'status']
    },
    'Denetimler': {
      desc: 'Araç içi temizlik, hız limitleri, kemer ve emniyet hostesi kurallarına uyum raporları.',
      columns: ['id', 'date', 'vehicle_id', 'inspector_id', 'score_percentage', 'checklist_results_json', 'violations']
    },
    'Memnuniyet Anketleri': {
      desc: 'Yıl içerisinde velilere gönderilen servis kalitesi anket yanıtları ve NPS skorları.',
      columns: ['id', 'student_id', 'parent_id', 'score_overall', 'punctuality_score', 'driver_score', 'hostess_score', 'comments']
    },
    'Bildirimler': {
      desc: 'Gecikme, arıza, yeni kayıt onay bekleme duyuru kuyrukları.',
      columns: ['id', 'title', 'message', 'type', 'target_role', 'timestamp', 'read_by_users_json']
    }
  };

  const appsScriptCode = `/**
 * Google Apps Script Web App - BERKAYTUR DB Service
 * Yayınlama Talimatı:
 * 1. Google Sheets dosyanızı açın.
 * 2. Uzantılar -> Apps Script bölümüne girin.
 * 3. Bu kodu yapıştırın ve kaydedin.
 * 4. Yeni Dağıtım -> Web Uygulaması olarak yayınlayın (Erişim: Herkes).
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const sheetName = params.sheetName;
    const data = params.data;
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        sheet.appendRow(headers);
      }
    }
    
    if (action === "sync") {
      // Clear sheet and rewrite all elements safely
      sheet.clear();
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        sheet.appendRow(headers);
        
        const rows = data.map(item => headers.map(h => typeof item[h] === "object" ? JSON.stringify(item[h]) : item[h]));
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Sheets synced successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Action not recognized" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const result = {};
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        result[name] = [];
        return;
      }
      const headers = data[0];
      const rows = data.slice(1);
      
      result[name] = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          let val = row[index];
          if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
            try { val = JSON.parse(val); } catch(e) {}
          }
          obj[header] = val;
        });
        return obj;
      });
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="google-sheets-blueprint-manager">
      
      {/* HEADER HERO */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/10">
              ÜCRETSİZ VERİTABANI BULUT ALTYAPISI
            </span>
            <h3 className="text-base font-black tracking-tight mt-1">Google Sheets Veritabanı Şeması</h3>
            <p className="text-slate-400 text-xs font-semibold">Uygulama içerisindeki tüm modüllerin Google Tablolar üzerindeki karşılık gelen tabloları ve şemaları.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Google Sheets Tabs & Column Specs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Table className="w-4 h-4 text-blue-600" /> Aktif Tablolar ({Object.keys(sheetsMetadata).length})
            </h4>

            {/* Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(sheetsMetadata).map(tabName => (
                <button
                  key={tabName}
                  onClick={() => setSelectedSheet(tabName)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    selectedSheet === tabName 
                      ? 'border-blue-500 bg-blue-50/20 text-slate-900' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${selectedSheet === tabName ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{tabName}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Column Schema Visualizer */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
              <div>
                <h5 className="font-extrabold text-xs text-slate-800">{selectedSheet} Tablo Detayı</h5>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                  {sheetsMetadata[selectedSheet].desc}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Sütun Şeması (Columns)</span>
                <div className="flex flex-wrap gap-1.5">
                  {sheetsMetadata[selectedSheet].columns.map((col, idx) => (
                    <span 
                      key={col} 
                      className="px-2 py-1 bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-600 rounded-lg shadow-3xs flex items-center gap-1"
                    >
                      <span className="text-[8px] text-slate-300 font-bold font-mono">{idx + 1}</span> {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right: Apps Script Deployment Code Copy-Paste */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-4 h-4 text-blue-600" /> Google Apps Script Entegrasyon Kodu
              </h4>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopyalandı' : 'Kodu Kopyala'}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Google Apps Script kullanarak Google Sheets'i sıfır maliyetle bir <strong className="text-slate-600">Secure REST API</strong> ve veritabanı olarak kullanabilirsiniz. Yukarıdaki butona tıklayarak Apps Script kodunuzu kopyalayın, Google E-Tablonuzun Apps Script editörüne yapıştırıp dağıtın.
            </p>

            <div className="relative">
              <div className="absolute top-2 right-2 bg-slate-800 text-[8px] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 select-none">
                javascript / gas
              </div>
              <pre className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-[9px] h-64 overflow-y-auto leading-normal shadow-inner whitespace-pre">
                {appsScriptCode}
              </pre>
            </div>

            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[10px] font-semibold text-blue-800 leading-relaxed flex gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Güvenlik Sorumluluğu:</strong> Vercel'de barındırılan uygulamanız Google Apps Script üzerinden veri alışverişi yaparken HTTPS protokolünü kullanır. Tüm veriler uçtan uca şifreli olarak Google'ın güvenli sunucularına iletilir.
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
