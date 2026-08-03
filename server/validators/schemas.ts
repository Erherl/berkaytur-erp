/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || 'Geçersiz parametre girişi.';
}

export const userRoleEnum = z.enum(['admin', 'manager', 'coordinator', 'driver', 'hostess', 'accounting', 'parent', 'operation']);
const optionalUuid = z.string().uuid().optional().or(z.string().min(1).optional()).nullable();
const optionalTrimmedString = (max: number) => z.string().trim().max(max).optional().nullable();
const idArraySchema = z.array(z.string().min(1).max(120)).max(250).optional();
const paymentPlanSchema = z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional().nullable();

// ==========================================
// AUTHENTICATION SCHEMAS
// ==========================================
export const loginSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır.').max(50, 'Kullanıcı adı çok uzun.'),
  password: z.string().min(3, 'Şifre en az 3 karakter olmalıdır.').max(100, 'Şifre çok uzun.'),
  role: userRoleEnum.optional(),
  rememberMe: z.boolean().optional(),
});

export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token gereklidir.')
});

// ==========================================
// GEMINI / AI SCHEMAS
// ==========================================
export const geminiChatSchema = z.object({
  prompt: z.string().min(1, 'Prompt boş olamaz.').max(2000, 'Prompt çok uzun.'),
  systemContext: z.any().optional()
});

export const ocrSchema = z.object({
  docKey: z.string().min(1, 'docKey gereklidir.'),
  fileName: z.string().min(1, 'fileName gereklidir.'),
  userRole: z.string().optional()
});

// ==========================================
// VEHICLE SCHEMAS
// ==========================================
export const vehicleSchema = z.object({
  plate: z.string().min(7, 'Plaka en az 7 karakter olmalıdır.').max(12, 'Geçersiz plaka formatı.'),
  brand: z.string().min(2, 'Marka adı zorunludur.').max(50),
  model: z.string().min(2, 'Model adı zorunludur.').max(50),
  capacity: z.number().min(5, 'Kapasite en az 5 olmalıdır.').max(60, 'Kapasite en fazla 60 olabilir.'),
  schoolId: optionalUuid,
  driverId: optionalUuid,
  hostessId: optionalUuid,
  driverName: optionalTrimmedString(100),
  driverPhone: optionalTrimmedString(30),
  hostessName: optionalTrimmedString(100),
  hostessPhone: optionalTrimmedString(30),
  year: z.number().int().min(1990).max(2100).optional().nullable(),
  status: z.enum(['active', 'idle', 'service', 'maintenance', 'inactive']).optional(),
  supplierCompany: optionalTrimmedString(120),
  seating: z.record(z.string(), z.string().nullable().optional()).optional(),
}).strict();

export const vehicleHistorySchema = z.object({
  date: z.string().optional(),
  type: z.enum(['school', 'repair', 'driver', 'audit', 'fuel', 'maintenance', 'accident']).default('audit'),
  title: z.string().min(3, 'Başlık en az 3 karakter olmalıdır.').max(100),
  details: z.string().max(500).optional(),
  cost: z.number().nonnegative('Maliyet negatif olamaz.').optional()
}).strict();

export const validateSeatingSchema = z.object({
  seatNumber: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  studentId: z.string().min(1, 'Öğrenci ID gereklidir.'),
  action: z.enum(['assign', 'unassign'])
}).strict();

export const updateSeatingSchema = z.object({
  seating: z.record(z.string(), z.string().nullable().optional()),
  editorName: z.string().max(100).optional()
}).strict();

// ==========================================
// ATTENDANCE SCHEMAS
// ==========================================
export const attendanceSchema = z.object({
  studentId: z.string().min(1, 'Öğrenci ID gereklidir.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır.'),
  shift: z.enum(['morning', 'evening']),
  status: z.enum(['present', 'absent', 'excused', 'pending']),
  editorName: z.string().max(100).optional(),
  editorRole: z.string().max(50).optional()
}).strict();

