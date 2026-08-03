import { BusRoute } from '../types';

/**
 * Service to manage Route operational logic, status mapping, ETA predictions, and OSRM configurations.
 */
export const RouteService = {
  /**
   * Helper that translates route statuses to human-readable labels.
   */
  getRouteStatusDetails(status: BusRoute['status']): { label: string; color: string; badgeClass: string } {
    switch (status) {
      case 'morning_active':
        return { label: 'Sabah Servisi Aktif', color: '#10b981', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'evening_active':
        return { label: 'Akşam Servisi Aktif', color: '#6366f1', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'completed':
        return { label: 'Tamamlandı', color: '#3b82f6', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'idle':
      default:
        return { label: 'Hazır / Beklemede', color: '#64748b', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  },

  /**
   * Estimates ETA between vehicle coordinates and stop coordinates.
   */
  estimateEtaMinutes(vehicleLat: number, vehicleLng: number, targetLat: number, targetLng: number, averageSpeedKmh: number = 40): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((targetLat - vehicleLat) * Math.PI) / 180;
    const dLng = ((targetLng - vehicleLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((vehicleLat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    const timeHours = distanceKm / averageSpeedKmh;
    const minutes = Math.ceil(timeHours * 60);

    // Provide a safe minimum buffer of 2 minutes for realistic traffic
    return Math.max(1, minutes + 2);
  }
};
