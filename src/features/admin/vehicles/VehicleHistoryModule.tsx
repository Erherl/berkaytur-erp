/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DetailedVehicle, VehicleHistoryItem } from './vehicleTypes';
import { 
  History, Calendar, School, User, Wrench, Fuel, DollarSign,
  AlertTriangle, CheckSquare, ListFilter, Trash2, Plus
} from 'lucide-react';

interface VehicleHistoryModuleProps {
  vehicle: DetailedVehicle;
  onAddHistoryItem?: (itemId: string, item: Omit<VehicleHistoryItem, 'id'>) => void;
}

const TYPE_CONFIG = {
  school: { label: 'Okul / Güzergah', icon: School, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  driver: { label: 'Şoför Ataması', icon: User, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  hostess: { label: 'Hostes Ataması', icon: User, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  repair: { label: 'Tamir / Bakım', icon: Wrench, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  fuel: { label: 'Yakıt Alımı', icon: Fuel, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  accrual: { label: 'Hakediş', icon: DollarSign, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  penalty: { label: 'Ceza / Kusur', icon: AlertTriangle, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  audit: { label: 'Denetim', icon: CheckSquare, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
};

export default function VehicleHistoryModule({ vehicle, onAddHistoryItem }: VehicleHistoryModuleProps) {
  const [filter, setFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'school' as VehicleHistoryItem['type'],
    title: '',
    details: '',
    cost: ''
  });

  const filteredHistory = filter === 'all' 
    ? vehicle.history 
    : vehicle.history.filter(item => item.type === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.details) return;

    if (onAddHistoryItem) {
      onAddHistoryItem(vehicle.id, {
        date: newItem.date,
        type: newItem.type,
        title: newItem.title,
        details: newItem.details,
        cost: newItem.cost ? parseFloat(newItem.cost) : undefined
      });
    }

    setNewItem({
      date: new Date().toISOString().split('T')[0],
      type: 'school',
      title: '',
      details: '',
      cost: ''
    });
    setShowAddForm(false);
  };

  // Stats calculation
  const totalRepairCost = vehicle.history
    .filter(h => h.type === 'repair' && h.cost)
    .reduce((sum, h) => sum + (h.cost || 0), 0);

  const totalFuelCost = vehicle.history
    .filter(h => h.type === 'fuel' && h.cost)
    .reduce((sum, h) => sum + (h.cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Filter Option */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" /> Araç Ömrü & Operasyon Geçmişi
          </h4>
          <p className="text-slate-500 text-[11px] font-medium">Bu araca dair tüm zimmet, yakıt, hasar, ceza ve denetim kayıtları.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ListFilter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-1.5 border bg-white rounded-lg text-xs font-bold"
          >
            <option value="all">Tüm Geçmiş</option>
            <option value="school">Okul Geçmişi</option>
            <option value="driver">Şoför Geçmişi</option>
            <option value="hostess">Hostes Geçmişi</option>
            <option value="repair">Tamir & Bakım</option>
            <option value="fuel">Yakıt Geçmişi</option>
            <option value="accrual">Hakediş Geçmişi</option>
            <option value="penalty">Cezalar</option>
            <option value="audit">Denetimler</option>
          </select>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Kayıt Ekle
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
        <div className="bg-orange-50 text-orange-800 p-3.5 rounded-xl border border-orange-100 flex justify-between items-center">
          <span className="flex items-center gap-1.5">🔧 Toplam Bakım Gideri:</span>
          <span className="font-mono text-sm font-black">{totalRepairCost.toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className="bg-amber-50 text-amber-800 p-3.5 rounded-xl border border-amber-100 flex justify-between items-center">
          <span className="flex items-center gap-1.5">⛽ Toplam Yakıt Gideri:</span>
          <span className="font-mono text-sm font-black">{totalFuelCost.toLocaleString('tr-TR')} ₺</span>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-4 animate-fade-in">
          <h5 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5">Yeni Operasyon Geçmişi Ekle</h5>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase">Tarih</label>
              <input 
                type="date" 
                value={newItem.date} 
                onChange={e => setNewItem({ ...newItem, date: e.target.value })} 
                className="p-2 border bg-white rounded-lg w-full font-semibold"
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase">Kayıt Türü</label>
              <select
                value={newItem.type}
                onChange={e => setNewItem({ ...newItem, type: e.target.value as any })}
                className="p-2 border bg-white rounded-lg w-full font-bold"
              >
                <option value="school">Okul / Güzergah</option>
                <option value="driver">Şoför Ataması</option>
                <option value="hostess">Hostes Ataması</option>
                <option value="repair">Tamir / Bakım</option>
                <option value="fuel">Yakıt Alımı</option>
                <option value="accrual">Hakediş</option>
                <option value="penalty">Ceza / Kusur</option>
                <option value="audit">Denetim</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase">Başlık / İşlem</label>
              <input 
                type="text" 
                placeholder="Örn: Egzersiz Kayışı Yenilendi" 
                value={newItem.title} 
                onChange={e => setNewItem({ ...newItem, title: e.target.value })} 
                className="p-2 border bg-white rounded-lg w-full font-semibold"
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase">Detaylı Açıklama</label>
              <input 
                type="text" 
                placeholder="Örn: Sol alternatör kayışı değişti, şarj kontrol edildi." 
                value={newItem.details} 
                onChange={e => setNewItem({ ...newItem, details: e.target.value })} 
                className="p-2 border bg-white rounded-lg w-full font-semibold"
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase">Tutar (Opsiyonel ₺)</label>
              <input 
                type="number" 
                placeholder="Örn: 2450" 
                value={newItem.cost} 
                onChange={e => setNewItem({ ...newItem, cost: e.target.value })} 
                className="p-2 border bg-white rounded-lg w-full font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer hover:bg-slate-300"
            >
              Vazgeç
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black cursor-pointer hover:bg-blue-500"
            >
              Kaydet
            </button>
          </div>
        </form>
      )}

      {/* History Timeline */}
      {filteredHistory.length > 0 ? (
        <div className="relative border-l-2 border-slate-200 pl-6 ml-3 space-y-5">
          {filteredHistory.map((item, idx) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.school;
            const IconComp = cfg.icon;

            return (
              <div key={item.id || idx} className="relative group">
                {/* Timeline Dot with Icon */}
                <span className={`absolute -left-10 top-1.5 w-8 h-8 rounded-full border flex items-center justify-center shadow-xs transition-all ${cfg.color}`}>
                  <IconComp className="w-3.5 h-3.5" />
                </span>

                <div className="p-4 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-2xl shadow-xs space-y-1.5 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[10px] font-black text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.date}
                    </span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 border text-slate-600 self-start sm:self-auto">
                      {cfg.label}
                    </span>
                  </div>

                  <h5 className="font-extrabold text-slate-800 text-sm tracking-tight leading-none">{item.title}</h5>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">{item.details}</p>

                  {item.cost && (
                    <div className="pt-2 flex justify-end">
                      <span className="text-xs font-mono font-black text-slate-700 px-3 py-1 bg-slate-100 rounded-lg">
                        Maliyet: {item.cost.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-400 italic text-center py-8 bg-slate-50 rounded-2xl border border-dashed font-medium">Bu kategori için kayıtlı geçmiş bulunamadı.</p>
      )}
    </div>
  );
}
