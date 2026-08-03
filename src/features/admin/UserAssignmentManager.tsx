/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { ApiClient } from '../../infrastructure/api/apiClient';
import { User, UserRole } from '../../types';
import { 
  Users, UserPlus, Search, Edit2, Trash2, Check, X, 
  Shield, MapPin, Building, Key, Mail, Phone, Filter,
  Truck, Eye, EyeOff, UserCheck, Calendar, Activity, 
  Database, AlertCircle, FileText, Image, Clipboard
} from 'lucide-react';

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export default function UserAssignmentManager() {
  const { schools, vehicles, users: storeUsers } = useAppStore();

  // API loaded states
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'personnel' | 'logs'>('personnel');

  // Search and Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  // Form states (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'coordinator' as UserRole,
    status: 'active' as 'active' | 'inactive',
    tcNo: '',
    photo: '',
    notes: '',
    assignedSchools: [] as string[],
    assignedAreas: [] as string[],
    assignedVehicles: [] as string[],
    assignedDrivers: [] as string[],
    assignedHostesses: [] as string[]
  });

  const [newAreaInput, setNewAreaInput] = useState('');

  // Fetch data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const usersRes = await ApiClient.fetchUsers();
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      
      const logsRes = await ApiClient.fetchAssignmentLogs();
      if (logsRes.success && logsRes.data) {
        setAuditLogs(logsRes.data);
      }
    } catch (err: any) {
      console.error('Error loading personnel/logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and Drop or select photo uploader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Hata: Fotoğraf boyutu 2MB\'den küçük olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Filter lists
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.tcNo && user.tcNo.includes(searchTerm));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredLogs = auditLogs.filter(log => {
    const searchLower = logSearch.toLowerCase();
    return (
      log.actorName.toLowerCase().includes(searchLower) ||
      log.targetName.toLowerCase().includes(searchLower) ||
      log.fieldName.toLowerCase().includes(searchLower) ||
      log.oldValue.toLowerCase().includes(searchLower) ||
      log.newValue.toLowerCase().includes(searchLower) ||
      log.ipAddress.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFormError(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      role: 'coordinator',
      status: 'active',
      tcNo: '',
      photo: '',
      notes: '',
      assignedSchools: [],
      assignedAreas: [],
      assignedVehicles: [],
      assignedDrivers: [],
      assignedHostesses: []
    });
    setNewAreaInput('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setEditingUserId(user.id);
    setFormError(null);
    
    // Parse JSON safely
    const parseField = (fieldVal: any) => {
      if (!fieldVal) return [];
      if (Array.isArray(fieldVal)) return fieldVal;
      try {
        return JSON.parse(fieldVal);
      } catch (e) {
        return [];
      }
    };

    setFormData({
      name: user.name || '',
      username: user.username || '',
      password: '', // do not expose password hash
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'coordinator',
      status: user.status || 'active',
      tcNo: user.tcNo || '',
      photo: user.photo || '',
      notes: user.notes || '',
      assignedSchools: parseField(user.assignedSchools),
      assignedAreas: parseField(user.assignedAreas),
      assignedVehicles: parseField(user.assignedVehicles),
      assignedDrivers: parseField(user.assignedDrivers),
      assignedHostesses: parseField(user.assignedHostesses)
    });
    setNewAreaInput('');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const activeUser = users.find(u => u.username === 'berkaytur');
    if (name === 'berkaytur' || id === activeUser?.id) {
      alert("❌ Hata!\n\nAna yönetici (Super Admin) hesabı silinemez.");
      return;
    }
    const confirmed = window.confirm(`⚠️ Dikkat!\n\n"${name}" isimli personeli silmek istediğinize emin misiniz? Bu işlem yetkilendirmeleri iptal edecek ve erişimi kalıcı olarak kapatacaktır.`);
    if (confirmed) {
      try {
        const res = await ApiClient.deleteUser(id);
        if (res.success) {
          alert('✅ Personel başarıyla silindi.');
          loadData();
        } else {
          alert(`Hata: ${res.error || 'Silme işlemi başarısız oldu.'}`);
        }
      } catch (err: any) {
        alert(`Sistem hatası: ${err.message}`);
      }
    }
  };

  // Toggle checklist methods
  const handleToggleItem = (field: 'assignedSchools' | 'assignedVehicles' | 'assignedDrivers' | 'assignedHostesses', id: string) => {
    const current = [...formData[field]];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setFormData(prev => ({ ...prev, [field]: current }));
  };

  const handleAddArea = () => {
    if (!newAreaInput.trim()) return;
    const cleanArea = newAreaInput.trim();
    if (!formData.assignedAreas.includes(cleanArea)) {
      setFormData(prev => ({
        ...prev,
        assignedAreas: [...prev.assignedAreas, cleanArea]
      }));
    }
    setNewAreaInput('');
  };

  const handleRemoveArea = (index: number) => {
    const updated = [...formData.assignedAreas];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, assignedAreas: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict Validations for mandatory fields
    if (!formData.name.trim()) return setFormError('Ad Soyadı alanı zorunludur.');
    if (!formData.tcNo.trim() || formData.tcNo.length !== 11 || !/^\d+$/.test(formData.tcNo)) {
      return setFormError('T.C. Kimlik Numarası 11 haneli rakamlardan oluşmalıdır.');
    }
    if (!formData.phone.trim()) return setFormError('Telefon Numarası alanı zorunludur.');
    if (!formData.email.trim() || !formData.email.includes('@')) {
      return setFormError('Geçerli bir E-posta adresi girilmesi zorunludur.');
    }
    if (!formData.username.trim() || formData.username.length < 3) {
      return setFormError('Kullanıcı Adı en az 3 karakter olmalıdır.');
    }
    if (!editingUserId && (!formData.password || formData.password.length < 4)) {
      return setFormError('Yeni personel için en az 4 karakterli Şifre belirlenmelidir.');
    }
    if (!formData.photo) {
      return setFormError('Lütfen personelin Fotoğrafını yükleyin (Zorunlu alan).');
    }
    if (!formData.notes.trim()) {
      return setFormError('Lütfen personel hakkında Notlar/Görev Açıklaması girin (Zorunlu alan).');
    }

    try {
      setIsLoading(true);
      const payload: any = { ...formData };
      if (!editingUserId) {
        // Create
        const res = await ApiClient.createUser(payload);
        if (res.success) {
          alert('✅ Personel kaydı ve ilk giriş şifresi başarıyla oluşturuldu.');
          setIsFormOpen(false);
          loadData();
        } else {
          setFormError(res.error || 'Kayıt işlemi başarısız.');
        }
      } else {
        // Edit
        if (!formData.password) {
          delete payload.password; // Do not update password unless filled
        }
        const res = await ApiClient.updateUser(editingUserId, payload);
        if (res.success) {
          alert('✅ Personel bilgileri ve görev atamaları başarıyla güncellendi.');
          setIsFormOpen(false);
          loadData();
        } else {
          setFormError(res.error || 'Güncelleme işlemi başarısız.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Bir sistem hatası oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const translateRole = (role: string) => {
    switch (role) {
      case 'admin': return 'Sistem Yöneticisi';
      case 'manager': return 'Proje Müdürü';
      case 'coordinator': return 'Okul Sorumlusu';
      case 'accounting': return 'Muhasebe';
      case 'operation': return 'Operasyon';
      case 'driver': return 'Servis Şoförü';
      case 'hostess': return 'Rehber / Hostes';
      default: return role;
    }
  };

  const translateField = (field: string) => {
    switch (field) {
      case 'user_created': return 'Kullanıcı Oluşturuldu';
      case 'user_deleted': return 'Kullanıcı Silindi';
      case 'status': return 'Erişim Durumu';
      case 'role': return 'Rol';
      case 'assignedSchools': return 'Okul Ataması';
      case 'assignedAreas': return 'Bölge Ataması';
      case 'assignedVehicles': return 'Araç Görevlendirme';
      case 'assignedDrivers': return 'Şoför Görevlendirme';
      case 'assignedHostesses': return 'Hostes Görevlendirme';
      default: return field;
    }
  };

  // Drivers and Hostesses from store users list
  const activeDrivers = storeUsers.filter(u => u.role === 'driver');
  const activeHostesses = storeUsers.filter(u => u.role === 'hostess');

  return (
    <div className="space-y-6 animate-fade-in" id="user-assignment-manager">
      
      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('personnel')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'personnel'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Personel & Atama Paneli
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> Atama Denetim Geçmişi (Audit Logs)
        </button>
      </div>

      {activeSubTab === 'personnel' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" /> Merkez Yönetim ve Atamalar
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Super Admin tarafından şirket personellerinin oluşturulması, görev ve yetkilendirme atamaları.
              </p>
            </div>
            
            <button
              onClick={handleOpenCreate}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              <UserPlus className="w-4 h-4" /> Yeni Personel Oluştur
            </button>
          </div>

          {/* Filtering */}
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="İsim, T.C., kullanıcı adı, telefon veya e-posta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
              </span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500 appearance-none"
              >
                <option value="all">Tüm Roller (Filtrele)</option>
                <option value="manager">Proje Müdürü</option>
                <option value="coordinator">Okul Sorumlusu</option>
                <option value="accounting">Muhasebe</option>
                <option value="operation">Operasyon</option>
                <option value="driver">Servis Şoförü</option>
                <option value="hostess">Rehber / Hostes</option>
                <option value="admin">Sistem Yöneticisi (Admin)</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-xs font-semibold text-slate-400 pr-2">
              Toplam Aktif Personel: <span className="text-slate-800 font-bold ml-1">{filteredUsers.length}</span>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold">
                    <th className="px-6 py-4">Fotoğraf & Personel</th>
                    <th className="px-6 py-4">Kimlik / T.C. No</th>
                    <th className="px-6 py-4">Giriş Hesabı</th>
                    <th className="px-6 py-4">Atanan Okullar / Bölgeler</th>
                    <th className="px-6 py-4">Atanan Kaynaklar (Araç/Şoför/Hostes)</th>
                    <th className="px-6 py-4">Erişim Durumu</th>
                    <th className="px-6 py-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((user) => {
                    const parseField = (fieldVal: any) => {
                      if (!fieldVal) return [];
                      if (Array.isArray(fieldVal)) return fieldVal;
                      try { return JSON.parse(fieldVal); } catch (e) { return []; }
                    };

                    const uSchools = schools.filter(s => parseField(user.assignedSchools).includes(s.id));
                    const uAreas = parseField(user.assignedAreas);
                    const uVehicles = vehicles.filter(v => parseField(user.assignedVehicles).includes(v.id));
                    const uDrivers = storeUsers.filter(d => parseField(user.assignedDrivers).includes(d.id));
                    const uHostesses = storeUsers.filter(h => parseField(user.assignedHostesses).includes(h.id));

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                              {user.photo ? (
                                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Users className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {user.name}
                              </div>
                              <div className="text-[10px] text-blue-500 font-bold tracking-wider mt-0.5 uppercase">
                                {translateRole(user.role)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900 font-bold">{user.tcNo || 'Belirtilmedi'}</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">{user.phone}</div>
                          {user.email && <div className="text-slate-400 text-[10px]">{user.email}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-slate-800 font-bold">@{user.username}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {user.mustChangePassword ? (
                              <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-sm">⚠️ İlk girişte şifre değiştirecek</span>
                            ) : (
                              <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-sm">Şifre Değiştirildi</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.role === 'admin' ? (
                            <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Tüm Sistem</span>
                          ) : (
                            <div className="space-y-1">
                              {uSchools.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {uSchools.map(s => (
                                    <span key={s.id} className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md">
                                      🏫 {s.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {uAreas.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {uAreas.map((area: string, idx: number) => (
                                    <span key={idx} className="text-[9px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-md">
                                      📍 {area}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {uSchools.length === 0 && uAreas.length === 0 && (
                                <span className="text-slate-400 italic text-[11px]">Kısıtlı / Atama Yok</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.role === 'admin' ? (
                            <span className="text-slate-400 italic">-</span>
                          ) : (
                            <div className="space-y-1">
                              {uVehicles.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {uVehicles.map(v => (
                                    <span key={v.id} className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                                      🚍 {v.plate}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {uDrivers.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {uDrivers.map(d => (
                                    <span key={d.id} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md">
                                      👨‍✈️ {d.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {uHostesses.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {uHostesses.map(h => (
                                    <span key={h.id} className="text-[9px] font-bold bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded-md">
                                      👩‍💼 {h.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {uVehicles.length === 0 && uDrivers.length === 0 && uHostesses.length === 0 && (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}>
                            {user.status === 'active' ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                              title="Düzenle / Görev Ataması Yap"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.name)}
                              className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                              title="Sil"
                              disabled={user.username === 'berkaytur'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 italic bg-slate-50/50">
                        Arama kriterlerine uygun personel bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="space-y-6">
          {/* Logs Filtering */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" /> Atama Değişiklik Günlükleri (Audit Trail)
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Sistem üzerinde gerçekleştirilen tüm görev, rol, statü ve kapsam atamaları kriptografik silinemez günlükler şeklinde kayıt altındadır.
              </p>
            </div>
            
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Aktör, hedef, alan veya IP ara..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold">
                    <th className="px-6 py-4">Tarih / Saat</th>
                    <th className="px-6 py-4">İşlemi Yapan (Aktör)</th>
                    <th className="px-6 py-4">Etkilenen Personel (Hedef)</th>
                    <th className="px-6 py-4">Değiştirilen Görev/Alan</th>
                    <th className="px-6 py-4">Eski Değer</th>
                    <th className="px-6 py-4">Yeni Değer</th>
                    <th className="px-6 py-4">IP / Tarayıcı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 text-slate-400 font-bold whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-bold">
                        {log.actorName}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-bold">
                        {log.targetName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px]">
                          {translateField(log.fieldName)}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[150px] truncate text-rose-600 font-bold" title={log.oldValue}>
                        {log.oldValue === '[]' || !log.oldValue ? '(Yok/Boş)' : log.oldValue}
                      </td>
                      <td className="px-6 py-4 max-w-[150px] truncate text-emerald-600 font-bold" title={log.newValue}>
                        {log.newValue === '[]' || !log.newValue ? '(Yok/Boş)' : log.newValue}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-[10px]" title={log.userAgent}>
                        <div className="font-mono">{log.ipAddress}</div>
                        <div className="truncate max-w-[120px]">{log.userAgent}</div>
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 italic bg-slate-50/50">
                        Atama denetim günlüğü bulunmamaktadır.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sliding Panel or Modal for Creation / Edition */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-fade-in" id="user-form-modal">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-8 shadow-2xl flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    {editingUserId ? 'Personel Görev Düzenleme' : 'Yeni Personel Atama & Kayıt'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Production ortamına atanacak personelin kimlik, fotoğraf ve görev sınırları.
                  </p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)} 
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Photo Upload Box */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Personel Fotoğrafı (Zorunlu)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center relative group">
                      {formData.photo ? (
                        <img src={formData.photo} alt="Upload Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Image className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        id="photo-file-upload" 
                        className="hidden" 
                      />
                      <label 
                        htmlFor="photo-file-upload" 
                        className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Image className="w-3.5 h-3.5 text-blue-500" /> Fotoğraf Seç / Yükle
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">PNG, JPG, maks 2MB. Otomatik olarak optimize edilip veritabanına kodlanır.</p>
                    </div>
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Personel Unvanı / Sistemi Rolü</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {[
                      { id: 'manager', label: 'Proje Müdürü' },
                      { id: 'coordinator', label: 'Okul Sorumlusu' },
                      { id: 'accounting', label: 'Muhasebe' },
                      { id: 'operation', label: 'Operasyon' }
                    ].map(role => (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => setFormData(prev => ({ ...prev, role: role.id as UserRole }))}
                        className={`p-3 rounded-xl border font-bold text-left transition-all ${
                          formData.role === role.id
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 inline mr-1.5" />
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Identity info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Ad Soyad (Zorunlu)</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-slate-800"
                      placeholder="Örn: Berkay Saltık"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">T.C. Kimlik No (Zorunlu)</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={formData.tcNo}
                      onChange={e => setFormData(prev => ({ ...prev, tcNo: e.target.value.replace(/\D/g, '') }))}
                      className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold font-mono text-slate-800"
                      placeholder="11 Haneli TC giriniz"
                    />
                  </div>
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Telefon Numarası (Zorunlu)</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-slate-800"
                      placeholder="Örn: 0532 123 4567"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">E-posta Adresi (Zorunlu)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-slate-800"
                      placeholder="Örn: festival@gmail.com"
                    />
                  </div>
                </div>

                {/* Username and Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Giriş Kullanıcı Adı (Zorunlu)</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                      className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-slate-800"
                      placeholder="Örn: berkay"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">
                      {editingUserId ? 'Şifre Değiştir (İsteğe Bağlı)' : 'Başlangıç Şifresi (Zorunlu)'}
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-slate-800"
                        placeholder={editingUserId ? 'Değiştirmek için yazın' : 'En az 4 karakter'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 inset-y-0 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Erişim Durumu (Zorunlu)</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="radio"
                        name="status"
                        checked={formData.status === 'active'}
                        onChange={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>Aktif (Sisteme Giriş Yetkisi Açık)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="radio"
                        name="status"
                        checked={formData.status === 'inactive'}
                        onChange={() => setFormData(prev => ({ ...prev, status: 'inactive' }))}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>Pasif (Kilitli / Askıya Alındı)</span>
                    </label>
                  </div>
                </div>

                {/* Notes/Role Details */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Görev Notları / Bilgiler (Zorunlu)</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-slate-800"
                    placeholder="Personelin sistemdeki rolü, görev kapsamı ve kurumsal notları..."
                  />
                </div>

                {/* ================================================= */}
                {/* ADVANCED MULTI ASSIGNMENTS SECTION               */}
                {/* ================================================= */}
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-600" /> Kapsam & Görev Yetkilendirme (Multi-Assignment)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold -mt-2">
                    Seçtiğiniz kaynaklara ait olmayan tüm veriler (öğrenciler, ödemeler, hakedişler vs.) bu personelden tamamen gizlenecektir.
                  </p>

                  {/* Schools checklist */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
                      🏫 Atanan Okullar ({formData.assignedSchools.length} Seçildi)
                    </label>
                    <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                      {schools.map(school => {
                        const isChecked = formData.assignedSchools.includes(school.id);
                        return (
                          <label key={school.id} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-all">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem('assignedSchools', school.id)}
                              className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                            />
                            <span className="font-bold text-slate-700 text-xs">{school.name}</span>
                            <span className="text-[9px] text-slate-400">({school.district})</span>
                          </label>
                        );
                      })}
                      {schools.length === 0 && (
                        <div className="text-slate-400 italic text-[11px] py-1 text-center">Okul bulunmuyor.</div>
                      )}
                    </div>
                  </div>

                  {/* Working Areas / Regions */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
                      📍 Atanan Bölgeler / İlçeler
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAreaInput}
                        onChange={e => setNewAreaInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddArea(); } }}
                        placeholder="Örn: Sancaktepe, Çekmeköy..."
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleAddArea}
                        className="px-3.5 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition-all text-xs"
                      >
                        Ekle
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.assignedAreas.map((area, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md font-bold text-[10px]">
                          {area}
                          <button
                            type="button"
                            onClick={() => handleRemoveArea(idx)}
                            className="text-purple-400 hover:text-purple-700 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {formData.assignedAreas.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic font-medium">Bölge atanmadı.</span>
                      )}
                    </div>
                  </div>

                  {/* Vehicles Checklist */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
                      🚍 Atanan Araçlar / Plakalar ({formData.assignedVehicles.length} Seçildi)
                    </label>
                    <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                      {vehicles.map(v => {
                        const isChecked = formData.assignedVehicles.includes(v.id);
                        return (
                          <label key={v.id} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-all">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem('assignedVehicles', v.id)}
                              className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                            />
                            <span className="font-mono font-bold text-slate-700 text-xs">{v.plate}</span>
                            <span className="text-[9px] text-slate-400">({v.brand} {v.model})</span>
                          </label>
                        );
                      })}
                      {vehicles.length === 0 && (
                        <div className="text-slate-400 italic text-[11px] py-1 text-center">Kayıtlı araç bulunmuyor.</div>
                      )}
                    </div>
                  </div>

                  {/* Drivers Checklist */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
                      👨‍✈️ Atanan Sürücüler / Şoförler ({formData.assignedDrivers.length} Seçildi)
                    </label>
                    <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                      {activeDrivers.map(d => {
                        const isChecked = formData.assignedDrivers.includes(d.id);
                        return (
                          <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-all">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem('assignedDrivers', d.id)}
                              className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                            />
                            <span className="font-bold text-slate-700 text-xs">{d.name}</span>
                          </label>
                        );
                      })}
                      {activeDrivers.length === 0 && (
                        <div className="text-slate-400 italic text-[11px] py-1 text-center font-medium">Sistemde tanımlı şoför rolünde kullanıcı bulunmuyor.</div>
                      )}
                    </div>
                  </div>

                  {/* Hostesses Checklist */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
                      👩‍💼 Atanan Rehberler / Hostesler ({formData.assignedHostesses.length} Seçildi)
                    </label>
                    <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                      {activeHostesses.map(h => {
                        const isChecked = formData.assignedHostesses.includes(h.id);
                        return (
                          <label key={h.id} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-all">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem('assignedHostesses', h.id)}
                              className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                            />
                            <span className="font-bold text-slate-700 text-xs">{h.name}</span>
                          </label>
                        );
                      })}
                      {activeHostesses.length === 0 && (
                        <div className="text-slate-400 italic text-[11px] py-1 text-center font-medium">Sistemde tanımlı hostes rolünde kullanıcı bulunmuyor.</div>
                      )}
                    </div>
                  </div>

                </div>

              </form>
            </div>

            {/* Form Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 font-bold transition-all cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/10"
              >
                <Check className="w-4 h-4" /> {editingUserId ? 'Atamaları ve Personeli Güncelle' : 'Personel Kaydını Tamamla'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
