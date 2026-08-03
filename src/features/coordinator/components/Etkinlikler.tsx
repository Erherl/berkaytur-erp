/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Vehicle, User } from '../../../types';
import { 
  Calendar, MapPin, Truck, Users, Send, CheckCircle2, 
  Plus, Tag, Ticket, Trash2, Clock, Map 
} from 'lucide-react';

interface EtkinliklerProps {
  vehicles: Vehicle[];
  drivers: User[];
  hostesses: User[];
  onAddLog: (action: string, details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

interface EventRecord {
  id: string;
  title: string;
  destination: string;
  date: string;
  time: string;
  primaryVehiclePlate: string;
  extraVehiclePlate?: string;
  driverName: string;
  hostessName: string;
  isPaid: boolean;
  price?: number;
  status: 'Planlandı' | 'Yola Çıktı' | 'Tamamlandı';
}

export default function Etkinlikler({
  vehicles, drivers, hostesses, onAddLog, onAddNotification
}: EtkinliklerProps) {
  // Existing/active events list state
  const [events, setEvents] = useState<EventRecord[]>([
    {
      id: 'evt_1',
      title: 'Anıtkabir Kültür Gezisi',
      destination: 'Anıtkabir, Ankara',
      date: '2026-07-20',
      time: '09:30',
      primaryVehiclePlate: '06 BKT 123',
      extraVehiclePlate: '06 BKT 456',
      driverName: 'Ahmet Yılmaz',
      hostessName: 'Ayşe Yıldız',
      isPaid: false,
      status: 'Planlandı'
    },
    {
      id: 'evt_2',
      title: 'MTA Müzesi ve Bilim Şenliği',
      destination: 'MTA Müzesi, Çankaya',
      date: '2026-07-15',
      time: '13:00',
      primaryVehiclePlate: '06 BKT 456',
      driverName: 'Ahmet Yılmaz',
      hostessName: 'Ayşe Yıldız',
      isPaid: true,
      price: 150,
      status: 'Planlandı'
    }
  ]);

  // Event creation form states
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('2026-07-22');
  const [time, setTime] = useState('09:00');
  const [primaryVehicleId, setPrimaryVehicleId] = useState('');
  const [extraVehicleId, setExtraVehicleId] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('150');

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !destination || !primaryVehicleId) {
      alert("Lütfen başlık, lokasyon ve ana servis aracını seçiniz!");
      return;
    }

    const primaryV = vehicles.find(v => v.id === primaryVehicleId);
    const extraV = vehicles.find(v => v.id === extraVehicleId);
    
    const driver = drivers.find(d => d.id === primaryV?.driverId) || drivers[0];
    const hostess = hostesses.find(h => h.id === primaryV?.hostessId) || hostesses[0];

    const newEvent: EventRecord = {
      id: `evt_${Date.now()}`,
      title,
      destination,
      date,
      time,
      primaryVehiclePlate: primaryV?.plate || 'Bilinmiyor',
      extraVehiclePlate: extraV?.plate || undefined,
      driverName: driver?.name || 'Ahmet Yılmaz',
      hostessName: hostess?.name || 'Ayşe Yıldız',
      isPaid,
      price: isPaid ? parseInt(price) : undefined,
      status: 'Planlandı'
    };

    setEvents([newEvent, ...events]);
    
    // Log and Fire Notification
    onAddLog('Etkinlik Gezisi Oluşturuldu', `Yeni Gezi: ${title} (${destination}) planlandı.`);
    onAddNotification(
      '📅 Yeni Gezi/Etkinlik Bildirimi',
      `"${title}" okul dışı gezi faaliyeti oluşturuldu. ${newEvent.primaryVehiclePlate} plakalı araç atandı. Velilere onay ve ücret bildirimleri otomatik gönderildi.`,
      'success'
    );

    alert(`🎉 Gezi Başvuru ve Ataması Tamamlandı!\n\nGezi: ${title}\nÜcret: ${isPaid ? price + ' TL' : 'ÜCRETSİZ'}\n\nVelilere mobil bildirim ve SMS otomatik gönderilmiştir.`);
    
    // Reset Form
    setTitle('');
    setDestination('');
    setPrimaryVehicleId('');
    setExtraVehicleId('');
    setIsPaid(false);
  };

