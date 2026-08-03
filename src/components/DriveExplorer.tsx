/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { ApiClient } from '../infrastructure/api/apiClient';
import { 
  Folder, FolderOpen, File, Upload, Download, Trash2, 
  RefreshCw, Plus, Clock, Search, FolderPlus, HelpCircle,
  FileText, Image as ImageIcon, ChevronRight, HardDrive, ShieldCheck
} from 'lucide-react';

interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string; // e.g. "BERKAYTUR/Öğrenciler/Ali Yılmaz"
  category?: string;
  fileSize?: string;
  uploadDate?: string;
  fileUrl?: string;
}

export default function DriveExplorer() {
  const { students, vehicles, users, addLog } = useAppStore();
  const [currentPath, setCurrentPath] = useState<string[]>(['BERKAYTUR']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<DriveItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [realDocs, setRealDocs] = useState<DriveItem[]>([]);
  const [realBackups, setRealBackups] = useState<any[]>([]);

  // Load real documents from backend
  const loadDocsAndBackups = async () => {
    setLoading(true);
    try {
      const docRes = await ApiClient.fetchDocuments();
      if (docRes.success && docRes.data) {
        // Map backend document to DriveItem interface
        const mappedDocs: DriveItem[] = docRes.data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: 'file',
          path: d.path || 'BERKAYTUR',
          category: d.category,
          fileSize: d.fileSize || '1.0 MB',
          uploadDate: d.uploadDate || d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          fileUrl: d.fileUrl
        }));
        setRealDocs(mappedDocs);
      }

      const backupRes = await ApiClient.fetchBackups();
      if (backupRes.success && backupRes.data) {
        setRealBackups(backupRes.data);
      }
    } catch (err) {
      console.error('Arşiv verileri yüklenirken hata oluştu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocsAndBackups();
  }, []);

  // Compute sub-directories and files dynamically based on active system data and loaded documents
  const getDynamicItemsForPath = (): DriveItem[] => {
    const currentPathStr = currentPath.join('/');
    const itemsList: DriveItem[] = [];

    // 1. Hardcoded high level folders under main BERKAYTUR namespace
    if (currentPathStr === 'BERKAYTUR') {
      const topLevelFolders = ['Öğrenciler', 'Okullar', 'Araçlar', 'Şoförler', 'Muhasebe', 'Sözleşmeler', 'Yedekler'];
      topLevelFolders.forEach(folder => {
        itemsList.push({
          id: `folder_top_${folder.toLowerCase()}`,
          name: folder,
          type: 'folder',
          path: 'BERKAYTUR'
        });
      });
    }

    // 2. Student folders under BERKAYTUR/Öğrenciler
    if (currentPathStr === 'BERKAYTUR/Öğrenciler') {
      students.forEach(st => {
        itemsList.push({
          id: `folder_student_${st.id}`,
          name: st.name,
          type: 'folder',
          path: 'BERKAYTUR/Öğrenciler'
        });
      });
    }

    // 3. Vehicle folders under BERKAYTUR/Araçlar
    if (currentPathStr === 'BERKAYTUR/Araçlar') {
      vehicles.forEach(v => {
        itemsList.push({
          id: `folder_vehicle_${v.id}`,
          name: v.plate,
          type: 'folder',
          path: 'BERKAYTUR/Araçlar'
        });
      });
    }

    // 4. Driver folders under BERKAYTUR/Şoförler
    if (currentPathStr === 'BERKAYTUR/Şoförler') {
      users.filter(u => u.role === 'driver').forEach(d => {
        itemsList.push({
          id: `folder_driver_${d.id}`,
          name: d.name,
          type: 'folder',
          path: 'BERKAYTUR/Şoförler'
        });
      });
    }

    // 5. Backups under BERKAYTUR/Yedekler (real backup files from server!)
    if (currentPathStr === 'BERKAYTUR/Yedekler') {
      realBackups.forEach(backup => {
        itemsList.push({
          id: `backup_file_${backup.filename}`,
          name: backup.filename,
          type: 'file',
          path: 'BERKAYTUR/Yedekler',
          fileSize: `${(backup.sizeBytes / 1024).toFixed(1)} KB`,
          uploadDate: backup.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          fileUrl: `/api/v1/admin/backups` // points to backend backups
        });
      });
    }

    // 6. Append uploaded files whose path matches currentPathStr
    realDocs.forEach(doc => {
      if (doc.path === currentPathStr) {
        itemsList.push(doc);
      }
    });

    // Apply search filter if active
    if (searchQuery) {
      return itemsList.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return itemsList;
  };

  const currentItems = getDynamicItemsForPath();

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`;

      setLoading(true);
      const currentPathStr = currentPath.join('/');
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await ApiClient.uploadDocument({
            name: file.name,
            path: currentPathStr,
            category: currentPath[currentPath.length - 1] || 'Genel',
            fileSize: sizeStr,
            fileData: base64Data,
            mimeType: file.type
          } as any);

          if (res.success) {
            addLog(
              'Google Drive Arşivleme', 
              `Google Drive Bulut klasörüne yeni evrak yüklendi: ${file.name} -> Klasör: ${currentPathStr}`
            );
            alert(`✅ "${file.name}" başarıyla bulut sunucusuna yüklendi ve arşivlendi!`);
            await loadDocsAndBackups();
          } else {
            alert(`❌ Evrak yükleme başarısız oldu: ${res.error || 'Bilinmeyen hata'}`);
          }
        } catch (err: any) {
          alert(`❌ Hata oluştu: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        alert('Dosya okunurken bir hata oluştu.');
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleCreateRealBackup = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.createBackup();
      if (res.success) {
        addLog(
          'Yedekleme İşlemi', 
          `Sistem veritabanının anlık yedek kopyası oluşturuldu: ${res.data?.filename || 'Yedek Dosyası'}`
        );
        alert(`⏳ Veritabanı yedeği başarıyla alındı ve bulut diskine kaydedildi!`);
        await loadDocsAndBackups();
      } else {
        alert(`❌ Yedek alınamadı: ${res.error || 'Bilinmeyen hata'}`);
      }
    } catch (err: any) {
      alert(`❌ Yedekleme hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateFolder = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
    setSelectedItem(null);
  };

  const handleNavigateUp = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
      setSelectedItem(null);
    }
  };

  return (
    <div className="space-y-6" id="google-drive-management-system">
      
      {/* DRIVE QUICK SUMMARY HEADER */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">
            <HardDrive className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/10">
              BULUT ARŞİV ENTEGRASYONU
            </span>
            <h3 className="text-base font-black tracking-tight mt-1">Google Drive & Arşiv Yönetim Merkezi</h3>
            <p className="text-slate-400 text-xs font-semibold">Tüm öğrenci, veli, şoför ve araç evrakları canlı PostgreSQL veritabanından senkronize edilir.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreateRealBackup}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/20"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} 
            Anlık Sistem Yedeği Al
          </button>
        </div>
      </div>

      {/* SEARCH AND BREADCRUMBS */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs font-bold text-slate-500 flex-wrap">
          <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
          {currentPath.map((folder, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <button
                onClick={() => {
                  setCurrentPath(currentPath.slice(0, index + 1));
                  setSelectedItem(null);
                }}
                className={`hover:text-blue-600 cursor-pointer ${
                  index === currentPath.length - 1 ? 'text-slate-800 font-extrabold' : ''
                }`}
              >
                {folder}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Arşivde dosya ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:bg-white"
          />
        </div>
      </div>

      {/* EXPLORER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* File / Folder Workspace */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-xs">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-black text-slate-500">Arşiv Verileri Senkronize Ediliyor...</p>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Folder className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Bu klasör henüz boş</p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Bu dizinde henüz döküman bulunmuyor. Alttaki butondan yeni dosya arşivleyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {currentItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    onDoubleClick={() => {
                      if (item.type === 'folder') {
                        handleNavigateFolder(item.name);
                      } else {
                        if (item.fileUrl) {
                          window.open(item.fileUrl, '_blank');
                        } else {
                          alert(`📂 Dosya Ön İzleme:\nAdı: ${item.name}\nBoyutu: ${item.fileSize}\nYüklenme: ${item.uploadDate}`);
                        }
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all relative group cursor-pointer ${
                      selectedItem?.id === item.id 
                        ? 'border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5' 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50/80'
                    }`}
                  >
                    {item.type === 'folder' ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl border border-amber-200/50 flex items-center justify-center text-amber-500">
                          <FolderOpen className="w-5.5 h-5.5 fill-current" />
                        </div>
                        <p className="text-xs font-black text-slate-700 truncate">{item.name}</p>
                        <span className="text-[9px] text-slate-400 font-bold block">Klasör</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl border border-blue-200/50 flex items-center justify-center text-blue-500">
                          {item.name.match(/\.(jpg|png|gif)$/i) ? <ImageIcon className="w-5.5 h-5.5" /> : <FileText className="w-5.5 h-5.5" />}
                        </div>
                        <p className="text-xs font-black text-slate-700 truncate">{item.name}</p>
                        <span className="text-[9px] text-slate-400 font-bold block">{item.fileSize}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ACTIONS RAIL */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex gap-2">
              {currentPath.length > 1 && (
                <button
                  onClick={handleNavigateUp}
                  className="px-3.5 py-2 border bg-white hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-600"
                >
                  ↩️ Üst Klasör
                </button>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer">
                <Upload className="w-4 h-4" /> Belge Yükle
                <input 
                  type="file" 
                  onChange={handleManualUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

        </div>

        {/* Selected Item Inspector Panel */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Arşiv Müfettişi
            </h4>

            {selectedItem ? (
              <div className="space-y-4 text-xs font-bold text-slate-600">
                <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 border rounded-xl text-blue-500">
                      {selectedItem.type === 'folder' ? <Folder className="w-5 h-5" /> : <File className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-800 truncate">{selectedItem.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{selectedItem.type === 'folder' ? 'Klasör' : 'Belge'}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t pt-2 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bulut Yolu:</span>
                      <span className="text-slate-700 font-semibold truncate max-w-[160px]">{selectedItem.path}/{selectedItem.name}</span>
                    </div>
                    {selectedItem.fileSize && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dosya Boyutu:</span>
                        <span className="text-slate-700 font-semibold">{selectedItem.fileSize}</span>
                      </div>
                    )}
                    {selectedItem.uploadDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Yüklenme:</span>
                        <span className="text-slate-700 font-semibold">{selectedItem.uploadDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {selectedItem.type === 'folder' ? (
                    <button
                      onClick={() => handleNavigateFolder(selectedItem.name)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
                    >
                      Aç
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (selectedItem.fileUrl) {
                          window.open(selectedItem.fileUrl, '_blank');
                        } else {
                          alert(`📥 "${selectedItem.name}" indiriliyor...`);
                        }
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> İndir
                    </button>
                  )}

                  <button
                    onClick={() => {
                      alert("⚠️ Güvenlik ve mevzuat gereği, arşivlenmiş evraklar doğrudan arayüzden silinemez. Lütfen Koordinatör veya Sistem Yöneticisine silme talebi gönderin.");
                    }}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 rounded-xl text-center text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Sil
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Müfettiş Hazır</p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Detayları, bulut yolunu ve indirme linklerini görüntülemek için bir klasör veya belge seçin.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
