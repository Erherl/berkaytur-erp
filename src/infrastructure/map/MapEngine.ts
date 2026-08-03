/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehiclePosition, GeofenceZone, MapLayerVisibility } from './MapTypes';

// Lightweight Routing Cache to avoid redundant OSRM requests
const routeCache = new Map<string, [number, number][]>();

/**
 * Event Listener Callback Types
 */
export type MapEngineEventCallback = (data: any) => void;

/**
 * Production-Grade Leaflet / OSM Wrapper MapEngine
 * Features Event-Driven design, Layer Controllers, OSRM Caching, Marker Factory, Ray Casting and Marker Smoothing.
 */
export class MapEngine {
  private map: any = null;
  private L: any = null;
  private container: string | HTMLElement;
  
  // Layer Groups for fine-grained layer control
  private layers: {
    schools: any;
    students: any;
    vehicles: any;
    routes: any;
    polygons: any;
    stops: any;
    history: any;
  } = {
    schools: null,
    students: null,
    vehicles: null,
    routes: null,
    polygons: null,
    stops: null,
    history: null,
  };

  // Keep references to active markers for interpolation and dynamic updates
  private markersMap = new Map<string, any>();
  private activeAnimationFrames = new Map<string, number>();

  // Event Bridge (Custom Event Dispatcher)
  private eventListeners = new Map<string, MapEngineEventCallback[]>();

  constructor(container: string | HTMLElement) {
    this.container = container;
    this.L = (window as any).L;
  }

