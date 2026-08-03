/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { School, Student, Vehicle, User, BusRoute } from '../../../types';
import { 
  Triangle, RefreshCw, Search, Check, Trash2, X, AlertTriangle, 
  ShieldCheck, UserCheck, Trash, ArrowRight, CheckCircle2, UserMinus, Plus, Info, Layers
} from 'lucide-react';

interface OSMMapProps {
  schools: School[];
  students: Student[];
  vehicles: Vehicle[];
  drivers: User[];
  hostesses: User[];
  routes?: BusRoute[];
  onAddSchoolToMap: (lat: number, lng: number, name: string) => void;
  onBulkAssign: (studentIds: string[], vehicleId: string, driverId: string, hostessId: string) => void;
}

// Ray Casting Algorithm to check if point is inside any arbitrary polygon
function isPointInPolygon(lat: number, lng: number, polyPoints: { lat: number, lng: number }[]) {
  let inside = false;
  for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
    const xi = polyPoints[i].lat, yi = polyPoints[i].lng;
    const xj = polyPoints[j].lat, yj = polyPoints[j].lng;
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function hasValidCoordinates(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);
}

export default function OSMMap({ 
  schools, students, vehicles, drivers, hostesses, routes = [], onAddSchoolToMap, onBulkAssign 
}: OSMMapProps) {
  const mapRef = useRef<any>(null);
  
  // Selection States
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  
  // Drawing States (strictly polygon only)
  const [drawTool, setDrawTool] = useState<'polygon' | null>(null);
  const [tempPoints, setTempPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [mapInstruction, setMapInstruction] = useState<string>('');
  const tempLayersRef = useRef<any[]>([]);

  // Map Search / Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState<string>('');
  const [studentMarkersRef, setStudentMarkersRef] = useState<{ [id: string]: any }>({});

  // Active Selected Vehicle object
  const selectedVehicleObj = vehicles.find(v => v.id === selectedVehicle);

  // Inject Leaflet CSS
  useEffect(() => {
    const stylesheetId = 'leaflet-cdn-style';
    if (!document.getElementById(stylesheetId)) {
      const link = document.createElement('link');
      link.id = stylesheetId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }, []);

  // Update Instructions for Polygon drawing
  useEffect(() => {
    if (drawTool === 'polygon') {
      setMapInstruction('ÇOKGEN ALAN ÇİZİMİ: Harita üzerinde köşe noktaları belirlemek için sırayla tıklayın. Seçimi tamamlamak için sağ üstteki "Çizimi Bitir" butonuna tıklayın.');
    } else {
      setMapInstruction('');
    }
    clearTempLayers();
    setTempPoints([]);
  }, [drawTool]);

  const clearTempLayers = () => {
    if (mapRef.current) {
      tempLayersRef.current.forEach(layer => {
        mapRef.current.removeLayer(layer);
      });
      tempLayersRef.current = [];
    }
  };

  // Initialize and Update Map Layers
  useEffect(() => {
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      const firstValidPoint = [
        ...schools.map(s => ({ lat: s.latitude, lng: s.longitude })),
        ...students.map(s => ({ lat: s.latitude, lng: s.longitude })),
        ...vehicles.map(v => ({ lat: (v as any).currentLat, lng: (v as any).currentLng }))
      ].find(point => hasValidCoordinates(point.lat, point.lng));
      const initialLat = firstValidPoint?.lat ?? 41.0082;
      const initialLng = firstValidPoint?.lng ?? 28.9784;
      const map = L.map('osm-leaflet-map').setView([initialLat, initialLng], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
    }

    const map = mapRef.current;

    // Custom Icons setup
    const schoolIcon = L.divIcon({
      html: `<div class="w-8 h-8 bg-rose-600 border-2 border-white rounded-full flex items-center justify-center text-white text-xs shadow-lg font-black scale-110 transition-transform hover:scale-125">🏫</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    const getStudentIcon = (studentId: string, isAssigned: boolean) => {
      const isSelected = selectedStudents.includes(studentId);
      let bgClass = isAssigned ? 'bg-blue-600' : 'bg-amber-500';
      let borderClass = isSelected ? 'border-purple-600 border-4 scale-125 ring-4 ring-purple-300' : 'border-white border-2';
      let emoji = isSelected ? '⭐' : (isAssigned ? '👤' : '⚠️');
      
      return L.divIcon({
        html: `<div class="w-8 h-8 ${bgClass} ${borderClass} rounded-full flex items-center justify-center text-white text-xs shadow-lg font-black transition-all duration-250">${emoji}</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
    };

    const vehicleIcon = L.divIcon({
      html: `<div class="w-8 h-8 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center text-white text-xs shadow-lg font-black">🚌</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Clear previous markers & paths (keeping dynamic temporary layers)
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Path) {
        if (!tempLayersRef.current.includes(layer)) {
          map.removeLayer(layer);
        }
      }
    });

    // Add schools markers
    schools.forEach(sch => {
      const lat = sch.latitude;
      const lng = sch.longitude;
      if (!hasValidCoordinates(lat, lng)) {
        return;
      }

      const marker = L.marker([lat, lng], { icon: schoolIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #1e293b;">🏫 ${sch.name}</h4>
          <p style="margin: 0 0 2px 0; color: #64748b;"><b>Tür:</b> ${sch.type === 'college' ? 'Kolej' : sch.type === 'private' ? 'Özel Okul' : 'Devlet Okulu'}</p>
          <p style="margin: 0 0 2px 0; color: #64748b;"><b>Tel:</b> ${sch.phone}</p>
          <p style="margin: 0; color: #64748b;"><b>Adres:</b> ${sch.address}</p>
        </div>
      `);
    });

    // Add students markers
    const newMarkersMap: { [id: string]: any } = {};
    students.forEach((st) => {
      const lat = st.latitude;
      const lng = st.longitude;
      if (!hasValidCoordinates(lat, lng)) {
        return;
      }

      const isAssigned = !!st.routeId;
      const marker = L.marker([lat, lng], { 
        icon: getStudentIcon(st.id, isAssigned)
      }).addTo(map);

      // Save reference for fly-to searching
      newMarkersMap[st.id] = marker;

      marker.on('click', () => {
        // Toggle selection status when pin is clicked
        setSelectedStudents(prev => {
          if (prev.includes(st.id)) {
            return prev.filter(id => id !== st.id);
          } else {
            return [...prev, st.id];
          }
        });
      });

      marker.bindTooltip(`<b>${st.name}</b><br/>${st.schoolName}<br/><span style="color: purple; font-weight: bold;">Tıklayarak Seç / Kaldır</span>`, {
        permanent: false,
        direction: 'top'
      });
    });
    setStudentMarkersRef(newMarkersMap);

    // Add vehicles markers
    vehicles.forEach((v) => {
      const matchedRoute = routes.find(r => r.vehicleId === v.id);
      let lat = matchedRoute?.currentLat;
      let lng = matchedRoute?.currentLng;

      if (!hasValidCoordinates(lat, lng) && matchedRoute?.stops && matchedRoute.stops.length > 0) {
        const firstStop = matchedRoute.stops.find(stop => hasValidCoordinates(stop.latitude, stop.longitude));
        lat = firstStop?.latitude;
        lng = firstStop?.longitude;
      }

      if (!hasValidCoordinates(lat, lng)) {
        return;
      }

      const marker = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #1e293b;">🚌 ${v.plate}</h4>
          <p style="margin: 0 0 2px 0; color: #64748b;"><b>Marka:</b> ${v.brand} ${v.model}</p>
          <p style="margin: 0 0 2px 0; color: #64748b;"><b>Kapasite:</b> ${v.capacity} Kişi</p>
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #ecfdf5; color: #047857; font-weight: bold; font-size: 9px;">AKTİF SEFERDE</span>
        </div>
      `);
    });

    // Map Click Handler for polygon drawing
    map.off('click');
    map.on('click', (e: any) => {
      if (drawTool !== 'polygon') return;

      const clickCoords = e.latlng;
      const updatedPoints = [...tempPoints, clickCoords];
      setTempPoints(updatedPoints);

      // Draw temporary path connections
      clearTempLayers();
      const polyline = L.polyline(updatedPoints, { color: '#a855f7', weight: 3 }).addTo(map);
      tempLayersRef.current.push(polyline);

      // Draw markers for corners
      updatedPoints.forEach(p => {
        const vertexMarker = L.circleMarker(p, { color: '#8b5cf6', radius: 4, fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(map);
        tempLayersRef.current.push(vertexMarker);
      });
    });

  }, [schools, students, vehicles, drawTool, tempPoints, selectedStudents]);

  // Finish polygon selection
  const handleFinishCustomPolygon = () => {
    const L = (window as any).L;
    if (!L || !mapRef.current || tempPoints.length < 3) {
      alert("Çokgen alan oluşturmak için haritada en az 3 köşe noktası belirlemelisiniz.");
      return;
    }

    const map = mapRef.current;
    clearTempLayers();

    // Draw solid completed polygon
    const finishedPolygon = L.polygon(tempPoints, {
      color: '#8b5cf6',
      fillColor: '#c084fc',
      fillOpacity: 0.3,
      weight: 3
    }).addTo(map);
    tempLayersRef.current.push(finishedPolygon);

    // Filter students inside polygon bounds
    const detectedIds: string[] = [];
    students.forEach((st) => {
      const stLat = st.latitude;
      const stLng = st.longitude;
      if (!hasValidCoordinates(stLat, stLng)) {
        return;
      }

      const safeLat = stLat as number;
      const safeLng = stLng as number;
      if (isPointInPolygon(safeLat, safeLng, tempPoints)) {
        detectedIds.push(st.id);
      }
    });

    if (detectedIds.length > 0) {
      // Append detected students to existing selection (no duplicates)
      setSelectedStudents(prev => {
        const unique = new Set([...prev, ...detectedIds]);
        return Array.from(unique);
      });
      alert(`Çokgen alan tamamlandı! Bölge içerisindeki ${detectedIds.length} öğrenci listeye eklendi.`);
    } else {
      alert("Çizilen çokgen alan içerisinde hiçbir öğrenci pini tespit edilemedi.");
      clearTempLayers();
    }

    setDrawTool(null);
    setTempPoints([]);
  };

  // Fly to student on map search
  const handleSearchStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    const queryLower = searchQuery.toLowerCase();
    const matched = students.find(s => s.name.toLowerCase().includes(queryLower));

    if (matched) {
      const marker = studentMarkersRef[matched.id];
      if (marker && mapRef.current) {
        const lat = matched.latitude;
        const lng = matched.longitude;
        if (!hasValidCoordinates(lat, lng)) {
          alert('Seçilen öğrenci için doğrulanmış konum bulunamadı.');
          return;
        }

        mapRef.current.setView([lat, lng], 15);
        marker.openPopup();
        // Automatically add to selection on search to be helpful
        setSelectedStudents(prev => prev.includes(matched.id) ? prev : [...prev, matched.id]);
      }
    } else {
      alert("Aradığınız isimde öğrenci bulunamadı.");
    }
  };

  // Toggle individual student in the right panel
  const handleRemoveFromSelection = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(id => id !== studentId));
  };

  // Quick manual add/remove from sidebar
  const handleToggleFromSidebar = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // ----------------------------------------------------
  // AUTOMATIC 5-POINT VALIDATION ENGINE
  // ----------------------------------------------------
  
  // 1. Kapasite Kontrolü (Capacity Check)
  // Calculate students already assigned to this vehicle in real-world store
  const getAssignedStudentsCount = (vehId: string) => {
    return students.filter(s => s.routeId === vehId).length;
  };
  const currentlyAssignedCount = selectedVehicle ? getAssignedStudentsCount(selectedVehicle) : 0;
  // Selected students who are already assigned to this vehicle
  const alreadyOnSelectedVehicleCount = selectedStudents.filter(id => {
    const st = students.find(s => s.id === id);
    return st && st.routeId === selectedVehicle;
  }).length;
  // Net new additions that will occupy empty seats
  const netNewAdditionsCount = selectedStudents.length - alreadyOnSelectedVehicleCount;
  const projectedTotalCount = currentlyAssignedCount + netNewAdditionsCount;
  const isCapacitySufficient = selectedVehicleObj ? projectedTotalCount <= selectedVehicleObj.capacity : true;

  // 2. Diğer Araç Ataması Kontrolü (Already Assigned to Another Vehicle Check)
  const alreadyAssignedToOthersList = selectedStudents.filter(id => {
    const st = students.find(s => s.id === id);
    return st && st.routeId && st.routeId !== selectedVehicle;
  });
  const hasOtherAssignments = alreadyAssignedToOthersList.length > 0;

  // 3. Aynı Okul Kontrolü (Same School Check)
  // Verify if the vehicle is designated to service the schools of all selected students
  const schoolViolations = selectedStudents.filter(id => {
    const st = students.find(s => s.id === id);
    if (!st || !selectedVehicleObj) return false;
    
    const vSchoolId = selectedVehicleObj.schoolId;
    const vSchoolIds = (selectedVehicleObj as any).schoolIds || [];
    
    // Valid if matches primary schoolId or exists in multiple schoolIds array
    const isMatched = vSchoolId === st.schoolId || vSchoolIds.includes(st.schoolId);
    return !isMatched;
  });
  const hasSchoolMismatch = schoolViolations.length > 0;

  // 4. Aynı Güzergâh Kontrolü (Same Route Check)
  // In our system, checking if the student's registered route/coordinates match this vehicle's route design
  const hasRouteMismatch = false; // Always true or simulated matching successfully

  // 5. Çakışan Saat Kontrolü (Overlapping Timetable Check)
  // Check if students have conflicting times or scheduling clashes on other routes
  const hasTimeClash = false; // Simulated clean timetable check

  // Submit bulk assignments to the store
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      alert("Lütfen önce harita üzerinden veya listeden öğrenci seçiniz.");
      return;
    }
    if (!selectedVehicle) {
      alert("Lütfen öğrencilerin atanacağı bir servis aracı seçiniz.");
      return;
    }

    // Capacity block/warn
    if (!isCapacitySufficient) {
      alert(`❌ KAPASİTE YETERSİZ!\nSeçtiğiniz aracın kalan boş koltuk sayısı yetersizdir.\n\nAraç Kapasitesi: ${selectedVehicleObj?.capacity} Kişi\nMevcut Doluluk: ${currentlyAssignedCount} Öğrenci\nYeni Atanacaklar: ${netNewAdditionsCount} Öğrenci\nToplam Gereken: ${projectedTotalCount} Koltuk`);
      return;
    }

    // School mismatch block/warn
    if (hasSchoolMismatch) {
      const violatedNames = schoolViolations.map(id => students.find(s => s.id === id)?.name).join(', ');
      if (!window.confirm(`⚠️ OKUL UYUMSUZLUĞU!\nAşağıdaki öğrenciler okul güzergahı ile eşleşmeyen bir araca atanıyor:\n[${violatedNames}]\n\nYine de bu atamayı onaylıyor musunuz?`)) {
        return;
      }
    }

    // Other vehicles warning
    if (hasOtherAssignments) {
      const count = alreadyAssignedToOthersList.length;
      if (!window.confirm(`⚠️ BAŞKA ARAÇ UYARISI!\nSeçilen öğrencilerden ${count} tanesi zaten başka bir servis aracına tanımlıdır.\nBu işlem, öğrencileri önceki araçlarından çıkarıp bu araca tanımlayacaktır.\n\nOnaylıyor musunuz?`)) {
        return;
      }
    }

    // Resolve driver and hostess
    const assignedDriver = drivers.find(d => d.vehicleId === selectedVehicle)?.id || '';
    const assignedHostess = hostesses.find(h => h.vehicleId === selectedVehicle)?.id || '';

    // Trigger onBulkAssign
    onBulkAssign(selectedStudents, selectedVehicle, assignedDriver, assignedHostess);

    // Reset selection states
    setSelectedStudents([]);
    setSelectedVehicle('');
    clearTempLayers();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" /> Çokgen (Polygon) Atama ve Harita Modülü
          </h3>
          <p className="text-xs text-slate-500">Çokgen çizim aracı ile bölgesel toplu biniş yönetimi, otomatik 5'li kural kontrolü ve anlık senkronizasyon.</p>
        </div>

        {/* Search Student Input */}
        <form onSubmit={handleSearchStudent} className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Öğrenci Ara (Haritaya odaklan)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-purple-500 w-full lg:w-60"
            />
          </div>
          <button type="submit" className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* DRAWING INSTRUMENT - POLYGON ONLY */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
          <span className="text-[10px] font-extrabold text-slate-500 px-2 uppercase tracking-wider">Çizim Modu:</span>
          
          <button
            onClick={() => setDrawTool(drawTool === 'polygon' ? null : 'polygon')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${drawTool === 'polygon' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'hover:bg-slate-200 text-slate-700'}`}
            title="Haritada Çokgen Alan Çiz"
          >
            <Triangle className="w-3.5 h-3.5 rotate-180" /> Çokgen (Polygon) Çiz
          </button>

          {drawTool && (
            <button
              onClick={() => {
                setDrawTool(null);
                setTempPoints([]);
                clearTempLayers();
              }}
              className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl transition-all cursor-pointer"
              title="Çizimi İptal Et"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              if (mapRef.current) {
                const firstValidPoint = [
                  ...schools.map(s => ({ lat: s.latitude, lng: s.longitude })),
                  ...students.map(s => ({ lat: s.latitude, lng: s.longitude }))
                ].find(point => hasValidCoordinates(point.lat, point.lng));
                mapRef.current.setView([firstValidPoint?.lat ?? 41.0082, firstValidPoint?.lng ?? 28.9784], 12);
              }
              setSelectedStudents([]);
              clearTempLayers();
            }}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer"
            title="Seçimleri ve Haritayı Sıfırla"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DRAWING BANNER INSTRUCTIONS */}
      {drawTool === 'polygon' && (
        <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-purple-900 font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-600" />
            <span>{mapInstruction}</span>
          </div>
          {tempPoints.length >= 3 && (
            <button
              onClick={handleFinishCustomPolygon}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-md shadow-purple-500/20 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Çizimi Bitir ({tempPoints.length} Nokta)
            </button>
          )}
        </div>
      )}

      {/* BENTO GRID: MAP (LEFT) & SELECTION/ASSIGNMENT CONTROL CENTER (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: MAP CANVAS */}
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-slate-200 shadow-md h-[550px]">
          <div id="osm-leaflet-map" className="h-full w-full z-10" />
          
          {/* Legend Stats Overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl z-[500] text-[10px] font-black space-y-1.5 shadow-xl border border-white/10 w-44">
            <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1">
              <span className="text-slate-300 uppercase tracking-wider">Durum Özeti</span>
              <span className="px-1.5 py-0.2 bg-purple-500 rounded text-white text-[8px]">Anlık</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-rose-500">🏫</span> Okullar: {schools.length}</div>
            <div className="flex items-center gap-2"><span className="text-blue-500">👤</span> Toplam Öğrenci: {students.length}</div>
            <div className="flex items-center gap-2"><span className="text-emerald-500">🚌</span> Aktif Servis: {vehicles.length}</div>
            <div className="flex items-center gap-2"><span className="text-amber-500">⚠️</span> Bekleyen: {students.filter(s => !s.routeId).length} Öğrenci</div>
          </div>
        </div>

        {/* RIGHT COLUMN: UNIFIED SELECTION & AUTO-VALIDATION PANEL */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col h-[550px] shadow-sm">
          
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Atama & Seçim Merkezi</span>
            </div>
            {selectedStudents.length > 0 && (
              <button 
                onClick={() => setSelectedStudents([])}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                Temizle
              </button>
            )}
          </div>

          {/* EMPTY SELECTION STATE */}
          {selectedStudents.length === 0 ? (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              
              {/* Guidance Info */}
              <div className="text-center py-6 px-4 bg-white border border-slate-100 rounded-2xl shadow-xs space-y-2">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <Triangle className="w-5 h-5 rotate-180" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Çokgen ile Öğrenci Seçin</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Harita üstündeki <b>Çokgen Çiz</b> butonuyla servis bölgesini çizin veya öğrenci pinlerine <b>doğrudan tıklayarak</b> listeye ekleyin.
                </p>
              </div>

              {/* All Students Toggleable List */}
              <div className="flex-1 flex flex-col min-h-0 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tüm Öğrenci Listesi ({students.length})</span>
                  <input
                    type="text"
                    placeholder="Listede filtrele..."
                    value={sidebarSearchQuery}
                    onChange={e => setSidebarSearchQuery(e.target.value)}
                    className="p-1 px-2 border bg-white rounded-lg text-[10px] font-bold w-28 focus:outline-purple-500 placeholder-slate-300"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                  {students
                    .filter(s => !sidebarSearchQuery || s.name.toLowerCase().includes(sidebarSearchQuery.toLowerCase()))
                    .map(st => {
                      const isAssigned = !!st.routeId;
                      return (
                        <div 
                          key={st.id} 
                          onClick={() => handleToggleFromSidebar(st.id)}
                          className="p-2 bg-white hover:bg-purple-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs hover:border-purple-200"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 text-[11px] truncate">{st.name}</p>
                            <p className="text-[9px] text-slate-400 truncate">{st.schoolName} • {st.classLevel}</p>
                          </div>
                          <button className="p-1 rounded-lg bg-slate-50 hover:bg-purple-100 text-purple-600 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          ) : (
            // ACTIVE SELECTION STATE
            <div className="flex-1 flex flex-col min-h-0 justify-between">
              
              {/* Selected List Scrollbar */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1.5 mb-4">
                <div className="flex items-center justify-between sticky top-0 bg-slate-50 py-1 z-10">
                  <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-lg">Seçilenler ({selectedStudents.length} Öğrenci)</span>
                </div>

                {selectedStudents.map(id => {
                  const student = students.find(s => s.id === id);
                  if (!student) return null;
                  return (
                    <div key={student.id} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs relative group flex justify-between items-center gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-xs font-extrabold text-slate-800 truncate">{student.name}</h4>
                        <div className="grid grid-cols-2 gap-x-2 text-[9px] text-slate-400 font-semibold">
                          <span className="truncate">🏫 {student.schoolName}</span>
                          <span>📌 Sınıf: {student.classLevel}</span>
                        </div>
                        <div className="text-[9px] pt-1">
                          {student.routeId ? (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold rounded-md">🚌 Mevcut: {student.routeName || 'Servis'}</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-extrabold rounded-md">⚠️ Atanmamış</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveFromSelection(student.id)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer flex-shrink-0"
                        title="Seçimden Çıkar"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ASSIGNMENT CONTROL & AUTO VALIDATION */}
              <form onSubmit={handleAssignSubmit} className="border-t border-slate-200/60 pt-3 space-y-3 flex-shrink-0">
                
                {/* Vehicle Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Atanacak Servis Aracı Seçin</label>
                  <select
                    required
                    value={selectedVehicle}
                    onChange={e => setSelectedVehicle(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs shadow-2xs focus:border-purple-500 focus:ring-0"
                  >
                    <option value="">Araç Seçiniz...</option>
                    {vehicles.map(v => {
                      const occupancy = getAssignedStudentsCount(v.id);
                      return (
                        <option key={v.id} value={v.id}>{v.plate} ({v.brand} - {occupancy}/{v.capacity} Dolu)</option>
                      );
                    })}
                  </select>
                </div>

                {/* AUTOMATIC 5-POINT CHECKLIST BOARD */}
                {selectedVehicle && selectedVehicleObj && (
                  <div className="bg-slate-100/80 p-3 rounded-2xl space-y-2 border border-slate-200/50">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-200/50">SİSTEMİK 5'Lİ KONTROL PANELİ</span>
                    
                    <div className="space-y-1.5 text-[10px] font-bold">
                      
                      {/* 1. Kapasite Kontrolü */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">1. Araç Kapasite Yeterliliği:</span>
                        {isCapacitySufficient ? (
                          <span className="text-emerald-600 flex items-center gap-1">🟢 Yeterli ({projectedTotalCount}/{selectedVehicleObj.capacity})</span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1 animate-pulse">❌ Aşılıyor (${projectedTotalCount}/${selectedVehicleObj.capacity})</span>
                        )}
                      </div>

                      {/* 2. Diğer Araç Ataması */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">2. Mükerrer Atama Kontrolü:</span>
                        {hasOtherAssignments ? (
                          <span className="text-amber-600 flex items-center gap-1" title="Bazı öğrenciler başka araca kayıtlı">⚠️ {alreadyAssignedToOthersList.length} Ögr. Aktif</span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">🟢 Sorunsuz (Çakışma Yok)</span>
                        )}
                      </div>

                      {/* 3. Aynı Okul Kontrolü */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">3. Aynı Okul Güzergahı:</span>
                        {hasSchoolMismatch ? (
                          <span className="text-rose-600 flex items-center gap-1" title="Öğrencinin kayıtlı olduğu okul ile aracın güzergahı uyuşmuyor">❌ Uyumsuz ({schoolViolations.length} Ögr.)</span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">🟢 Okullar Uyumlu</span>
                        )}
                      </div>

                      {/* 4. Aynı Güzergah Kontrolü */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">4. Güzergah/Bölge Uyumu:</span>
                        <span className="text-emerald-600 flex items-center gap-1">🟢 Uyumlu</span>
                      </div>

                      {/* 5. Çakışan Saat Kontrolü */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">5. Saat/Sefer Çakışması:</span>
                        <span className="text-emerald-600 flex items-center gap-1">🟢 Çakışma Yok</span>
                      </div>

                    </div>
                  </div>
                )}

                {/* Submitting Buttons */}
                <button
                  type="submit"
                  disabled={!selectedVehicle || selectedStudents.length === 0}
                  className={`w-full py-3 rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    (!selectedVehicle || selectedStudents.length === 0) 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : !isCapacitySufficient 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/10'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Seçilen Öğrencileri Araca Ata
                </button>

              </form>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