  const handleDeleteEvent = (id: string) => {
    const target = events.find(e => e.id === id);
    setEvents(events.filter(e => e.id !== id));
    if (target) {
      onAddLog('Etkinlik İptal Edildi', `Gezi İptali: ${target.title}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* EVENT CREATION FORM */}
      <form 
        onSubmit={handleCreateEvent}
        className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4"
      >
        <div className="border-b border-slate-100 pb-2">
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <Calendar className="w-5 h-5 text-blue-600" /> Gezi / Etkinlik Oluşturucu
          </h4>
          <p className="text-[10px] text-slate-400">Okul dışı gezi etkinlikleri oluşturun, ek yedek araçlar ve kadrolar planlayın.</p>
        </div>

        <div className="space-y-3 text-xs">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Etkinlik / Gezi Adı</label>
            <input
              type="text"
              required
              placeholder="Örn: AKM Bilim Şenliği Gezisi"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Gidilecek Lokasyon (Hedef)</label>
            <input
              type="text"
              required
              placeholder="Örn: AKM Kültür Merkezi, Ulus"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Gezi Tarihi</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Hareket Saati</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Primary vehicle allocation */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Birinci Asil Araç</label>
            <select
              required
              value={primaryVehicleId}
              onChange={e => setPrimaryVehicleId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="">Seçiniz...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>🚌 {v.plate} ({v.brand})</option>
              ))}
            </select>
          </div>

          {/* Secondary vehicle (Ek araç ekleme) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Ek / Yedek Araç (İsteğe Bağlı)</label>
            <select
              value={extraVehicleId}
              onChange={e => setExtraVehicleId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="">Yedek Araç Yok</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>🚌 {v.plate} ({v.brand})</option>
              ))}
            </select>
          </div>

          {/* Fee / Free toggler */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Bilet / Katılım Bedeli</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPaid(false)}
                className={`flex-1 py-2 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                  !isPaid 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Ücretsiz
              </button>
              <button
                type="button"
                onClick={() => setIsPaid(true)}
                className={`flex-1 py-2 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                  isPaid 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Ücretli (Biletli)
              </button>
            </div>
          </div>

          {isPaid && (
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Kişi Başı Katılım Ücreti (TL)</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
        >
          <Send className="w-4 h-4" /> Etkinliği Yayınla & Velilere İlet
        </button>
      </form>

      {/* PLANNED EVENTS LIST */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h4 className="font-extrabold text-slate-800 text-sm">Yayınlanan Okul Dışı Gezi Planları</h4>
          <p className="text-[10px] text-slate-400">Okulunuza tanımlı, velilerin de onay ekranına düşen tüm faaliyetler.</p>
        </div>

        <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
          {events.map(evt => (
            <div 
              key={evt.id}
              className="p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-extrabold uppercase">
                    {evt.status}
                  </span>
                  {evt.isPaid ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-0.5">
                      <Ticket className="w-2.5 h-2.5" /> Biletli: {evt.price} TL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-0.5">
                      ÜCRETSİZ
                    </span>
                  )}
                </div>

                <h5 className="font-bold text-slate-800 text-sm">{evt.title}</h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">📍 {evt.destination}</span>
                  <span className="flex items-center gap-1">📅 {evt.date} • 🕒 {evt.time}</span>
                  <span className="flex items-center gap-1">🚌 {evt.primaryVehiclePlate} {evt.extraVehiclePlate && `+ Ek: ${evt.extraVehiclePlate}`}</span>
                  <span className="flex items-center gap-1">👤 Şoför: {evt.driverName}</span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteEvent(evt.id)}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                title="Etkinliği İptal Et"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-xs">
              Planlanmış herhangi bir gezi veya etkinlik kaydı bulunmamaktadır.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
