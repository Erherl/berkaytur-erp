import { Student } from '../types';

/**
 * Service to handle Student-specific operational computations, status translations, and business rules.
 */
export const StudentService = {
  /**
   * Safe distance threshold checks using Haversine formula for geofencing or map alignments.
   */
  isCloseToStop(studentLat: number, studentLng: number, stopLat: number, stopLng: number, thresholdMeters: number = 100): boolean {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (studentLat * Math.PI) / 180;
    const phi2 = (stopLat * Math.PI) / 180;
    const deltaPhi = ((stopLat - studentLat) * Math.PI) / 180;
    const deltaLambda = ((stopLng - studentLng) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance <= thresholdMeters;
  },

  /**
   * Standardizes student morning/evening statuses for UI badges
   */
  getReadableStatus(status: Student['morningStatus'] | Student['eveningStatus'] | undefined): { label: string; badgeClass: string } {
    switch (status) {
      case 'on_bus':
        return { label: 'Araçta', badgeClass: 'bg-indigo-500 text-white' };
      case 'at_school':
        return { label: 'Okulda', badgeClass: 'bg-emerald-500 text-white' };
      case 'at_home':
        return { label: 'Evde', badgeClass: 'bg-blue-500 text-white' };
      case 'absent':
        return { label: 'Yok', badgeClass: 'bg-rose-500 text-white' };
      case 'pending':
      default:
        return { label: 'Bekliyor', badgeClass: 'bg-amber-500 text-white' };
    }
  }
};
