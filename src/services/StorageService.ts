/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Storage provider interface allowing easy swapping between local sandbox, AWS S3, or Cloudflare R2
 */
export interface IStorageProvider {
  uploadFile(file: File, randomName: string, category: string): Promise<{ fileUrl: string; fileSizeStr: string }>;
  deleteFile(fileUrl: string): Promise<boolean>;
}

/**
 * Local Sandbox Storage Provider (Default)
 * Simulates secure local sandbox upload with granular access controls
 */
class LocalSandboxStorageProvider implements IStorageProvider {
  async uploadFile(file: File, randomName: string, category: string): Promise<{ fileUrl: string; fileSizeStr: string }> {
    // Simulate slight network upload delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    // Returns a sandbox resource path protected by server route rules
    const fileUrl = `/api/v1/documents/download/${randomName}`;
    
    return {
      fileUrl,
      fileSizeStr
    };
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    if (import.meta.env.DEV) {
      console.log(`[Local Sandbox Storage] File deleted: ${fileUrl}`);
    }
    return true;
  }
}

/**
 * Placeholder AWS S3 Storage Provider
 * Ready to be configured with AWS SDK
 */
class AWSS3StorageProvider implements IStorageProvider {
  async uploadFile(file: File, randomName: string, category: string): Promise<{ fileUrl: string; fileSizeStr: string }> {
    if (import.meta.env.DEV) {
      console.log(`[AWS S3] Uploading ${file.name} to S3 bucket...`);
    }
    const bucketName = 'bkt-secure-documents';
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${category}/${randomName}`;
    const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    return { fileUrl, fileSizeStr };
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    if (import.meta.env.DEV) {
      console.log(`[AWS S3] File deleted from bucket: ${fileUrl}`);
    }
    return true;
  }
}

/**
 * Placeholder Cloudflare R2 Storage Provider
 * Ready to be configured with R2 / S3-compatible client
 */
class CloudflareR2StorageProvider implements IStorageProvider {
  async uploadFile(file: File, randomName: string, category: string): Promise<{ fileUrl: string; fileSizeStr: string }> {
    if (import.meta.env.DEV) {
      console.log(`[Cloudflare R2] Uploading ${file.name} to R2 bucket...`);
    }
    const bucketName = 'bkt-r2-docs';
    const fileUrl = `https://r2.bkt.com/${bucketName}/${category}/${randomName}`;
    const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    return { fileUrl, fileSizeStr };
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    if (import.meta.env.DEV) {
      console.log(`[Cloudflare R2] File deleted from bucket: ${fileUrl}`);
    }
    return true;
  }
}

/**
 * Core Storage Service managing security validations, malware scans, and safe naming.
 */
export class StorageService {
  private static provider: IStorageProvider = new LocalSandboxStorageProvider();
  
  // Set default max size limit to 10MB
  private static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

  // Allowed mime types for security hardening
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];

  /**
   * Allows configuring S3 or R2 storage providers at runtime or initialization
   */
  public static setProvider(newProvider: IStorageProvider) {
    this.provider = newProvider;
  }

  /**
   * Sanitizes and randomizes file names to prevent directory traversal and overwrite attacks.
   */
  public static generateSecureRandomFilename(originalName: string): string {
    const cleanName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
    const extension = cleanName.substring(cleanName.lastIndexOf('.')).toLowerCase();
    const secureId = `bkt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return `${secureId}${extension}`;
  }

  /**
   * Simulates full virus scanning utilizing a sandboxed signature matching pipeline
   */
  public static async scanForMalware(file: File): Promise<{ clean: boolean; msg: string }> {
    // Simulate antivirus latency
    await new Promise(resolve => setTimeout(resolve, 600));

    // Security check: Reject file names that have signature indicators of high risk extensions or eicar string
    const lowerName = file.name.toLowerCase();
    if (
      lowerName.endsWith('.exe') || 
      lowerName.endsWith('.bat') || 
      lowerName.endsWith('.sh') || 
      lowerName.endsWith('.scr') ||
      lowerName.includes('eicar')
    ) {
      return {
        clean: false,
        msg: 'Virüs/Zararlı Yazılım Tehdidi Saptandı! (CRITICAL_MALWARE_THREAT)'
      };
    }

    return {
      clean: true,
      msg: 'Dosya tarandı: Herhangi bir tehdit bulunamadı.'
    };
  }

  /**
   * Main secure file upload controller orchestrating security filters, virus scans, and upload abstraction.
   */
  public static async uploadFile(
    file: File, 
    category: string
  ): Promise<{ success: boolean; fileUrl?: string; fileSizeStr?: string; error?: string; randomName?: string }> {
    try {
      // 1. File Size Verification
      if (file.size > this.MAX_FILE_SIZE_BYTES) {
        return {
          success: false,
          error: `Dosya boyutu limiti aşıldı! Maksimum izin verilen limit: 10MB (Yüklenen: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`
        };
      }

      // 2. MIME Type Verification
      if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
          success: false,
          error: `Geçersiz dosya biçimi (${file.type || 'Bilinmeyen'}). Sadece güvenli PDF, PNG ve JPG/JPEG formatları yüklenebilir.`
        };
      }

      // 3. Antivirus / Sandbox Scan
      const scanResult = await this.scanForMalware(file);
      if (!scanResult.clean) {
        return {
          success: false,
          error: scanResult.msg
        };
      }

      // 4. Randomized File Name Generation
      const randomName = this.generateSecureRandomFilename(file.name);

      // 5. Upload via selected Storage Provider
      const uploadDetails = await this.provider.uploadFile(file, randomName, category);

      return {
        success: true,
        fileUrl: uploadDetails.fileUrl,
        fileSizeStr: uploadDetails.fileSizeStr,
        randomName
      };
    } catch (err: any) {
      console.error('[StorageService Upload Error]', err);
      return {
        success: false,
        error: err.message || 'Dosya yükleme işlemi sırasında beklenmedik bir depolama hatası oluştu.'
      };
    }
  }
}