// ==========================================
// PAYMENT SCHEMAS
// ==========================================
export const createPaymentSchema = z.object({
  studentId: z.string().min(1, 'Öğrenci ID gereklidir.'),
  studentName: z.string().min(2, 'Öğrenci adı zorunludur.').max(100),
  parentName: z.string().max(100).optional(),
  amount: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => Number.isFinite(val) && val > 0, 'Tutar 0’dan büyük olmalıdır.'),
  dueDate: z.string().optional(),
  category: z.string().max(50).optional(),
  description: z.string().max(250).optional(),
  paymentMethod: z.string().max(50).optional(),
  currency: z.string().max(10).optional()
}).strict();

export const rollbackPaymentSchema = z.object({
  operatorName: z.string().max(100).optional(),
  operatorRole: z.string().max(50).optional()
}).strict();

// ==========================================
// REGISTRATION APPLICATION SCHEMAS
// ==========================================
export const ISTANBUL_DISTRICT_KEYS = [
  'adalar','arnavutkoy','atasehir','avcilar','bagcilar','bahcelievler','bakirkoy',
  'basaksehir','bayrampasa','besiktas','beykoz','beylikduzu','beyoglu',
  'buyukcekmece','catalca','cekmekoy','esenler','esenyurt','eyupsultan','fatih',
  'gaziosmanpasa','gungoren','kadikoy','kagithane','kartal','kucukcekmece',
  'maltepe','pendik','sancaktepe','sariyer','silivri','sultanbeyli','sultangazi',
  'sile','sisli','tuzla','umraniye','uskudar','zeytinburnu',
] as const;

export const validateApplicationAddressSchema = z.object({
  address: z.string().min(3, 'Adres en az 3 karakter olmalıdır.'),
  selectedDistrict: z.string().optional().nullable()
}).strict();

export const createApplicationSchema = z.object({
  studentName: z.string().min(2, 'Öğrenci adı en az 2 karakter olmalıdır.').max(100),
  tcNo: z.string().length(11, 'T.C. Kimlik Numarası 11 hane olmalıdır.').optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  classLevel: z.string().optional().nullable(),
  section: z.string().optional().nullable(),
  motherName: z.string().optional().nullable(),
  fatherName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Geçersiz e-posta adresi.').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  morningAddress: z.string().min(3, 'Sabah adresi zorunludur.').optional().nullable(),
  eveningAddress: z.string().min(3, 'Akşam adresi zorunludur.').optional().nullable(),
  morningDistrict: z.string()
    .refine(
      (v) => !v || ISTANBUL_DISTRICT_KEYS.includes(v.toLocaleLowerCase('tr-TR')
        .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g')
        .replace(/ü/g,'u').replace(/ö/g,'o').replace(/[^a-z]/g,'') as any),
      { message: 'Sabah adresi İstanbul\'un 39 ilçesinden biri olmalıdır.' }
    )
    .optional().nullable(),
  eveningDistrict: z.string()
    .refine(
      (v) => !v || ISTANBUL_DISTRICT_KEYS.includes(v.toLocaleLowerCase('tr-TR')
        .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g')
        .replace(/ü/g,'u').replace(/ö/g,'o').replace(/[^a-z]/g,'') as any),
      { message: 'Akşam adresi İstanbul\'un 39 ilçesinden biri olmalıdır.' }
    )
    .optional().nullable(),
  schoolDistrict: z.string().optional().nullable(),
  siblingInfo: z.string().optional().nullable(),
  allergy: z.string().optional().nullable(),
  medication: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  secondPhone: z.string().optional().nullable(),
  secondAddress: z.string().optional().nullable(),
  specialCondition: z.string().optional().nullable(),
  deliveryInstruction: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  submitTimerMs: z.number().optional().nullable(),
  kvkkConsent: z.boolean().default(false),
  rulesConsent: z.boolean().default(false),
  contractConsent: z.boolean().default(false),
  km: z.number().optional().nullable(),
  calculatedFee: z.number().optional().nullable()
}).strict();

export const updateApplicationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'Bekliyor', 'Onaylandı', 'Reddedildi']).optional(),
  km: z.number().optional().nullable(),
  calculatedFee: z.number().optional().nullable()
}).strict();

