/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useAppStore } from '../../../store';
import { DocumentArchive } from '../../../types';
import { StorageService } from '../../../services/StorageService';
import { 
  Upload, FileText, Search, Trash2, Calendar, 
  Tag, Download, CheckCircle, FolderOpen, RefreshCw, Loader2
} from 'lucide-react';

export default function Dekontlar() {
  const { documents, addDocument, addLog, currentUser } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter only finance and payment related documents
  const filteredDocuments = documents.filter(doc => {
    const isFinancial = ['Muhasebe', 'Hakediş', 'Tahsilat', 'Sözleşmeler', 'Dekontlar'].includes(doc.category);
    if (!isFinancial) return false;

    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFiles(e.target.files);
    }
  };

  const handleUploadFiles = async (files: FileList) => {
    setIsUploading(true);
    let successCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(`"${file.name}" taranıyor ve yükleniyor...`);
      
      const uploadRes = await StorageService.uploadFile(file, categoryFilter === 'All' ? 'Dekontlar' : categoryFilter);
      
      if (!uploadRes.success) {
        alert(`Yükleme Hatası (${file.name}): ${uploadRes.error}`);
        continue;
      }

      const cat = categoryFilter === 'All' ? 'Dekontlar' : (categoryFilter as any);
      const newDoc: DocumentArchive = {
        id: `doc_${Date.now()}_${i}`,
        name: uploadRes.randomName || file.name,
        category: cat,
        fileUrl: uploadRes.fileUrl || '#',
        fileSize: uploadRes.fileSizeStr || '0.5 MB',
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: currentUser?.name || 'Ayhan Sayman'
      };

      addDocument(newDoc);
      addLog(
        'Belge Yüklendi', 
        `"${file.name}" isimli ${cat} kategorisindeki mali belge, güvenli rastgele isim "${uploadRes.randomName}" ile virüs taramasından geçirilerek sisteme kaydedildi.`
      );
      successCount++;
    }
    
    setIsUploading(false);
    setUploadStatus('');
    if (successCount > 0) {
      alert(`${successCount} adet belge başarıyla yüklendi, virüs taramasından geçildi ve güvenli depolama sunucusuna kaydedildi!`);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Dijital Dekont & Fatura Arşivi</h2>
        <p className="text-slate-500 text-xs font-semibold">Banka makbuzları, maaş ödeme slip dekontları ve resmi faturaların dijital bulut arşivi.</p>
      </div>

      {/* DRAG AND DROP ZONE */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={isUploading ? undefined : triggerFileInput}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center space-y-3 ${
          isUploading 
            ? 'border-indigo-300 bg-indigo-50/20 text-indigo-700 cursor-not-allowed'
            : dragActive 
              ? 'border-blue-500 bg-blue-50/50 text-blue-700 cursor-pointer' 
              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-500 cursor-pointer'
        }`}
      >
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          disabled={isUploading}
          className="hidden" 
        />
        {isUploading ? (
          <>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-lg shadow-sm animate-spin">
              <Loader2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-indigo-800">{uploadStatus || 'Güvenlik taraması yapılıyor...'}</p>
              <p className="text-[10px] text-slate-400 font-medium">Lütfen bekleyin, antivirüs motoru dosyaları inceliyor.</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-lg shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-slate-700">Dekont veya faturayı sürükleyin ya da tıklayın</p>
              <p className="text-[10px] text-slate-400 font-medium">Desteklenen formatlar: PDF, PNG, JPG (Maks. 10MB)</p>
            </div>
          </>
        )}
      </div>

      {/* SEARCH AND FILTERING PANEL */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none w-4 h-4 my-auto" />
          <input
            type="text"
            placeholder="Belge ismiyle ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold focus:outline-none"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'Dekontlar', 'Tahsilat', 'Hakediş', 'Sözleşmeler', 'Muhasebe'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                categoryFilter === cat 
                  ? 'bg-blue-600 text-white font-black' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {cat === 'All' ? 'TÜMÜ' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* DOCUMENTS LIST GRID */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4">
        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-slate-400" /> ARŞİVDEKİ BELGELER ({filteredDocuments.length})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 max-w-[180px] truncate" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {doc.fileSize} • {doc.uploadDate}
                  </p>
                  <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded mt-1">
                    {doc.category}
                  </span>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => alert('Dosya tarayıcıda yeni sekmede açıldı (Simülasyon).')}
                  className="p-2 bg-white hover:bg-slate-200 text-slate-600 border rounded-xl transition-all cursor-pointer"
                  title="Görüntüle"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 space-y-2">
              <p className="text-xs font-bold">Herhangi bir mali belge bulunamadı.</p>
              <p className="text-[10px] opacity-75">Sol üstten yeni bir dekont/fatura yükleyerek arşivi genişletebilirsiniz.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
