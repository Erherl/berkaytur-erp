/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { APP_CONFIG } from '../../config/appConfig';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Standardizes raw exceptions into a user-friendly structured API error model
 */
export function normalizeApiError(error: any): ApiResult<never> {
  console.error('[API Boundary Error Logged]', error);
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message || 'Beklenmeyen bir hata oluştu.',
      code: 'SYSTEM_ERROR'
    };
  }
  if (typeof error === 'string') {
    return {
      success: false,
      error,
      code: 'RAW_ERROR'
    };
  }
  return {
    success: false,
    error: 'Bilinmeyen bir sunucu hatası meydana geldi.',
    code: 'UNKNOWN_ERROR'
  };
}

// Client-side CSRF Token container
let cachedCsrfToken: string | null = null;

/**
 * Clean production cookie and token management utilities
 */
export function getCookie(name: string): string | null {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
    }
  } catch (e) {
    // Ignore cookie reading errors
  }
  return null;
}

export function setCookie(name: string, value: string, days?: number) {
  try {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
    }
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const sameSite = isSecure ? 'None' : 'Lax';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value || "")}${expires}; path=/; SameSite=${sameSite}${secureFlag}`;
  } catch (e) {
    // Ignore cookie setting errors
  }
}

export function eraseCookie(name: string) {   
  try {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const sameSite = isSecure ? 'None' : 'Lax';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${name}=; Max-Age=-99999999; path=/; SameSite=${sameSite}${secureFlag}`;
  } catch (e) {}
}

export function getAuthToken(): string | null {
  const cookieToken = getCookie('bkt_access_token');
  if (cookieToken) return cookieToken;
  try {
    return sessionStorage.getItem('bkt_access_token') || localStorage.getItem('bkt_access_token');
  } catch (e) {
    return null;
  }
}

export function getRefreshToken(): string | null {
  const cookieToken = getCookie('bkt_refresh_token');
  if (cookieToken) return cookieToken;
  try {
    return sessionStorage.getItem('bkt_refresh_token') || localStorage.getItem('bkt_refresh_token');
  } catch (e) {
    return null;
  }
}

export function setAuthTokens(accessToken: string, refreshToken?: string) {
  setCookie('bkt_access_token', accessToken, 7);
  if (refreshToken) {
    setCookie('bkt_refresh_token', refreshToken, 7);
  }
  try {
    sessionStorage.setItem('bkt_access_token', accessToken);
    if (refreshToken) {
      sessionStorage.setItem('bkt_refresh_token', refreshToken);
    }

    // Legacy migration fallback: keep a cached copy in localStorage for older screens.
    localStorage.setItem('bkt_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('bkt_refresh_token', refreshToken);
    }
  } catch (e) {}
}

export function clearAuthTokens() {
  eraseCookie('bkt_access_token');
  eraseCookie('bkt_refresh_token');
  try {
    localStorage.removeItem('bkt_access_token');
    localStorage.removeItem('bkt_refresh_token');
    sessionStorage.removeItem('bkt_access_token');
    sessionStorage.removeItem('bkt_refresh_token');
  } catch (e) {}
}

/**
 * Performs dynamic CSRF handshake to retrieve cookie token for double submit verification
 */
async function getCsrfTokenIfNeeded(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch('/api/v1/auth/csrf', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.ok) {
      const envelope = await res.json();
      if (envelope.success && envelope.data?.csrfToken) {
        cachedCsrfToken = envelope.data.csrfToken;
        return cachedCsrfToken;
      }
    }
  } catch (err) {
    console.error('Failed to pre-fetch CSRF token:', err);
  }
  return null;
}

/**
 * Generic REST API Caller that handles API Versioning, CSRF protection headers,
 * and standardizes response unwrapping.
 */
async function requestV1<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const options = init || {};
    const method = options.method ? options.method.toUpperCase() : 'GET';
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    const headers = new Headers(options.headers || {});
    
    // Auto-inject JWT access token if present in cookie, localStorage or sessionStorage
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Auto-inject CSRF token for mutating state requests
    if (isMutation) {
      const csrf = await getCsrfTokenIfNeeded();
      if (csrf) {
        headers.set('X-CSRF-Token', csrf);
      }
    }

    options.headers = headers;

    options.credentials = options.credentials || 'include';
    const res = await fetch(url, options);
    
    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      return { success: true } as any;
    }

    // Unpack standardized envelope
    if (json && typeof json === 'object' && ('success' in json) && ('timestamp' in json)) {
      if (json.success) {
        return {
          success: true,
          data: json.data !== undefined ? json.data : json
        };
      } else {
        return {
          success: false,
          error: json.error || json.message || 'İşlem başarısız oldu.',
          code: 'API_ERROR'
        };
      }
    }

    if (!res.ok) {
      throw new Error(json.error || json.message || `HTTP Error ${res.status}`);
    }

    return {
      success: true,
      data: json
    };
  } catch (error) {
    return normalizeApiError(error);
  }
}