// ==========================================
// CONTRACT SCHEMAS
// ==========================================
export const createContractSchema = z.object({
  studentId: z.string().min(1, 'Öğrenci ID zorunludur.'),
  studentName: z.string().min(2, 'Öğrenci adı zorunludur.'),
  parentName: z.string().max(100).optional(),
  parentPhone: z.string().max(30).optional(),
  schoolName: z.string().max(100).optional(),
  driverName: z.string().max(100).optional(),
  driverPhone: z.string().max(30).optional(),
  hostessName: z.string().max(100).optional(),
  hostessPhone: z.string().max(30).optional(),
  vehiclePlate: z.string().max(15).optional(),
  vehicleModel: z.string().max(50).optional(),
  km: z.number().optional(),
  annualFee: z.number().optional(),
  paymentType: z.enum(['Taksitli', 'Peşin', 'Kredi Kartı']).optional(),
  installmentCount: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  term: z.string().max(50).optional()
}).strict();

export const signContractSchema = z.object({
  signatureData: z.string().min(1, 'İmza görsel verisi gereklidir.'),
  signerName: z.string().max(100).optional()
}).strict();

// ==========================================
// SYSTEM LOG SCHEMAS
// ==========================================
export const createLogSchema = z.object({
  action: z.string().min(2, 'Aksiyon tanımı zorunludur.').max(100),
  details: z.string().min(2, 'Detay zorunludur.').max(1000),
  userName: z.string().max(100).optional(),
  userRole: z.string().max(50).optional(),
  userId: z.string().max(50).optional()
}).strict();

// ==========================================
// DOCUMENT SCHEMAS
// ==========================================
export const uploadDocumentSchema = z.object({
  name: z.string().min(1, 'Dosya adı zorunludur.').max(200),
  category: z.string().min(1, 'Kategori zorunludur.').max(100),
  fileSize: z.string().max(50).optional(),
  uploadedBy: z.string().max(100).optional(),
  fileData: z.string().min(1, 'Dosya verisi gereklidir.').optional(),
  mimeType: z.string().max(100).optional(),
  schoolId: optionalUuid,
  vehicleId: optionalUuid,
  studentId: optionalUuid,
  ownerUserId: optionalUuid
}).strict();

export const updateDocumentSchema = z.object({
  name: z.string().min(1, 'Dosya adı zorunludur.').max(200).optional(),
  category: z.string().min(1, 'Kategori zorunludur.').max(100).optional(),
  fileSize: z.string().max(50).optional(),
  fileData: z.string().min(1, 'Dosya verisi gereklidir.').optional(),
  mimeType: z.string().max(100).optional(),
  schoolId: optionalUuid,
  vehicleId: optionalUuid,
  studentId: optionalUuid,
  ownerUserId: optionalUuid
}).strict();

// ==========================================
// WHATSAPP SCHEMAS
// ==========================================
export const sendWhatsAppSchema = z.object({
  recipientPhone: z.string().min(10, 'Telefon numarası eksik veya hatalı.').max(30),
  recipientName: z.string().min(2, 'Alıcı ismi zorunludur.').max(100),
  message: z.string().min(1, 'Mesaj boş bırakılamaz.').max(2000),
  templateName: z.string().max(100).optional()
}).strict();

// ==========================================
// SHEETS WEBHOOK SCHEMAS
// ==========================================
export const sheetsSyncSchema = z.object({
  sheetName: z.string().optional(),
  row: z.number().optional(),
  col: z.number().optional(),
  value: z.any().optional(),
  rowData: z.any().optional(),
  headers: z.array(z.string()).optional(),
  type: z.string().optional(),
  data: z.any().optional()
});

// ==========================================
// BACKUP SCHEMAS
// ==========================================
export const restoreBackupSchema = z.object({
  filename: z.string().min(1, 'Geri yüklenecek yedek dosya adı zorunludur.')
}).strict();

// ==========================================
// USER / SCHOOL / STUDENT MANAGEMENT SCHEMAS
// ==========================================
export const schoolRateSchema = z.object({
  minKm: z.number().min(0).optional(),
  maxKm: z.number().min(0).optional(),
  monthlyFee: z.number().min(0),
  annualFee: z.number().min(0).optional().nullable(),
  regionName: z.string().max(120).optional(),
  description: z.string().max(250).optional().nullable(),
}).strict();

