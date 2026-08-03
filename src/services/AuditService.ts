import { ActivityLog, User } from '../types';
import { APP_CONFIG } from '../config/appConfig';

/**
 * Audit & Logging service to standardize, format, and audit operational events.
 */
export const AuditService = {
  /**
   * Sniffs user agent to determine the device/browser platform
   */
  detectDeviceType(): string {
    if (typeof navigator === 'undefined') {
      return 'Sunucu / Bilinmeyen Cihaz';
    }
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android Mobil';
    if (/iphone|ipad/i.test(ua)) return 'iOS Mobil';
    if (/macintosh/i.test(ua)) return 'MacOS Masaüstü';
    if (/windows/i.test(ua)) return 'Windows Masaüstü';
    if (/linux/i.test(ua)) return 'Linux Masaüstü';
    return 'Bilinmeyen Cihaz';
  },

  /**
   * Simulates a local secure network IP to satisfy transactional tracking structure
   */
  generateSimulatedIp(): string {
    return '192.168.1.' + Math.floor(Math.random() * 80 + 101);
  },

  /**
   * Formats a complete and standardized ActivityLog entry
   */
  createLogEntry(
    action: string,
    details: string,
    currentUser: User | null,
    oldValue?: string,
    newValue?: string
  ): ActivityLog {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistem',
      userRole: currentUser?.role || 'admin',
      action,
      details,
      timestamp: new Date().toLocaleString(),
      ipAddress: this.generateSimulatedIp(),
      device: this.detectDeviceType(),
      oldValue: oldValue || undefined,
      newValue: newValue || undefined
    };
  },

  /**
   * Appends a log entry to a list of logs, obeying the historical length threshold
   */
  appendLog(
    logs: ActivityLog[],
    newLog: ActivityLog,
    maxSize: number = APP_CONFIG.MAX_LOG_ENTRIES
  ): ActivityLog[] {
    return [newLog, ...logs].slice(0, maxSize);
  }
};
