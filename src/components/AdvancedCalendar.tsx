/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  Clock, MapPin, CheckCircle, Trash2, Tag, CalendarDays
} from 'lucide-react';

export default function AdvancedCalendar() {
  const { calendarEvents, addCalendarEvent, deleteCalendarEvent } = useAppStore();
  
  const [currentDate, setCurrentDate] = useState(new Date('2026-07-15'));
  const [filterType, setFilterType] = useState<string>('all');
  
  // Event Add states
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-07-15');
  const [newEventCategory, setNewEventCategory] = useState<'school' | 'holiday' | 'event' | 'maintenance' | 'insurance' | 'payment' | 'payout'>('event');
  const [newEventDesc, setNewEventDesc] = useState('');

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    let color = '#3b82f6'; // default blue
    if (newEventCategory === 'holiday') color = '#ef4444';
    else if (newEventCategory === 'maintenance') color = '#f59e0b';
    else if (newEventCategory === 'insurance') color = '#ec4899';
    else if (newEventCategory === 'payout') color = '#10b981';
    else if (newEventCategory === 'payment') color = '#a855f7';

    addCalendarEvent({
      title: newEventTitle,
      date: newEventDate,
      type: newEventCategory,
      description: newEventDesc,
      color
    });

    setNewEventTitle('');
    setNewEventDesc('');
    setShowAddEvent(false);
  };

  // Generate calendar days for the current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0, Monday is 1, etc.
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Adjust first day to start on Monday for Turkish standard
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < adjustedFirstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(i);
  }

  // Categories helper
  const categories = [
    { id: 'all', label: 'Tüm Görevler', color: 'bg-slate-500' },
    { id: 'school', label: 'Okul Açılışı / Servis', color: 'bg-blue-500' },
    { id: 'holiday', label: 'Resmi Tatiller', color: 'bg-red-500' },
    { id: 'maintenance', label: 'Araç Bakım', color: 'bg-amber-500' },
    { id: 'insurance', label: 'Sigorta / Muayene', color: 'bg-pink-500' },
    { id: 'payment', label: 'Tahsilat', color: 'bg-purple-500' },
    { id: 'payout', label: 'Hakediş Günü', color: 'bg-emerald-500' },
  ];

  const getFilteredEvents = () => {
    if (filterType === 'all') return calendarEvents;
    return calendarEvents.filter(e => e.type === filterType);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] bg-amber-100 text-amber-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide">
            ORTAK GÖREV TAKVİMİ
          </span>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">Gelişmiş ERP Takvimi</h3>
          <p className="text-xs text-slate-500">Araç bakımları, fenni muayeneler, hakedişler ve tahsilat tarihlerini tek bir takvimden izleyin.</p>
        </div>
        
        <button
          onClick={() => setShowAddEvent(!showAddEvent)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Yeni Görev / Etkinlik
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterType(cat.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
              filterType === cat.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${cat.color}`} />
            {cat.label}
          </button>
        ))}
      </div>

      {showAddEvent && (
        <form onSubmit={handleAddSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 animate-fade-in">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Takvime Yeni Görev Tanımla</h4>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Görev / Etkinlik Başlığı</label>
              <input
                type="text"
                required
                placeholder="Örn: 06 BKT 123 Yağ Değişimi"
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Tarih</label>
              <input
                type="date"
                required
                value={newEventDate}
                onChange={e => setNewEventDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Kategori</label>
              <select
                value={newEventCategory}
                onChange={e => setNewEventCategory(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
              >
                <option value="school">Okul / Sefer Başlangıcı</option>
                <option value="holiday">Resmi Tatil</option>
                <option value="event">Sosyal Etkinlik / Gezi</option>
                <option value="maintenance">Araç Periyodik Bakım</option>
                <option value="insurance">Kasko / Koltuk Sigortası</option>
                <option value="payment">Ödeme / Tahsilat</option>
                <option value="payout">Şoför Hakediş Ödemesi</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase">Açıklama / Notlar</label>
            <input
              type="text"
              placeholder="Göreve ait ek notlar ve lokasyon bilgisi..."
              value={newEventDesc}
              onChange={e => setNewEventDesc(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddEvent(false)}
              className="px-4 py-2 bg-slate-200 rounded-lg text-xs font-bold"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-extrabold shadow-xs"
            >
              Takvime Ekle
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Calendar Board */}
        <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-4 bg-slate-50/40">
          <div className="flex items-center justify-between pb-4">
            <h4 className="font-bold text-sm text-slate-800">
              {months[month]} {year}
            </h4>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button onClick={handleNextMonth} className="p-1.5 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Days labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest pb-2">
            <div>Pzt</div>
            <div>Sal</div>
            <div>Çar</div>
            <div>Per</div>
            <div>Cum</div>
            <div>Cmt</div>
            <div>Paz</div>
          </div>

          {/* Grid of days */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-16 bg-transparent" />;
              }

              const formattedDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = getFilteredEvents().filter(e => e.date === formattedDayStr);
              const isToday = formattedDayStr === '2026-07-15';

              return (
                <div 
                  key={`day-${day}`} 
                  className={`h-16 p-1.5 border rounded-xl flex flex-col justify-between transition-all relative ${
                    isToday 
                      ? 'bg-blue-50/50 border-blue-400 ring-1 ring-blue-400' 
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/50'
                  }`}
                >
                  <span className={`text-[10px] font-black ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                    {day}
                  </span>

                  {/* Display dot indicators for events */}
                  <div className="flex flex-wrap gap-0.5 max-h-6 overflow-hidden">
                    {dayEvents.map(evt => (
                      <span 
                        key={evt.id} 
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ backgroundColor: evt.color }}
                        title={evt.title}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected List Panel of Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              Görev Akışı ({getFilteredEvents().length})
            </h4>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {getFilteredEvents().map(evt => (
              <div 
                key={evt.id} 
                className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1.5 shadow-xs relative hover:border-slate-300 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: evt.color }} />
                  <h5 className="font-bold text-xs text-slate-800 leading-tight flex-1">
                    {evt.title}
                  </h5>
                  <button
                    onClick={() => deleteCalendarEvent(evt.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-all p-1"
                    title="Görevi Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                    {evt.date}
                  </span>
                  <span className="capitalize">
                    🏷️ {evt.type}
                  </span>
                </div>

                {evt.description && (
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    {evt.description}
                  </p>
                )}
              </div>
            ))}

            {getFilteredEvents().length === 0 && (
              <div className="text-center py-8 text-slate-400 font-medium text-xs">
                Seçili kriterde kayıtlı görev bulunamadı.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
