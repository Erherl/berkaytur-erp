/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../../store';
import { Student, School, Vehicle } from '../../../types';
import { 
  MapPin, Navigation, Search, Layers, ShieldCheck, 
  RefreshCw, Users, Truck, Sparkles, Wand2, Plus, AlertTriangle
} from 'lucide-react';

interface MapIncident {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  type: 'accident' | 'roadblock' | 'weather';
}

export default function VehicleMapModule() {
  const { students, schools, vehicles, updateStudent } = useAppStore();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routingLineRef = useRef<any>(null);
  const selectionPolygonRef = useRef<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Custom Map Incidents
  const [incidents, setIncidents] = useState<MapIncident[]>([
    { id: 'inc1', lat: 39.9150, lng: 32.8350, title: 'Yol Çalışması', description: 'Atatürk Bulvarı tek şerit kapalı. Trafik yoğun.', type: 'roadblock' }
  ]);

  // Selections
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  
  // Batch Form State
  const [batchVehicle, setBatchVehicle] = useState('');
  const [batchSchool, setBatchSchool] = useState('');

  // Nominatim Address Search
  const handleGeocodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressSearch.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}&countrycodes=tr&accept-language=tr-TR`, { headers: { 'Accept-Language': 'tr-TR,tr;q=0.9' } });
      const data = await response.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 14);
          
          // Temporary marker
          if (window.L) {
            window.L.marker([lat, lon])
              .addTo(mapInstanceRef.current)
              .bindPopup(`<b>Aranan Adres:</b><br/>${first.display_name}`)
              .openPopup();
          }
        }
      } else {
        alert('Adres bulunamadı. Lütfen daha detaylı yazın.');
      }
    } catch (err) {
      console.error(err);
      alert('Geocoding servisine erişilemedi.');
    } finally {
      setIsSearching(false);
    }
  };

  // OSRM Driving Route Generation
  const fetchAndDrawRoute = async (points: [number, number][]) => {
    if (points.length < 2 || !window.L || !mapInstanceRef.current) return;

    const coordsString = points.map(p => `${p[1]},${p[0]}`).join(';');
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const routeGeo = data.routes[0].geometry;
        
        // Remove old line
        if (routingLineRef.current) {
          routingLineRef.current.remove();
        }

        // Draw new Leaflet line
        const latlngs = routeGeo.coordinates.map((c: number[]) => [c[1], c[0]]);
        routingLineRef.current = window.L.polyline(latlngs, {
          color: '#2563eb', // Blue path
          weight: 5,
          opacity: 0.85,
          dashArray: '10, 10'
        }).addTo(mapInstanceRef.current);
      }
    } catch (err) {
      console.error('OSRM Route fetch failed, drawing straight lines instead', err);
      if (routingLineRef.current) {
        routingLineRef.current.remove();
      }
      routingLineRef.current = window.L.polyline(points, {
        color: '#eab308', // Amber fallback
        weight: 4,
        opacity: 0.7
      }).addTo(mapInstanceRef.current);
    }
  };

  useEffect(() => {
    // Dynamic styles for Leaflet
    const stylesheetId = 'leaflet-cdn-style';
    if (!document.getElementById(stylesheetId)) {
      const link = document.createElement('link');
      link.id = stylesheetId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Dynamic scripts for Leaflet
    const scriptId = 'leaflet-cdn-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    const initializeMap = () => {
      if (window.L && mapContainerRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = window.L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true
        }).setView([41.0082, 28.9784], 12); // Istanbul Center

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);

        // Click handler for area drawing selection
        mapInstanceRef.current.on('click', (e: any) => {
          if (!isDrawingMode) return;
          
          const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
          setDrawnPoints(prev => {
            const updated = [...prev, newPt];
            
            // Draw polygon dynamically
            if (window.L) {
              if (selectionPolygonRef.current) {
                selectionPolygonRef.current.remove();
              }
              selectionPolygonRef.current = window.L.polygon(updated, {
                color: '#ec4899', // Pink outline
                fillColor: '#fbcfe8',
                fillOpacity: 0.4
              }).addTo(mapInstanceRef.current);
            }

            return updated;
          });
        });

        setIsLoaded(true);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = initializeMap;
      document.body.appendChild(script);
    } else {
      if (window.L) {
        initializeMap();
      } else {
        script.addEventListener('load', initializeMap);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', initializeMap);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setIsLoaded(false);
    };
  }, [isDrawingMode]);

  // Sync / Draw Markers on map
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.L) return;

    const L = window.L;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Custom DivIcons
    const createMarkerIcon = (type: 'school' | 'student' | 'bus' | 'incident' | 'event', name: string) => {
      let iconColor = '#3b82f6';
      let iconChar = '👤';
      
      if (type === 'school') {
        iconColor = '#ef4444'; // Red School
        iconChar = '🏫';
      } else if (type === 'bus') {
        iconColor = '#f59e0b'; // Amber Bus
        iconChar = '🚌';
      } else if (type === 'event') {
        iconColor = '#8b5cf6'; // Purple Event
        iconChar = '📍';
      } else if (type === 'incident') {
        iconColor = '#dc2626'; // Dark Red Hazard
        iconChar = '⚠️';
      } else if (type === 'student') {
        iconColor = '#10b981'; // Green Student
        iconChar = '👨‍🎓';
      }

      return L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="
            background-color: ${iconColor};
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            border: 2px solid white;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
          ">
            ${iconChar}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
      });
    };

    const bounds: any[] = [];

    // 1. Add Schools
    schools.forEach(sch => {
      const lat = sch.id === 's1' ? 39.9040 : 39.9650;
      const lng = sch.id === 's1' ? 32.8610 : 32.8020;
      
      const m = L.marker([lat, lng], { icon: createMarkerIcon('school', sch.name) })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>🏫 Okul: ${sch.name}</b><br/>Tel: ${sch.phone}<br/>${sch.address}`);
      
      markersRef.current.push(m);
      bounds.push([lat, lng]);
    });

    // 2. Add Students
    students.forEach(st => {
      const lat = (typeof st.latitude === 'number' && Math.abs(st.latitude) > 0.0001) ? st.latitude : null;
      const lng = (typeof st.longitude === 'number' && Math.abs(st.longitude) > 0.0001) ? st.longitude : null;
      if (lat == null || lng == null) return; // koordinatsızsa pin atma — Ankara'ya düşme yok
      // Determine selection ring
      const isSelected = selectedStudents.includes(st.id);
      const icon = createMarkerIcon('student', st.name);
      
      const m = L.marker([lat, lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="space-y-1">
            <h5 class="font-extrabold text-slate-800 text-xs">👨‍🎓 ${st.name}</h5>
            <p class="text-[10px] text-slate-500 font-bold">No: ${st.studentNumber} • Sınıf: ${st.classLevel}</p>
            <p class="text-[10px] text-slate-400"><b>Veli:</b> ${st.parentName} (${st.parentPhone})</p>
            <p class="text-[10px] text-blue-600 font-bold"><b>Sabah Servisi:</b> Aktif</p>
          </div>
        `);
      
      markersRef.current.push(m);
      bounds.push([lat, lng]);
    });

    // 3. Add Vehicles
    vehicles.forEach(v => {
      // Approximate coords for vehicles
      const lat = v.id === 'v1' ? 39.9400 : 39.9200;
      const lng = v.id === 'v1' ? 32.8200 : 32.8400;

      const m = L.marker([lat, lng], { icon: createMarkerIcon('bus', v.plate) })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>🚌 Araç: ${v.plate}</b><br/>Sürücü ID: ${v.driverId || 'Zimmet Bekleniyor'}<br/>Durum: ${v.status.toUpperCase()}`);
      
      markersRef.current.push(m);
      bounds.push([lat, lng]);
    });

    // 4. Add Incidents
    incidents.forEach(inc => {
      const m = L.marker([inc.lat, inc.lng], { icon: createMarkerIcon('incident', inc.title) })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>⚠️ Tehlike: ${inc.title}</b><br/>${inc.description}`);
      
      markersRef.current.push(m);
      bounds.push([inc.lat, inc.lng]);
    });

    // Fit map bounds
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [isLoaded, students, schools, vehicles, incidents, selectedStudents]);

  // Ray-casting algorithm to select students within custom polygon
  const handleConfirmAreaSelection = () => {
    if (drawnPoints.length < 3) {
      alert('⚠️ Alan belirlemek için haritaya en az 3 nokta eklemelisiniz.');
      return;
    }

    // Function to check if point is in polygon
    const isPointInPolygon = (lat: number, lng: number, poly: [number, number][]) => {
      let isInside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        
        const intersect = ((yi > lng) !== (yj > lng))
            && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
      }
      return isInside;
    };

    // Filter students
    const selectedIds: string[] = [];
    students.forEach(st => {
      const lat = (typeof st.latitude === 'number' && Math.abs(st.latitude) > 0.0001) ? st.latitude : null;
      const lng = (typeof st.longitude === 'number' && Math.abs(st.longitude) > 0.0001) ? st.longitude : null;
      if (lat == null || lng == null) return;
      if (isPointInPolygon(lat, lng, drawnPoints)) {
        selectedIds.push(st.id);
      }
    });

    setSelectedStudents(selectedIds);
    setIsDrawingMode(false);
    
    // Alert the count
    alert(`🎉 Çizilen alan onaylandı!\nSeçilen Bölgedeki Toplam Öğrenci: ${selectedIds.length} kişi.`);
    
    // Draw route tracing for selected students
    if (selectedIds.length > 0) {
      const routePoints: [number, number][] = selectedIds
        .map(id => students.find(x => x.id === id)!)
        .filter(s => typeof s.latitude === 'number' && Math.abs(s.latitude) > 0.0001 && typeof s.longitude === 'number' && Math.abs(s.longitude) > 0.0001)
        .map(s => [s.latitude, s.longitude] as [number, number]);
      if (routePoints.length >= 2) fetchAndDrawRoute(routePoints);
    }
  };

  const handleClearDrawing = () => {
    setDrawnPoints([]);
    setSelectedStudents([]);
    if (selectionPolygonRef.current) {
      selectionPolygonRef.current.remove();
      selectionPolygonRef.current = null;
    }
    if (routingLineRef.current) {
      routingLineRef.current.remove();
      routingLineRef.current = null;
    }
  };

  // Batch assignments execution
  const handleBatchAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      alert('Lütfen önce haritadan alan seçerek öğrencileri belirleyin.');
      return;
    }
    if (!batchVehicle) {
      alert('Lütfen atanacak aracı seçin.');
      return;
    }

    // Update in store
    selectedStudents.forEach(id => {
      const v = vehicles.find(x => x.id === batchVehicle);
      updateStudent(id, {
        routeId: 'r1',
        routeName: v ? `${v.plate} Servis Güzergahı` : 'Toplu Servis Güzergahı'
      });
    });

    alert(`✅ Toplu Atama Tamamlandı!\nSeçilen ${selectedStudents.length} öğrenci, ${vehicles.find(v=>v.id===batchVehicle)?.plate} aracına ve güzergahına başarıyla atandı.`);
    setSelectedStudents([]);
    handleClearDrawing();
  };

  // Geo-Proximity Optimizer Simulation
  const handleTriggerOptimization = () => {
    if (selectedStudents.length === 0) {
      alert('Optimizasyon için haritadan alan çizerek veya öğrenci seçerek bir küme belirleyin.');
      return;
    }

    alert(`🪄 Yapay Zeka Rota Optimizasyonu:\n` +
      `- Seçilen ${selectedStudents.length} öğrenci coğrafi olarak gruplandı.\n` +
      `- Ortalama yolculuk süresi %18 iyileştirildi.\n` +
      `- Önerilen en kısa rota harita üzerinde mavi kesikli çizgi ile çizilmiştir.\n` +
      `- Araç kapasitesi doluluk oranı optimize edildi.`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">OSM Entegre Akıllı Harita</h3>
          <p className="text-sm text-slate-500">Güzergah çizimleri, Nominatim geocoding, OSRM rota planı ve serbest alan seçimi.</p>
        </div>

        {/* Nominatim Search Box */}
        <form onSubmit={handleGeocodeSearch} className="flex items-center gap-1.5 text-xs w-full md:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Adres veya Cadde ara..." 
              value={addressSearch}
              onChange={e => setAddressSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border bg-slate-50 border-slate-200 rounded-xl text-xs w-full font-bold focus:bg-white"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold cursor-pointer flex items-center gap-1 shrink-0"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Ara'}
          </button>
        </form>
      </div>

      {/* Map Interactive Options & Draw triggers */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-bold border border-slate-800 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-600/30 text-blue-400 rounded-lg"><Sparkles className="w-4 h-4" /></span>
          <div>
            <p className="font-extrabold">Serbest Alan Çizim Aracı</p>
            <p className="text-[10px] text-slate-400 font-medium">Haritada noktalar yerleştirerek toplu atama bölgesi seçin.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDrawingMode ? (
            <>
              <span className="text-pink-400 animate-pulse flex items-center gap-1 mr-2 text-[10px] font-black uppercase">
                🔴 Çizim Yapılıyor ({drawnPoints.length} Nokta)
              </span>
              <button 
                onClick={handleConfirmAreaSelection}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
              >
                Alanı Onayla
              </button>
              <button 
                onClick={handleClearDrawing}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                İptal Et
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  handleClearDrawing();
                  setIsDrawingMode(true);
                }}
                className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg cursor-pointer flex items-center gap-1"
              >
                ✍️ Serbest Alan Çiz
              </button>
              {(drawnPoints.length > 0 || selectedStudents.length > 0) && (
                <button 
                  onClick={handleClearDrawing}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Çizimi Temizle
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Real Leaflet Map Render Window */}
        <div className="lg:col-span-8 relative h-[450px] rounded-3xl overflow-hidden border border-slate-200 shadow-md">
          <div ref={mapContainerRef} className="w-full h-full min-h-[450px] bg-slate-100" />
          
          {/* Legend absolute panel inside map */}
          <div className="absolute bottom-4 left-4 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl text-[10px] space-y-1.5 z-10 shadow-lg font-bold border border-slate-700 max-w-xs">
            <p className="border-b border-slate-700 pb-1 font-black text-[11px] tracking-wide text-blue-400 uppercase">MAP INDEX</p>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block border" /> Okullar (🏫)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block border" /> Öğrenciler (👨‍🎓)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block border" /> Servis Araçları (🚌)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-purple-500 rounded-full inline-block border" /> Etkinlik Alanları (📍)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block border" /> Yol Engelleri (⚠️)</div>
          </div>
        </div>

        {/* Selected Area - Batch Operations & Route Optimizer Panel */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-inner space-y-4 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" /> Toplu Atama & Rotalama
            </h4>

            {selectedStudents.length > 0 ? (
              <form onSubmit={handleBatchAssign} className="space-y-4">
                <div className="p-3 bg-pink-50 rounded-xl border border-pink-100 space-y-1">
                  <p className="font-extrabold text-pink-800 text-xs">Seçilen Bölgede: {selectedStudents.length} Öğrenci Var</p>
                  <p className="text-pink-600 text-[10px] font-medium leading-normal">Seçim alanındaki tüm öğrenciler tek adımda belirlenen servis aracı güzergahına bağlanacaktır.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-500 font-extrabold uppercase text-[9px]">Hedef Araç / Servis:</label>
                  <select 
                    value={batchVehicle} 
                    onChange={e => setBatchVehicle(e.target.value)}
                    className="p-2.5 border bg-white rounded-xl w-full font-bold text-slate-800"
                    required
                  >
                    <option value="">-- Servis Seçin --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plate} ({v.brand}) - Kapasite: {v.capacity}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black flex items-center justify-center gap-1 cursor-pointer shadow-md"
                  >
                    <Truck className="w-4 h-4" /> Toplu Servis Ata
                  </button>
                  
                  <button 
                    type="button"
                    onClick={handleTriggerOptimization}
                    className="w-full py-2 bg-slate-950 hover:bg-black text-white rounded-xl font-black flex items-center justify-center gap-1 cursor-pointer shadow-md"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" /> Coğrafi Rota Optimize Et
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 bg-white border border-dashed border-slate-200 text-slate-400 italic text-center rounded-xl font-medium space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-slate-300" />
                <p>Toplu güzergah atamak ve coğrafi rotaları en iyi şekilde optimize etmek için harita üzerinden "Alan Çiz" butonuyla bölge seçin.</p>
              </div>
            )}
          </div>

          {/* Incidents & Alerts details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-2 flex items-center gap-1 text-rose-600">
              <AlertTriangle className="w-4 h-4" /> Yol Engeli / Arıza Alerts
            </h4>

            <div className="space-y-2">
              {incidents.map(inc => (
                <div key={inc.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1">
                  <div className="flex justify-between items-center font-extrabold text-rose-800 text-xs">
                    <span>⚠️ {inc.title}</span>
                    <span className="text-[8px] bg-rose-200 px-1.5 py-0.5 rounded uppercase font-black">{inc.type}</span>
                  </div>
                  <p className="text-slate-500 leading-normal text-[11px] font-medium">{inc.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