  /**
   * Initializes Leaflet and constructs layers inside the specified container
   */
  public async initialize(center: [number, number] = [41.0082, 28.9784], zoom: number = 13): Promise<boolean> {
    if (!this.L) {
      this.L = (window as any).L;
      if (!this.L) {
        console.warn('[MapEngine] Leaflet library (L) is not loaded on window.');
        return false;
      }
    }

    try {
      const L = this.L;
      
      // Construct Map
      this.map = L.map(this.container, {
        zoomControl: true,
        attributionControl: true,
      }).setView(center, zoom);

      // Base Tile Layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Initialize Layer Groups
      this.layers.schools = L.layerGroup().addTo(this.map);
      this.layers.students = L.layerGroup().addTo(this.map);
      this.layers.vehicles = L.layerGroup().addTo(this.map);
      this.layers.routes = L.layerGroup().addTo(this.map);
      this.layers.polygons = L.layerGroup().addTo(this.map);
      this.layers.stops = L.layerGroup().addTo(this.map);
      this.layers.history = L.layerGroup().addTo(this.map);

      this.triggerEvent('ready', { map: this.map });
      return true;
    } catch (error) {
      console.error('[MapEngine] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Event Emitter - Registers listener
   */
  public on(event: string, callback: MapEngineEventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Event Emitter - Removes listener
   */
  public off(event: string, callback: MapEngineEventCallback) {
    if (!this.eventListeners.has(event)) return;
    const list = this.eventListeners.get(event)!;
    const idx = list.indexOf(callback);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  private triggerEvent(event: string, data: any) {
    const list = this.eventListeners.get(event);
    if (list) {
      list.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('[MapEngine] Error in event listener:', e);
        }
      });
    }
  }

  /**
   * Toggles layer visibility based on a state object
   */
  public setLayerVisibility(visibility: MapLayerVisibility) {
    if (!this.map) return;
    
    const layerMapping: Record<keyof MapLayerVisibility, any> = {
      vehicles: this.layers.vehicles,
      students: this.layers.students,
      stops: this.layers.stops,
      schools: this.layers.schools,
      polygons: this.layers.polygons,
      routes: this.layers.routes,
      history: this.layers.history,
      alerts: null, // UI layer
    };

    Object.entries(visibility).forEach(([layerKey, isVisible]) => {
      const group = layerMapping[layerKey as keyof MapLayerVisibility];
      if (!group) return;

      if (isVisible) {
        if (!this.map.hasLayer(group)) {
          this.map.addLayer(group);
        }
      } else {
        if (this.map.hasLayer(group)) {
          this.map.removeLayer(group);
        }
      }
    });
  }

  /**
   * Destroys Map instance and cancels all animation loops
   */
  public destroy() {
    this.activeAnimationFrames.forEach(frameId => cancelAnimationFrame(frameId));
    this.activeAnimationFrames.clear();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markersMap.clear();
    this.eventListeners.clear();
  }

  /**
   * Focuses viewport on specific coordinate sequence
   */
  public fitBounds(coordinates: [number, number][], padding: number = 50) {
    if (!this.map || coordinates.length === 0) return;
    try {
      this.map.fitBounds(coordinates, { padding: [padding, padding] });
    } catch (e) {
      console.warn('[MapEngine] fitBounds error:', e);
    }
  }

  /**
   * Pans map to specific coordinates
   */
  public panTo(lat: number, lng: number, zoom?: number) {
    if (!this.map) return;
    if (zoom) {
      this.map.setView([lat, lng], zoom);
    } else {
      this.map.panTo([lat, lng]);
    }
  }

  /**
   * Custom Marker Factory
   * Generates highly visible icons using custom HTML structures
   */
  public createCustomIcon(type: 'bus' | 'school' | 'student' | 'stop' | 'search', status?: string) {
    let emoji = '📍';
    let ringColor = 'border-slate-300';
    let bgColor = 'bg-blue-600';

    if (type === 'bus') {
      emoji = '🚌';
      bgColor = status === 'SOS' ? 'bg-red-600 animate-ping' : 'bg-emerald-600';
      ringColor = 'border-white';
    } else if (type === 'school') {
      emoji = '🏫';
      bgColor = 'bg-rose-600';
      ringColor = 'border-white scale-110';
    } else if (type === 'student') {
      emoji = '👤';
      bgColor = status === 'selected' ? 'bg-purple-600' : (status === 'assigned' ? 'bg-blue-500' : 'bg-amber-500');
      ringColor = status === 'selected' ? 'border-purple-300 ring-4 ring-purple-200' : 'border-white';
    } else if (type === 'stop') {
      emoji = '🚏';
      bgColor = 'bg-indigo-600';
      ringColor = 'border-white';
    } else if (type === 'search') {
      emoji = '🔍';
      bgColor = 'bg-purple-600';
      ringColor = 'border-white';
    }

    return this.L.divIcon({
      className: '',
      html: `
        <div class="w-8 h-8 ${bgColor} border-2 ${ringColor} rounded-full flex items-center justify-center text-white text-xs shadow-md hover:scale-115 transition-transform duration-200 cursor-pointer">
          ${emoji}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }

  /**
   * Adds or updates a School Marker
   */
  public addSchool(id: string, lat: number, lng: number, name: string, detailsHtml: string) {
    if (!this.map) return;
    const key = `school_${id}`;
    
    if (this.markersMap.has(key)) {
      this.markersMap.get(key).remove();
    }

    const icon = this.createCustomIcon('school');
    const marker = this.L.marker([lat, lng], { icon })
      .addTo(this.layers.schools)
      .bindPopup(detailsHtml);

    this.markersMap.set(key, marker);
  }

  /**
   * Adds or updates a Student Marker
   */
  public addStudent(id: string, lat: number, lng: number, name: string, status: 'selected' | 'assigned' | 'unassigned', tooltipHtml: string) {
    if (!this.map) return;
    const key = `student_${id}`;

    if (this.markersMap.has(key)) {
      this.markersMap.get(key).remove();
    }

    const icon = this.createCustomIcon('student', status);
    const marker = this.L.marker([lat, lng], { icon })
      .addTo(this.layers.students)
      .bindTooltip(tooltipHtml, { permanent: false, direction: 'top' });

    marker.on('click', () => {
      this.triggerEvent('student_click', { studentId: id });
    });

    this.markersMap.set(key, marker);
  }

  /**
   * Clears all students from layers
   */
  public clearStudents() {
    this.layers.students.clearLayers();
    this.markersMap.forEach((marker, key) => {
      if (key.startsWith('student_')) {
        this.markersMap.delete(key);
      }
    });
  }

  /**
   * Adds or updates a Static Stop Marker
   */
  public addStop(id: string, lat: number, lng: number, name: string, detailsHtml: string) {
    if (!this.map) return;
    const key = `stop_${id}`;

    if (this.markersMap.has(key)) {
      this.markersMap.get(key).remove();
    }

    const icon = this.createCustomIcon('stop');
    const marker = this.L.marker([lat, lng], { icon })
      .addTo(this.layers.stops)
      .bindPopup(detailsHtml);

    this.markersMap.set(key, marker);
  }

  /**
   * Updates Vehicle marker location using high-performance 60fps smoothing/interpolation.
   * Eliminates pin jumping when coordinate stream updates.
   */
  public updateVehicleLocation(
    vehicleId: string,
    targetLat: number,
    targetLng: number,
    plate: string,
    popupHtml: string,
    isSos: boolean = false
  ) {
    if (!this.map) return;
    const key = `vehicle_${vehicleId}`;
    let marker = this.markersMap.get(key);

    const icon = this.createCustomIcon('bus', isSos ? 'SOS' : 'NORMAL');

    if (!marker) {
      // First-time addition
      marker = this.L.marker([targetLat, targetLng], { icon })
        .addTo(this.layers.vehicles)
        .bindPopup(popupHtml);
      this.markersMap.set(key, marker);
      return;
    }

    // Dynamic icon refresh in case SOS state changed
    marker.setIcon(icon);
    marker.setPopupContent(popupHtml);

    // Smooth movement logic (Interpolation)
    const currentLatLng = marker.getLatLng();
    const startLat = currentLatLng.lat;
    const startLng = currentLatLng.lng;
    
    // Stop any active animations on this marker
    if (this.activeAnimationFrames.has(key)) {
      cancelAnimationFrame(this.activeAnimationFrames.get(key)!);
      this.activeAnimationFrames.delete(key);
    }

    const duration = 1200; // Interpolate over 1.2s to match 1-second ticks nicely
    const startTime = performance.now();

    const animateMarker = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear interpolation math
      const currentLat = startLat + (targetLat - startLat) * progress;
      const currentLng = startLng + (targetLng - startLng) * progress;

      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animateMarker);
        this.activeAnimationFrames.set(key, frameId);
      } else {
        this.activeAnimationFrames.delete(key);
        // Trigger event when vehicle arrives at target location
        this.triggerEvent('vehicle_moved', { vehicleId, lat: targetLat, lng: targetLng });
      }
    };

    const frameId = requestAnimationFrame(animateMarker);
    this.activeAnimationFrames.set(key, frameId);
  }

  /**
   * Draws a historical trajectory tail on the map
   */
  public drawHistoryTail(coordinates: [number, number][]) {
    if (!this.map) return;
    this.layers.history.clearLayers();

    if (coordinates.length < 2) return;

    // Outer thick line
    this.L.polyline(coordinates, {
      color: '#6366f1',
      weight: 6,
      opacity: 0.4,
      lineJoin: 'round'
    }).addTo(this.layers.history);

    // Inner thin line
    this.L.polyline(coordinates, {
      color: '#4f46e5',
      weight: 2,
      opacity: 0.8,
      lineJoin: 'round',
      dashArray: '3, 6'
    }).addTo(this.layers.history);
  }

  /**
   * Queries OSRM with local in-memory Route Caching.
   * Renders precise streets path or falls back elegantly.
   */
  public async drawRoute(routeId: string, coordinates: [number, number][], color: string = '#2563eb') {
    if (!this.map) return;
    this.layers.routes.clearLayers();

    if (coordinates.length < 2) return;

    const cacheKey = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    let pathLatLngs: [number, number][] = [];

    if (routeCache.has(cacheKey)) {
      pathLatLngs = routeCache.get(cacheKey)!;
    } else {
      // Build OSRM request sequence: lng1,lat1;lng2,lat2;...
      const coordinateString = coordinates
        .map(c => `${c[1]},${c[0]}`) // OSRM expects [lng, lat]
        .join(';');

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson`;

      try {
        const response = await fetch(osrmUrl);
        if (!response.ok) throw new Error('OSRM service failure');
        const data = await response.json();

        if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
          const geometryCoords = data.routes[0].geometry.coordinates;
          // Convert OSRM GeoJSON [lng, lat] back to Leaflet [lat, lng]
          pathLatLngs = geometryCoords.map((coord: [number, number]) => [coord[1], coord[0]]);
          routeCache.set(cacheKey, pathLatLngs);
        } else {
          throw new Error('No geometry found');
        }
      } catch (e) {
        console.warn('[MapEngine] OSRM query failed. Drawing straight-line fallback.', e);
        pathLatLngs = coordinates; // Straight line fallback
      }
    }

    // Render route line on route layer
    this.L.polyline(pathLatLngs, {
      color,
      weight: 5,
      opacity: 0.85,
      lineJoin: 'round'
    }).addTo(this.layers.routes);
  }

  /**
   * Renders custom geofence polygons with transparent fills
   */
  public drawGeofenceZone(zone: GeofenceZone, color: string = '#8b5cf6') {
    if (!this.map) return;

    const points = zone.coordinates.map(p => [p.lat, p.lng]);
    const polygon = this.L.polygon(points, {
      color,
      fillColor: color,
      fillOpacity: 0.15,
      weight: 2,
      dashArray: zone.type === 'danger_zone' ? '5, 5' : undefined
    }).addTo(this.layers.polygons);

    polygon.bindTooltip(`<b>${zone.name}</b> (${zone.type === 'school' ? 'Okul Sınırı' : 'Hizmet Bölgesi'})`, {
      permanent: false,
      direction: 'center'
    });
  }

  /**
   * Ray Casting Algorithm
   * Core GIS utility to determine if a set of coordinates falls within an arbitrary geofence zone
   */
  public isPointInPolygon(lat: number, lng: number, polygonPoints: { lat: number; lng: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].lat, yi = polygonPoints[i].lng;
      const xj = polygonPoints[j].lat, yj = polygonPoints[j].lng;
      const intersect = ((yi > lng) !== (yj > lng))
          && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Calculates distance between two points in meters using Haversine formula
   */
  public calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Enables manual Polygon Drawing tool using standard Leaflet events
   */
  public enablePolygonDrawing(onComplete: (points: { lat: number; lng: number }[]) => void) {
    if (!this.map) return;

    this.map.off('click');
    const tempPoints: { lat: number; lng: number }[] = [];
    const tempLayers: any[] = [];

    const clearTemp = () => {
      tempLayers.forEach(l => l.remove());
      tempLayers.length = 0;
    };

    this.map.on('click', (e: any) => {
      const clickCoords = e.latlng;
      tempPoints.push({ lat: clickCoords.lat, lng: clickCoords.lng });

      // Redraw temp polylines
      clearTemp();
      
      const polyCoords = tempPoints.map(p => [p.lat, p.lng]);
      const polyline = this.L.polyline(polyCoords, { color: '#a855f7', weight: 3 }).addTo(this.map);
      tempLayers.push(polyline);

      tempPoints.forEach(p => {
        const marker = this.L.circleMarker([p.lat, p.lng], {
          color: '#8b5cf6',
          radius: 5,
          fillColor: '#fff',
          fillOpacity: 1,
          weight: 2
        }).addTo(this.map);
        tempLayers.push(marker);
      });

      this.triggerEvent('draw_point_added', { points: [...tempPoints] });
    });

    // Provide a completion method that callers trigger via button
    return {
      finish: () => {
        this.map.off('click');
        clearTemp();
        onComplete(tempPoints);
      },
      cancel: () => {
        this.map.off('click');
        clearTemp();
      }
    };
  }
}