export const schoolSchema = z.object({
  name: z.string().min(2, 'Okul adı zorunludur.').max(160),
  address: z.string().max(250).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email('Geçersiz e-posta adresi.').optional().nullable().or(z.literal('')),
  type: z.enum(['kolej', 'devlet']).optional(),
  kmRates: z.array(z.object({
    minKm: z.number().min(0),
    maxKm: z.number().min(0),
    monthlyFee: z.number().min(0),
    annualFee: z.number().min(0).optional().nullable(),
  }).strict()).max(100).optional(),
  regionRates: z.array(z.object({
    regionName: z.string().min(1).max(120),
    monthlyFee: z.number().min(0),
    annualFee: z.number().min(0).optional().nullable(),
    description: z.string().max(250).optional().nullable(),
  }).strict()).max(100).optional(),
}).strict();

export const studentMutationSchema = z.object({
  name: z.string().min(2, 'Öğrenci adı zorunludur.').max(120),
  studentNumber: optionalTrimmedString(50),
  classLevel: optionalTrimmedString(30),
  schoolId: optionalUuid,
  schoolName: optionalTrimmedString(160),
  schoolType: z.enum(['kolej', 'devlet']).optional().nullable(),
  regionName: optionalTrimmedString(120),
  distanceKm: z.number().min(0).optional().nullable(),
  assignedFee: z.number().min(0).optional().nullable(),
  monthlyFee: z.number().min(0).optional().nullable(),
  installmentCount: z.number().int().min(1).max(24).optional().nullable(),
  paymentPlan: paymentPlanSchema,
  parentName: optionalTrimmedString(120),
  parentPhone: optionalTrimmedString(30),
  routeId: optionalUuid,
  routeName: optionalTrimmedString(120),
  morningStatus: z.enum(['pending', 'on_board', 'arrived', 'absent']).optional(),
  eveningStatus: z.enum(['pending', 'on_board', 'arrived', 'absent']).optional(),
  registrationStatus: z.enum(['Potansiyel', 'Sözleşme Bekliyor', 'İmzalandı', 'Aktif', 'Pasif', 'Ayrıldı', 'Mezun']).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
}).strict();

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Ad Soyad zorunludur.').max(120),
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır.').max(50),
  password: z.string().min(12, 'Şifre en az 12 karakter olmalıdır.').max(128)
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir.')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir.')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir.')
    .regex(/[^A-Za-z0-9]/, 'Şifre en az bir özel karakter içermelidir.'),
  role: userRoleEnum,
  email: z.string().email('Geçersiz e-posta adresi.').optional().nullable().or(z.literal('')),
  phone: optionalTrimmedString(30),
  status: z.enum(['active', 'inactive']).optional(),
  tcNo: optionalTrimmedString(20),
  photo: optionalTrimmedString(500),
  notes: optionalTrimmedString(1000),
  schoolId: optionalUuid,
  vehicleId: optionalUuid,
  assignedSchools: idArraySchema,
  assignedAreas: idArraySchema,
  assignedProjects: idArraySchema,
  assignedVehicles: idArraySchema,
  assignedDrivers: idArraySchema,
  assignedHostesses: idArraySchema,
}).strict();

export const userUpdateSchema = userCreateSchema.partial().extend({
  mustChangePassword: z.boolean().optional(),
}).strict();

export const changePasswordSchema = z.object({
  newPassword: z.string().min(12, 'Şifre en az 12 karakter olmalıdır.').max(128)
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir.')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir.')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir.')
    .regex(/[^A-Za-z0-9]/, 'Şifre en az bir özel karakter içermelidir.'),
}).strict();

// ==========================================
// COMMON PARAM SCHEMAS
// ==========================================
export const idParamSchema = z.object({
  id: z.string().uuid('ID geçersiz formatta (UUID bekleniyor).').or(z.string().min(1, 'ID gereklidir.'))
});

export const idParamUuidOnlySchema = z.object({
  id: z.string().uuid('ID geçersiz formatta (UUID bekleniyor).')
});

export const reportTypeParamSchema = z.object({
  type: z.enum(['vehicles', 'students', 'attendance', 'payments', 'overview', 'financial'])
});
