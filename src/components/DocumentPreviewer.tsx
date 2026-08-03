/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { DownloadService } from '../services/DownloadService';
import { 
  FileText, ZoomIn, ZoomOut, RotateCw, Download, 
  ExternalLink, Eye, EyeOff, FolderOpen, Calendar, User, Search
} from 'lucide-react';
import { DocumentArchive } from '../types';

export default function DocumentPreviewer() {
  const { documents, addDocument, deleteDocument, addLog, currentUser } = useAppStore();
  const [selectedDoc, setSelectedDoc] = useState<DocumentArchive | null>(documents[0] || null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.15, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const categories = [
    'all', 'Öğrenci', 'Veli', 'Araç', 'Şoför', 'Hostes', 'Muhasebe', 'Sözleşmeler'
  ];

  const getFilteredDocs = () => {
    return documents.filter(doc => {
      const matchSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'all' || doc.category === filterCategory;
      return matchSearch && matchCat;
    });
  };

  const handleDownload = (doc: DocumentArchive) => {
    DownloadService.downloadReceipt(
      `Döküman İndirme`,
      {
        'Belge İsmi': doc.name,
        'Kategori': doc.category,
        'Yükleyen': doc.uploadedBy || 'Sistem',
        'Dosya Boyutu': doc.fileSize || 'Bilinmiyor',
        'Tarih': doc.uploadDate || 'Bilinmiyor'
      },
      doc.name.replace(/\.[a-zA-Z0-9]+$/, '.txt')
    );
    addLog('Belge İndirildi', `"${doc.name}" arşivden indirildi.`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      
      {/* Head section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide">
            DÖKÜMANTASYON MERKEZİ
          </span>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">Entegre Evrak Önizleyici</h3>
          <p className="text-xs text-slate-500">Sözleşmeler, ehliyet ve tescil belgeleri, tüzükler ve muayene raporlarını indirmeden sistem içinde inceleyin.</p>
        </div>

        {/* Google Drive Link */}
        <a
          href="https://drive.google.com"
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all"
        >
          <FolderOpen className="w-4 h-4 text-blue-600" /> Google Drive Bulut Klasörü
        </a>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Arşivde belge ismi ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer whitespace-nowrap border ${
                filterCategory === cat
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat === 'all' ? 'Tüm Kategoriler' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left list of archives */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
          {getFilteredDocs().map(doc => {
            const isSelected = selectedDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => { setSelectedDoc(doc); setZoomScale(1.0); setRotation(0); }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                  isSelected 
                    ? 'bg-blue-50/55 border-blue-200 text-blue-800 ring-1 ring-blue-200' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-1">
                    <span>{doc.category}</span>
                    <span>•</span>
                    <span>{doc.fileSize}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {getFilteredDocs().length === 0 && (
            <div className="text-center py-12 text-slate-400 font-bold text-xs">
              Aranılan kriterde evrak bulunamadı.
            </div>
          )}
        </div>

        {/* Right Preview Stage */}
        <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-4 bg-slate-100 flex flex-col justify-between min-h-[420px]">
          {selectedDoc ? (
            <>
              {/* Document toolbar controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs mb-3 text-xs font-bold text-slate-700">
                <div className="truncate max-w-[240px]">
                  <span>Önizlenen: </span>
                  <span className="text-blue-600">{selectedDoc.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={handleZoomOut} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer" 
                    title="Uzaklaştır"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono w-10 text-center font-bold">
                    %{Math.round(zoomScale * 100)}
                  </span>
                  <button 
                    onClick={handleZoomIn} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer" 
                    title="Yakınlaştır"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={handleRotate} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer" 
                    title="Döndür"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={() => handleDownload(selectedDoc)} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-600 cursor-pointer" 
                    title="Bilgisayara İndir"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dynamic rendering of simulated document contents */}
              <div className="flex-1 bg-slate-200/40 rounded-xl overflow-hidden relative flex items-center justify-center p-6 border border-slate-200/50 shadow-inner min-h-[300px]">
                <div 
                  className="bg-white p-12 max-w-lg w-full h-full shadow-lg border border-slate-300 flex flex-col justify-between transition-all duration-300 ease-out select-none"
                  style={{ 
                    transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                    minHeight: '340px'
                  }}
                >
                  <div className="space-y-6">
                    {/* Header of simulated document */}
                    <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-[15px] tracking-tighter text-slate-900 leading-none">BERKAYTUR A.Ş.</h4>
                        <p className="text-[8px] font-black tracking-widest text-blue-600 mt-1">RESMİ EVRAK VE RAPORLAMA ARŞİVİ</p>
                      </div>
                      <div className="text-right text-[8px] font-mono font-bold text-slate-400">
                        REF: BKT-{selectedDoc.id.toUpperCase()}
                      </div>
                    </div>

                    {/* Simulated content block */}
                    <div className="space-y-3 text-slate-800 text-xs text-justify">
                      <p className="font-bold text-xs uppercase text-slate-900">
                        Belge Tebliği ve Onay Kaydı
                      </p>
                      <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                        İşbu doküman, Berkaytur Okul Servis Portalı üzerinden sisteme yüklenmiş olan <strong>{selectedDoc.name}</strong> başlıklı resmi <strong>{selectedDoc.category}</strong> evrakının dijital kopyasıdır. 
                        Tüm kanuni ve fenni denetim kayıtları sistem içerisinde arşiv altında saklanmaktadır.
                      </p>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg font-mono text-[9px] text-slate-600 space-y-1">
                        <div>SİSTEM YÜKLEYEN: {selectedDoc.uploadedBy || 'Yönetici'}</div>
                        <div>YÜKLEME TARİHİ: {selectedDoc.uploadDate}</div>
                        <div>DOSYA BOYUTU: {selectedDoc.fileSize}</div>
                      </div>
                    </div>
                  </div>

                  {/* Stamp or verification footer */}
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                    <div className="text-[8px] text-slate-400 font-medium">
                      E-İmza ile onaylanmıştır.
                    </div>
                    <div className="w-12 h-12 bg-blue-50 border-2 border-blue-500 border-dashed rounded-full flex items-center justify-center text-[8px] font-black text-blue-600 rotate-12">
                      ONAYLANDI
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-xs font-semibold">
              <EyeOff className="w-10 h-10 mb-2" />
              <span>Görüntülenecek belge seçilmedi.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
