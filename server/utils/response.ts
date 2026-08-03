/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  } | null;
  timestamp: string;
}

export function successResponse<T>(data: T, message = 'İşlem başarılı', meta: any = null): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString()
  };
}

export function errorResponse(message: string, errorDetails: any = null): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    meta: errorDetails ? { details: errorDetails } : null,
    timestamp: new Date().toISOString()
  };
}
