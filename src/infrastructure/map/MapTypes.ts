/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VehiclePosition {
  vehicleId: string;
  plate: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees
  timestamp: string;
  accuracy?: number; // meters
}

export interface TelemetryPoint {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
  event?: 'gps_heartbeat' | 'stop_visit' | 'geofence_enter' | 'geofence_exit' | 'route_deviation';
}

export interface RouteSnapshot {
  routeId: string;
  vehicleId: string;
  routeName: string;
  coordinates: [number, number][]; // [lat, lng] list
  stops: { id: string; name: string; lat: number; lng: number; etaMinutes?: number }[];
  schoolLocation: [number, number];
}

export interface EtaSnapshot {
  vehicleId: string;
  routeId: string;
  nextStopId: string;
  nextStopName: string;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  lastUpdated: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'school' | 'stop' | 'danger_zone' | 'service_area';
  coordinates: { lat: number; lng: number }[]; // Polygon coordinates
  radius?: number; // If circular
}

export interface GeofenceEvent {
  id: string;
  zoneId: string;
  zoneName: string;
  type: 'enter' | 'exit';
  vehicleId: string;
  plate: string;
  timestamp: string;
}

export interface RouteDeviationEvent {
  id: string;
  vehicleId: string;
  plate: string;
  deviationMeters: number;
  thresholdMeters: number;
  latitude: number;
  longitude: number;
  severity: 'low' | 'warning' | 'critical';
  timestamp: string;
}

export interface StopVisitEvent {
  id: string;
  stopId: string;
  stopName: string;
  vehicleId: string;
  arrivalTime: string;
  departureTime?: string;
  status: 'scheduled' | 'visited' | 'delayed' | 'skipped';
}

export interface BoardingEvent {
  id: string;
  studentId: string;
  studentName: string;
  stopId: string;
  vehicleId: string;
  direction: 'boarding' | 'deboarding';
  status: 'on_bus' | 'absent' | 'at_school' | 'at_home';
  timestamp: string;
}

export interface MapLayerVisibility {
  vehicles: boolean;
  students: boolean;
  stops: boolean;
  schools: boolean;
  polygons: boolean;
  routes: boolean;
  history: boolean;
  alerts: boolean;
}

export interface MapViewportState {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
}

export interface RealtimeConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  error?: string;
  lastPingMs?: number;
  lastSyncTime?: string;
  isSimulation: boolean;
}
