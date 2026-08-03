/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapEngine } from '../infrastructure/map/MapEngine';
import { MapLayerVisibility } from '../infrastructure/map/MapTypes';
import { Layers, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type: 'bus' | 'school' | 'student';
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  showRouting?: boolean;
}

export default function MapView({ 
  center = [41.0082, 28.9784], // Istanbul default
  zoom = 12, 
  markers = [],
  showRouting = true
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapEngineRef = useRef<MapEngine | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Layer toggling state
  const [layerVisibility, setLayerVisibility] = useState<MapLayerVisibility>({
    vehicles: true,
    students: true,
    stops: true,
    schools: true,
    polygons: true,
    routes: true,
    history: true,
    alerts: true
  });

  // Nominatim Address Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMarker, setSearchMarker] = useState<any>(null);

  // Initialize Map Engine
  useEffect(() => {
    // 1. Ensure Leaflet CSS is in head
    const stylesheetId = 'leaflet-cdn-style';
    if (!document.getElementById(stylesheetId)) {
      const link = document.createElement('link');
      link.id = stylesheetId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // 2. Ensure Leaflet JS is in body
    const scriptId = 'leaflet-cdn-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const setupEngine = async () => {
      if (mapContainerRef.current && !mapEngineRef.current) {
        const engine = new MapEngine(mapContainerRef.current);
        const success = await engine.initialize(center, zoom);
        if (success) {
          mapEngineRef.current = engine;
          setIsLoaded(true);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = setupEngine;
      document.body.appendChild(script);
    } else {
      if ((window as any).L) {
        setupEngine();
      } else {
        script.addEventListener('load', setupEngine);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', setupEngine);
      }
      if (mapEngineRef.current) {
        mapEngineRef.current.destroy();
        mapEngineRef.current = null;
      }
      setIsLoaded(false);
    };
  }, []);

  // Sync Layers, Markers, Routing and Caches on Prop Changes
  useEffect(() => {
    if (!isLoaded || !mapEngineRef.current) return;

    const engine = mapEngineRef.current;

    // Clear previous dynamic layers to draw fresh props
    engine.clearStudents();

    // Group markers and plot using the MapEngine API
    const boundsCoords: [number, number][] = [];

    markers.forEach(marker => {
      const lat = marker.lat;
      const lng = marker.lng;
      boundsCoords.push([lat, lng]);

      const detailsHtml = `
        <div style="font-family: sans-serif; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #1e293b;">${marker.title}</h4>
          ${marker.description ? `<p style="margin: 0; color: #64748b; font-size: 11px;">${marker.description}</p>` : ''}
        </div>
      `;

      if (marker.type === 'school') {
        engine.addSchool(marker.title, lat, lng, marker.title, detailsHtml);
      } else if (marker.type === 'student') {
        engine.addStudent(marker.title, lat, lng, marker.title, 'assigned', marker.title);
      } else if (marker.type === 'bus') {
        engine.updateVehicleLocation(marker.title, lat, lng, marker.title, detailsHtml, false);
      }
    });

    // Handle search marker
    if (searchMarker) {
      const searchDetails = `
        <div style="font-family: sans-serif; padding: 4px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #f3e8ff; color: #7e22ce; font-weight: bold; font-size: 9px; margin-bottom: 4px;">ARANAN BÖLGE</span>
          <h4 style="margin: 0; font-weight: bold; color: #1e293b;">${searchMarker.title}</h4>
        </div>
      `;
      engine.addSchool('search_result', searchMarker.lat, searchMarker.lng, searchMarker.title, searchDetails);
      boundsCoords.push([searchMarker.lat, searchMarker.lng]);
    }

    // OSRM Routing Renderer Integration
    if (showRouting && markers.length >= 2) {
      const routePoints = markers.map(m => [m.lat, m.lng] as [number, number]);
      engine.drawRoute('prop_route', routePoints, '#3b82f6');
    }

    // Set Visibility Layers
    engine.setLayerVisibility(layerVisibility);

    // Auto-fit bounds with padding so all pins fit nicely
    if (boundsCoords.length > 0) {
      engine.fitBounds(boundsCoords, 50);
    } else {
      engine.panTo(center[0], center[1], zoom);
    }

  }, [isLoaded, markers, center, zoom, searchMarker, showRouting, layerVisibility]);

  // Handle layer visibility toggle
  const toggleLayer = (key: keyof MapLayerVisibility) => {
    setLayerVisibility(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (mapEngineRef.current) {
        mapEngineRef.current.setLayerVisibility(updated);
      }
      return updated;
    });
  };

  // Handle Nominatim Address Geocoding Search
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=tr&accept-language=tr-TR`;

    try {
      const response = await fetch(nominatimUrl, {
        headers: {
          'Accept-Language': 'tr-TR,tr;q=0.9',
          'User-Agent': 'BerkayturProduction/1.0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Nominatim Search Error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    
    setSearchMarker({
      lat,
      lng,
      title: item.display_name.split(',')[0],
      description: item.display_name
    });

    if (mapEngineRef.current) {
      mapEngineRef.current.panTo(lat, lng, 15);
    }

    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full h-full min-h-[400px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      
      {/* Nominatim Search Floating Control Panel */}
      <div className="absolute top-3 left-3 z-40 max-w-sm w-full bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 shadow-lg space-y-2">
        <form onSubmit={handleAddressSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Adres, okul veya durak ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[50px]"
          >
            {isSearching ? '...' : 'Ara'}
          </button>
        </form>

        {/* Nominatim Search Results list */}
        {searchResults.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-50 shadow-inner">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSearchResult(item)}
                className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors text-[11px] text-slate-700 leading-tight block truncate font-medium cursor-pointer"
                title={item.display_name}
              >
                📍 {item.display_name}
              </button>
            ))}
          </div>
        )}

        {searchMarker && (
          <div className="flex justify-between items-center bg-purple-50 border border-purple-100 rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-purple-700 font-bold truncate max-w-[200px]">
              Bulundu: {searchMarker.title}
            </span>
            <button
              onClick={() => setSearchMarker(null)}
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800 underline ml-2 cursor-pointer"
            >
              Temizle
            </button>
          </div>
        )}
      </div>

      {/* Floating Layer Controller Toggler Panel */}
      <div className="absolute top-3 right-3 z-40 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 shadow-lg flex flex-col gap-1.5 text-[10px] font-bold text-slate-600">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-0.5 px-1 text-slate-800">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Katman Yönetimi</span>
        </div>
        
        <label className="flex items-center gap-2 px-1 hover:bg-slate-50 rounded py-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={layerVisibility.vehicles}
            onChange={() => toggleLayer('vehicles')}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
          />
          <span>Servisler</span>
        </label>
        
        <label className="flex items-center gap-2 px-1 hover:bg-slate-50 rounded py-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={layerVisibility.students}
            onChange={() => toggleLayer('students')}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
          />
          <span>Öğrenciler</span>
        </label>

        <label className="flex items-center gap-2 px-1 hover:bg-slate-50 rounded py-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={layerVisibility.schools}
            onChange={() => toggleLayer('schools')}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
          />
          <span>Okullar</span>
        </label>

        <label className="flex items-center gap-2 px-1 hover:bg-slate-50 rounded py-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={layerVisibility.routes}
            onChange={() => toggleLayer('routes')}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
          />
          <span>Güzergahlar</span>
        </label>
      </div>

      {/* Floating Info Banner explaining Map Stack */}
      <div className="absolute bottom-3 right-3 z-40 bg-slate-900/90 text-white text-[9px] font-mono px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Berkaytur GIS Engine • OSM • Leaflet • OSRM • Nominatim</span>
      </div>

      <div ref={mapContainerRef} className="w-full flex-1" style={{ minHeight: '400px' }} />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-xs z-50">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-slate-600 text-sm font-medium">GIS Harita Motoru Başlatılıyor...</p>
        </div>
      )}
    </div>
  );
}

// Attach L to window type definitions
declare global {
  interface Window {
    L: any;
  }
}
