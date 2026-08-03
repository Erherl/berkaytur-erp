/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { School } from '../../../types';
import { 
  Bell, CheckCircle2, AlertTriangle, HelpCircle, 
  UserPlus, FileText, Compass, Heart, ClipboardCheck, CalendarRange
} from 'lucide-react';

interface ManagerNotificationsProps {
  schools: School[];
}

export default function ManagerNotifications({ schools }: ManagerNotificationsProps) {
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      schoolId: 's1',
      schoolName: 'Atatürk Anadolu Lisesi',
      title: 'Bugün Gelen Yeni Kayıt',
      description: 'Zeynep Kaya (Sınıf 10-C) için veli başvurusu tamamlandı. Servis hakediş ve mesafe eşleştirmesi bekleniyor.',
      category: 'new_registration',
      time: 'Bugün, 09:24',
      status: 'unread',
      severity: 'info',
    },
    {
      id: 'n2',
      schoolId: 's1',
      schoolName: 'Atatürk Anadolu Lisesi',
      title: 'Tahsilat Tamamlandı',
      description: 'Ece Yıldız velisi Aysel Yıldız tarafından 2,800 TL Temmuz ayı servis taksiti ödendi.',
      category: 'collection',
      time: 'Bugün, 11:15',
      status: 'unread',
      severity: 'success',
    },
    {
      id: 'n3',
      schoolId: 's2',
      schoolName: 'Cumhuriyet İlkokulu',
      title: 'Onay Bekleyen Sözleşme',
      description: 'BERKAYTUR Taşıma Hizmetleri sözleşmesi 2026-2027 dönemi için onay bekliyor.',
      category: 'contract',
      time: 'Bugün, 10:45',
      status: 'unread',
      severity: 'warning',
    },
    {
      id: 'n4',
      schoolId: 's1',
      schoolName: 'Atatürk Anadolu Lisesi',
      title: 'Araç Arıza Bildirimi',
      description: '06 BKT 123 plakalı araçta klima arızası bildirilmiştir. Araç öğleden sonra bakıma alınacaktır.',
      category: 'malfunction',
      time: 'Bugün, 08:30',
      status: 'unread',
      severity: 'critical',
    },
    {
      id: 'n5',
      schoolId: 's2',
      schoolName: 'Cumhuriyet İlkokulu',
      title: 'Yaklaşan Evrak Süresi',
      description: 'Sürücü Ahmet Yılmaz SRC2 belgesi yenileme süresine 12 gün kalmıştır.',
      category: 'document_expiry',
      time: 'Dün',
      status: 'read',
      severity: 'warning',
    },
    {
      id: 'n6',
      schoolId: 's1',
      schoolName: 'Atatürk Anadolu Lisesi',
      title: 'Eksik Denetim Bildirimi',
      description: 'Temmuz ayı 2. Hafta rutin servis araç hijyen ve emniyet denetimi henüz girilmedi.',
      category: 'inspection',
      time: 'Dün',
      status: 'read',
      severity: 'info',
    },
    {
      id: 'n7',
      schoolId: 's2',
      schoolName: 'Cumhuriyet İlkokulu',
      title: 'Yeni Memnuniyet Anketi',
      description: 'Kamil Yılmaz (Veli) memnuniyet anketi doldurdu. Puan: 9/10. "Şoförümüz çok kibar."',
      category: 'survey',
      time: '2 gün önce',
      status: 'read',
      severity: 'success',
    },
    {
      id: 'n8',
      schoolId: 's1',
      schoolName: 'Atatürk Anadolu Lisesi',
      title: 'Düşük Puan Alan Personel',
      description: 'Hostes Ayşe Yıldız için yapılan veli anket ortalaması 3.2/5 seviyesine geriledi.',
      category: 'low_score',
      time: '2 gün önce',
      status: 'read',
      severity: 'critical',
    },
    {
      id: 'n9',
      schoolId: 's1',
      schoolName: 'Atatürk Anadolu Lisesi',
      title: 'Bekleyen Araç Ataması',
      description: 'Can Öz isimli öğrenciye henüz servis aracı ve güzergah ataması yapılmadı.',
      category: 'pending_assignment',
      time: '3 gün önce',
      status: 'read',
      severity: 'warning',
    },
    {
      id: 'n10',
      schoolId: 's2',
      schoolName: 'Cumhuriyet İlkokulu',
      title: 'Yeni Etkinlik Kaydı',
      description: '19 Temmuz Tarihli "Anıtkabir Kültür Gezisi" planlandı. 2 adet 19 kişilik araç tahsisi gerekiyor.',
      category: 'new_event',
      time: '4 gün önce',
      status: 'read',
      severity: 'success',
    }
  ]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-50 border-rose-100 text-rose-700';
      case 'warning':
        return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'success':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      default:
        return 'bg-blue-50 border-blue-100 text-blue-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'new_registration':
        return <UserPlus className="w-4 h-4" />;
      case 'collection':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'contract':
        return <FileText className="w-4 h-4" />;
      case 'malfunction':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'document_expiry':
        return <CalendarRange className="w-4 h-4" />;
      case 'inspection':
        return <ClipboardCheck className="w-4 h-4" />;
      case 'survey':
        return <Heart className="w-4 h-4 text-emerald-600" fill="currentColor" />;
      case 'low_score':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'pending_assignment':
        return <Compass className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const filteredNotifications = notifications.filter(
    n => selectedSchool === 'all' || n.schoolId === selectedSchool
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Proje Müdürü Bildirim Havuzu</h3>
          <p className="text-sm text-slate-500">Yalnızca size bağlı okullara ({schools.map(s => s.name).join(', ')}) ait bildirimler.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedSchool}
            onChange={e => setSelectedSchool(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
          >
            <option value="all">Tüm Okullar</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={markAllRead}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-all cursor-pointer"
          >
            Tümünü Okundu İşaretle
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredNotifications.map(n => (
          <div
            key={n.id}
            className={`p-4 border rounded-2xl flex items-start justify-between gap-4 transition-all ${
              n.status === 'unread' ? 'ring-2 ring-blue-600/10 shadow-sm' : 'opacity-75'
            } ${getSeverityStyles(n.severity)}`}
          >
            <div className="flex gap-3">
              <div className="p-2 bg-white/80 rounded-xl border border-slate-100/50 flex-shrink-0">
                {getCategoryIcon(n.category)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">{n.title}</span>
                  <span className="px-2 py-0.5 bg-white/60 font-bold text-[9px] rounded-full text-slate-600 uppercase tracking-wider">
                    {n.schoolName}
                  </span>
                  {n.status === 'unread' && (
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                </div>
                <p className="text-slate-700 text-xs leading-relaxed max-w-3xl">{n.description}</p>
                <span className="block text-[10px] text-slate-400 font-medium">{n.time}</span>
              </div>
            </div>

            <button
              onClick={() => deleteNotification(n.id)}
              className="text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Kapat
            </button>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl">
            Herhangi bir bildirim bulunmamaktadır.
          </div>
        )}
      </div>
    </div>
  );
}
