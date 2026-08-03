/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import logger from '../utils/logger';

export class GoogleSheetsAndDriveService {
  private static getUrl(): string | undefined {
    return process.env.GOOGLE_APPS_SCRIPT_URL;
  }

  private static getSecret(): string {
    return process.env.APPS_SCRIPT_SECRET || '';
  }

  public static isConfigured(): boolean {
    const url = this.getUrl();
    return !!(url && url.startsWith('http'));
  }

  /**
   * Universal fetch helper with retry logic, timeout, and custom header credentials proxy
   */
  private static async callAppsScript(payload: any, retries = 3, delay = 1000): Promise<any> {
    const url = this.getUrl();
    if (!url) {
      throw new Error('Google Apps Script URL is not configured in environment variables.');
    }

    const body = {
      ...payload,
      secret: this.getSecret(),
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google Apps Script gateway returned status code: ${response.status}`);
      }

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Failed to parse Google Apps Script response as JSON: ${responseText.substring(0, 200)}`);
      }

      if (!result.success) {
        throw new Error(result.error || result.message || 'Unknown error occurred in Apps Script action.');
      }

      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      logger.error(`[GoogleAppsScript] Error on action "${payload.action}":`, error);

      if (retries > 0) {
        logger.warn(`[GoogleAppsScript] Retrying action "${payload.action}" in ${delay}ms... (Remaining retries: ${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.callAppsScript(payload, retries - 1, delay * 2);
      }

      throw error;
    }
  }

  /**
   * Fetch all data from all sheets as a single nested database JSON object
   */
  public static async getAllData(): Promise<Record<string, any[]>> {
    const res = await this.callAppsScript({ action: 'getAllData' });
    return res.data || {};
  }

  /**
   * Save (Insert or Update) a row in a specific Google Sheet
   */
  public static async syncRow(sheetName: string, keyValue: string, rowData: Record<string, any>, keyField = 'id'): Promise<void> {
    // Sanitize values to ensure everything can be serialized elegantly to Sheets
    const sanitizedData: Record<string, any> = {};
    for (const [key, val] of Object.entries(rowData)) {
      if (val === null || val === undefined) {
        sanitizedData[key] = '';
      } else if (typeof val === 'object') {
        sanitizedData[key] = JSON.stringify(val);
      } else {
        sanitizedData[key] = val;
      }
    }

    await this.callAppsScript({
      action: 'syncRow',
      sheetName,
      keyField,
      keyValue,
      rowData: sanitizedData,
    });
  }

  /**
   * Delete a row from a specific Google Sheet
   */
  public static async deleteRow(sheetName: string, keyValue: string, keyField = 'id'): Promise<void> {
    await this.callAppsScript({
      action: 'deleteRow',
      sheetName,
      keyField,
      keyValue,
    });
  }

  /**
   * Upload a physical file to Google Drive under a category folder in /BerkayTur/
   */
  public static async uploadFile(
    folderName: 'Contracts' | 'Documents' | 'Reports' | 'Archives' | 'StudentFiles' | 'VehicleFiles',
    fileName: string,
    mimeType: string,
    base64Data: string
  ): Promise<{ fileId: string; fileUrl: string; webViewUrl: string }> {
    const res = await this.callAppsScript({
      action: 'uploadFile',
      folderName,
      fileName,
      mimeType,
      fileData: base64Data,
    });

    return {
      fileId: res.fileId,
      fileUrl: res.fileUrl,
      webViewUrl: res.webViewUrl,
    };
  }

  /**
   * Delete a physical file from Google Drive
   */
  public static async deleteFile(fileId: string): Promise<void> {
    await this.callAppsScript({
      action: 'deleteFile',
      fileId,
    });
  }
}