/**
 * Robust API Client Boundary
 * Communicates with the Express server-side REST backend
 */
export const ApiClient = {
  /**
   * Helper that simulates typical network latency
   */
  async delay(ms: number = APP_CONFIG.API.SIMULATED_LATENCY_MS): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Triggers or simulates synchronization with the external Google Sheets spreadsheet endpoint
   */
  async syncGoogleSheets(sheetsUrl: string): Promise<ApiResult<{ syncedCount: number; timestamp: string }>> {
    try {
      await this.delay();
      
      if (!sheetsUrl || !sheetsUrl.startsWith('http')) {
        throw new Error('Geçersiz Google Apps Script / Google Sheets URL!');
      }

      // Call Sheets synchronization endpoint
      return requestV1<{ syncedCount: number; timestamp: string }>('/api/v1/sheets-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { sheetsUrl } })
      });
    } catch (error) {
      return normalizeApiError(error);
    }
  },

  /**
   * Standardizes any external HTTP request payload safely
   */
  async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
    return requestV1<T>(endpoint, options);
  },

  async fetchAppStorage(namespace: string = APP_CONFIG.STORAGE_PREFIX): Promise<ApiResult<{ namespace: string; entries: Array<{ key: string; value: string; updatedAt?: string }> }>> {
    return requestV1(`/api/v1/app-storage?namespace=${encodeURIComponent(namespace)}`);
  },

  async syncAppStorage(entries: Array<{ key: string; value: string }>, namespace: string = APP_CONFIG.STORAGE_PREFIX): Promise<ApiResult<{ namespace: string; updated: number }>> {
    return requestV1('/api/v1/app-storage/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace, entries })
    });
  },

  async deleteAppStorage(keys: string[], namespace: string = APP_CONFIG.STORAGE_PREFIX): Promise<ApiResult<{ namespace: string; deleted: number }>> {
    return requestV1('/api/v1/app-storage/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace, keys })
    });
  },

  /**
   * Fetch active server-side audit logs
   */
  async fetchLogs(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/logs');
  },

  /**
   * Write an audit log entry to the persistent server-side journal
   */
  async postLog(log: { action: string; details: string; userName?: string; userRole?: string; userId?: string }): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  },

  /**
   * Fetch live document records from the server storage sandbox
   */
  async fetchDocuments(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/documents');
  },

  /**
   * Safe upload of a new document/contract into the Express sandbox
   */
  async uploadDocument(doc: { name: string; category?: string; path?: string; fileSize: string; uploadedBy?: string }): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
  },

  /**
   * High scaling server-side debounced query matching
   */
  async searchServerSide(query: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * Automated WhatsApp dispatch trigger via active server-side gateway
   */
  async sendWhatsAppMessage(payload: { recipientPhone: string; recipientName: string; message: string; templateName: string }): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  /**
   * Fetch active WhatsApp gateway connection and device status
   */
  async fetchWhatsAppStatus(): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/whatsapp/status');
  },

  /**
   * Initialize a secure connection link on the WhatsApp Web server-side instance
   */
  async connectWhatsApp(): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/whatsapp/connect', { method: 'POST' });
  },

  /**
   * Gracefully close active WhatsApp sessions
   */
  async disconnectWhatsApp(): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/whatsapp/disconnect', { method: 'POST' });
  },

  /**
   * Dispatch multimedia file attachments (PDF, Image, Location, Audio, etc.)
   */
  async sendMediaWhatsApp(payload: { phone: string; message: string; mediaType: string }): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/whatsapp/send-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  /**
   * Fetch active vehicles list from server-side database
   */
  async fetchVehicles(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/vehicles');
  },

  /**
   * Create new vehicle on the server database
   */
  async createVehicle(vehicle: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle)
    });
  },

  /**
   * Update existing vehicle details on the server database
   */
  async updateVehicle(id: string, vehicle: any): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle)
    });
  },

  /**
   * Delete vehicle from the server database
   */
  async deleteVehicle(id: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/vehicles/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Add operational history item to a vehicle on the server database
   */
  async addVehicleHistory(id: string, historyItem: any): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/vehicles/${id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyItem)
    });
  },

  /**
   * Fetch active attendance (puantaj) status list
   */
  async fetchAttendance(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/attendance');
  },

  /**
   * Create or update attendance record on the server
   */
  async postAttendance(record: { studentId: string; date: string; shift: 'morning' | 'evening'; status: string; editorName?: string; editorRole?: string }): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  },

  /**
   * Fetch active payment records
   */
  async fetchPayments(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/payments');
  },

  /**
   * Create a new student fee collection / transaction
   */
  async createPayment(payment: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment)
    });
  },

  /**
   * Rollback / delete a transaction with Audit logs
   */
  async rollbackPayment(id: string, operator: { operatorName: string; operatorRole: string }): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/payments/${id}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operator)
    });
  },

  /**
   * Verify seating position rules
   */
  async validateSeating(id: string, seatNumber: number, studentId: string, action: 'assign' | 'unassign'): Promise<ApiResult<{ valid: boolean }>> {
    return requestV1<{ valid: boolean }>(`/api/v1/vehicles/${id}/seating/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatNumber, studentId, action })
    });
  },

  /**
   * Persist detailed seating arrangement plan
   */
  async saveSeating(id: string, seating: Record<number, string>, editorName?: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/vehicles/${id}/seating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seating, editorName })
    });
  },

  /**
   * Fetch registration application forms
   */
  async fetchApplications(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/applications');
  },

  /**
   * Create a registration form submission
   */
  async createApplication(app: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app)
    });
  },

  /**
   * Update registration form status (approved, rejected, pending)
   */
  async updateApplication(id: string, updateData: any): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
  },

  /**
   * Fetch active contracts
   */
  async fetchContracts(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/contracts');
  },

  /**
   * Create legal contract template
   */
  async createContract(contract: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract)
    });
  },

  /**
   * Save parent digital signature
   */
  async signContract(id: string, signatureData: string, signerName?: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/contracts/${id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureData, signerName })
    });
  },

  /**
   * Fetch statistical analysis reports
   */
  async fetchReports(type: string, query?: string): Promise<ApiResult<{ data: any[]; summary: Record<string, any> }>> {
    return requestV1<{ data: any[]; summary: Record<string, any> }>(`/api/v1/reports/${type}?q=${encodeURIComponent(query || '')}`);
  },

  /**
   * Fetch all active users (personnel)
   */
  async fetchUsers(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/users');
  },

  /**
   * Create a new personnel user
   */
  async createUser(user: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  },

  /**
   * Update personnel user information & assignments
   */
  async updateUser(id: string, user: any): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  },

  /**
   * Delete a personnel user
   */
  async deleteUser(id: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/users/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Change user password (first login constraint)
   */
  async changePassword(id: string, newPassword: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/users/${id}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
  },

  /**
   * Log in via backend REST API, storing accessToken securely in Strict cookie
   */
  async login(role: string, username?: string, password?: string): Promise<ApiResult<any>> {
    try {
      const payload = {
        role,
        username: username || '',
        password: password || '',
        rememberMe: true
      };

      const res = await requestV1<any>('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.success && res.data?.accessToken) {
        setAuthTokens(res.data.accessToken, res.data.refreshToken);
      }
      return res;
    } catch (error) {
      return normalizeApiError(error);
    }
  },

  /**
   * Log out from server and clear all local cookies and tokens
   */
  async logout(): Promise<ApiResult<any>> {
    try {
      const refreshToken = getRefreshToken() || '';
      const res = await requestV1<any>('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      clearAuthTokens();
      return res;
    } catch (error) {
      clearAuthTokens();
      return normalizeApiError(error);
    }
  },

  /**
   * Verify the current backend session and retrieve authenticated user profile
   */
  async verifySession(): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/auth/verify');
  },

  /**
   * Fetch assignment audit logs
   */
  async fetchAssignmentLogs(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/assignments/audit-logs');
  },

  /**
   * Fetch system stats
   */
  async fetchSystemStats(): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/admin/system-stats');
  },

  /**
   * Fetch database tables
   */
  async fetchDatabaseTables(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/admin/database-tables');
  },

  /**
   * Fetch backups list
   */
  async fetchBackups(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/admin/backups');
  },

  /**
   * Run system diagnostic tests
   */
  async runTests(): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/admin/run-tests');
  },

  /**
   * Create database backup
   */
  async createBackup(): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/admin/backup', { method: 'POST' });
  },

  /**
   * Restore database from backup file
   */
  async restoreBackup(filename: string): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/admin/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
  },

  /**
   * Extract document dates using Gemini OCR
   */
  async extractDocDate(docKey: string, fileName: string, userRole: string): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/extract-doc-date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docKey, fileName, userRole })
    });
  },

  /**
   * Chat with Gemini Report analyst
   */
  async geminiChat(prompt: string, systemContext: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemContext })
    });
  },

  /**
   * Fetch active schools list from server
   */
  async fetchSchools(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/schools');
  },

  async createSchool(school: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(school)
    });
  },

  async updateSchool(id: string, school: any): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/schools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(school)
    });
  },

  async deleteSchool(id: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/schools/${id}`, {
      method: 'DELETE'
    });
  },

  async validateApplicationAddress(address: string, selectedDistrict?: string): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/applications/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, selectedDistrict })
    });
  },

  /**
   * Fetch active students list from server
   */
  async fetchStudents(): Promise<ApiResult<any[]>> {
    return requestV1<any[]>('/api/v1/students');
  },

  async createStudent(student: any): Promise<ApiResult<any>> {
    return requestV1<any>('/api/v1/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student)
    });
  },

  async updateStudent(id: string, student: any): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student)
    });
  },

  async deleteStudent(id: string): Promise<ApiResult<any>> {
    return requestV1<any>(`/api/v1/students/${id}`, {
      method: 'DELETE'
    });
  }
};
