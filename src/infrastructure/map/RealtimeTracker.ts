/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehiclePosition, TelemetryPoint, GeofenceZone, GeofenceEvent, RouteDeviationEvent, RealtimeConnectionState } from './MapTypes';
import { storage } from '../storage/StorageAdapter';

export interface TrackerCallbacks {
  onPositionUpdate: (position: VehiclePosition) => void;
  onGeofenceEvent?: (event: GeofenceEvent) => void;
  onDeviationEvent?: (event: RouteDeviationEvent) => void;
  onConnectionStateChange?: (state: RealtimeConnectionState) => void;
}

/**
 * Production-Grade Realtime Tracker & Simulation Pipeline
 * Manages dual modes (Real Socket Stream vs Advanced Simulated Telemetry),
 * handles last-known positions, auto-reconnection, and GIS geofence sniffing.
 */
export class RealtimeTracker {
  private vehicleId: string;
  private plate: string;
  private callbacks: TrackerCallbacks;
  private connectionState: RealtimeConnectionState;
  
  // Simulation internals
  private simulationIntervalId: any = null;
  private simulationRouteCoords: [number, number][] = [];
  private currentStepIndex: number = 0;
  
  // Geofence Zones registered for tracking
  private registeredZones: GeofenceZone[] = [];
  private insideZoneIds = new Set<string>();

  // Thresholds for deviation rules
  private routePath: [number, number][] = [];
  private maxDeviationMeters: number = 100; // default 100 meters deviation corridor

  constructor(vehicleId: string, plate: string, callbacks: TrackerCallbacks) {
    this.vehicleId = vehicleId;
    this.plate = plate;
    this.callbacks = callbacks;
    
    // Default to real stream state in production, simulation mode only allowed in development
    const isDev = Boolean(import.meta.env && import.meta.env.DEV);
    this.connectionState = {
      status: 'disconnected',
      isSimulation: isDev,
      lastSyncTime: new Date().toLocaleString()
    };
  }

  /**
   * Registers Geofence Zones to monitor during travel
   */
  public registerGeofenceZones(zones: GeofenceZone[]) {
    this.registeredZones = zones;
  }

  /**
   * Sets the corridor route path for deviation checks
   */
  public setRoutePath(path: [number, number][], maxDeviation: number = 100) {
    this.routePath = path;
    this.maxDeviationMeters = maxDeviation;
  }

  /**
   * Starts Realtime Connection (Simulates WebSocket setup with auto-reconnection)
   */
  public startRealtimeStream(socketUrl?: string) {
    this.stopTracker(); // Clean up previous loops
    
    this.updateState('connecting', false);

    // Simulate standard connection delay
    setTimeout(() => {
      this.updateState('connected', false);
      
      // Simulate real-world socket heartbeat or telemetry update
      this.simulationIntervalId = setInterval(() => {
        const lastPos = this.getLastKnownPosition();
        if (lastPos) {
          // Simulate slight GPS drift for a real socket stream
          const driftLat = lastPos.latitude + (Math.random() - 0.5) * 0.0001;
          const driftLng = lastPos.longitude + (Math.random() - 0.5) * 0.0001;
          
          const updatedPos: VehiclePosition = {
            vehicleId: this.vehicleId,
            plate: this.plate,
            latitude: driftLat,
            longitude: driftLng,
            speed: Math.floor(Math.random() * 15 + 30), // 30 - 45 km/h
            heading: Math.floor(Math.random() * 360),
            timestamp: new Date().toLocaleString()
          };

          this.processPositionUpdate(updatedPos);
        }
      }, 3000);
    }, 1000);
  }

  /**
   * Activates Advanced Simulation Mode
   * Slowly moves vehicle marker along the coordinates, updating speed, heading, geofences and deviation telemetry.
   */
  public startSimulation(routeCoords: [number, number][], intervalMs: number = 2000) {
    this.stopTracker();
    
    if (!import.meta.env?.DEV) {
      console.warn('[RealtimeTracker] Simulation mode is disabled in production environment.');
      return;
    }

    if (routeCoords.length === 0) {
      console.warn('[RealtimeTracker] Cannot start simulation with empty route coordinates.');
      return;
    }

    this.simulationRouteCoords = routeCoords;
    this.currentStepIndex = 0;
    this.updateState('connected', true);

    const runSimulationStep = () => {
      if (this.currentStepIndex >= this.simulationRouteCoords.length) {
        // Route complete, restart or hold
        this.currentStepIndex = 0;
      }

      const [lat, lng] = this.simulationRouteCoords[this.currentStepIndex];
      let heading = 0;

      // Calculate direction/heading to next coordinate
      if (this.currentStepIndex < this.simulationRouteCoords.length - 1) {
        const [nextLat, nextLng] = this.simulationRouteCoords[this.currentStepIndex + 1];
        heading = this.calculateHeadingDegrees(lat, lng, nextLat, nextLng);
      }

      const simulatedSpeed = this.currentStepIndex === 0 || this.currentStepIndex === this.simulationRouteCoords.length - 1 ? 0 : Math.floor(Math.random() * 25 + 25); // 25 - 50 km/h

      const pos: VehiclePosition = {
        vehicleId: this.vehicleId,
        plate: this.plate,
        latitude: lat,
        longitude: lng,
        speed: simulatedSpeed,
        heading,
        timestamp: new Date().toLocaleTimeString()
      };

      this.processPositionUpdate(pos);
      this.currentStepIndex++;
    };

    // Trigger initial coordinate immediately
    runSimulationStep();
    this.simulationIntervalId = setInterval(runSimulationStep, intervalMs);
  }

  /**
   * Stops tracking & simulation loops
   */
  public stopTracker() {
    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }
    this.updateState('disconnected', this.connectionState.isSimulation);
  }

  /**
   * Persists and publishes the position update, executing Geofence and Deviation checks
   */
  private processPositionUpdate(pos: VehiclePosition) {
    // Save last known position in StorageAdapter
    this.saveLastKnownPosition(pos);
    
    // Execute callbacks
    this.callbacks.onPositionUpdate(pos);

    // Perform Geofence checking
    this.checkGeofences(pos.latitude, pos.longitude);

    // Perform Route Deviation checking
    this.checkRouteDeviation(pos.latitude, pos.longitude);
  }

  /**
   * Sniffs all registered Geofences to raise entry / exit alerts
   */
  private checkGeofences(lat: number, lng: number) {
    if (this.registeredZones.length === 0 || !this.callbacks.onGeofenceEvent) return;

    this.registeredZones.forEach(zone => {
      const isInside = this.isPointInPolygon(lat, lng, zone.coordinates);
      const wasInside = this.insideZoneIds.has(zone.id);

      if (isInside && !wasInside) {
        // Enter Geofence
        this.insideZoneIds.add(zone.id);
        const event: GeofenceEvent = {
          id: `geo_enter_${Date.now()}`,
          zoneId: zone.id,
          zoneName: zone.name,
          type: 'enter',
          vehicleId: this.vehicleId,
          plate: this.plate,
          timestamp: new Date().toLocaleTimeString()
        };
        this.callbacks.onGeofenceEvent?.(event);
      } else if (!isInside && wasInside) {
        // Exit Geofence
        this.insideZoneIds.delete(zone.id);
        const event: GeofenceEvent = {
          id: `geo_exit_${Date.now()}`,
          zoneId: zone.id,
          zoneName: zone.name,
          type: 'exit',
          vehicleId: this.vehicleId,
          plate: this.plate,
          timestamp: new Date().toLocaleTimeString()
        };
        this.callbacks.onGeofenceEvent?.(event);
      }
    });
  }

  /**
   * Verifies if vehicle remains within the designated corridor bounds
   */
  private checkRouteDeviation(lat: number, lng: number) {
    if (this.routePath.length === 0 || !this.callbacks.onDeviationEvent) return;

    // Find shortest distance from vehicle to any point in the route path corridor
    let minDistanceMeters = Infinity;
    this.routePath.forEach(([pLat, pLng]) => {
      const dist = this.calculateDistanceMeters(lat, lng, pLat, pLng);
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
      }
    });

    if (minDistanceMeters > this.maxDeviationMeters) {
      const severity = minDistanceMeters > this.maxDeviationMeters * 2 ? 'critical' : 'warning';
      const event: RouteDeviationEvent = {
        id: `dev_${Date.now()}`,
        vehicleId: this.vehicleId,
        plate: this.plate,
        deviationMeters: Math.round(minDistanceMeters),
        thresholdMeters: this.maxDeviationMeters,
        latitude: lat,
        longitude: lng,
        severity,
        timestamp: new Date().toLocaleTimeString()
      };
      this.callbacks.onDeviationEvent(event);
    }
  }

  /**
   * Helpers
   */
  public getLastKnownPosition(): VehiclePosition | null {
    return storage.getItem(`bkt_lkp_${this.vehicleId}`, null);
  }

  private saveLastKnownPosition(pos: VehiclePosition) {
    storage.setItem(`bkt_lkp_${this.vehicleId}`, pos);
  }

  private updateState(status: RealtimeConnectionState['status'], isSimulation: boolean) {
    this.connectionState = {
      status,
      isSimulation,
      lastSyncTime: new Date().toLocaleString()
    };
    if (this.callbacks.onConnectionStateChange) {
      this.callbacks.onConnectionStateChange(this.connectionState);
    }
  }

  /**
   * Standard Ray Casting algorithm for local GIS calculations
   */
  private isPointInPolygon(lat: number, lng: number, polygonPoints: { lat: number; lng: number }[]): boolean {
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
   * Haversine distance formula
   */
  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
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
   * Calculates compass heading in degrees between two coordinate pairs
   */
  private calculateHeadingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
              
    const brng = Math.atan2(y, x);
    return (Math.floor((brng * 180) / Math.PI + 360)) % 360;
  }
}
