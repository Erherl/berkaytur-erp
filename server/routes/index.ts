/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middlewares/validate';
import { csrfTokenProtection, getCsrfToken } from '../middlewares/security';
import { requireRole, requirePermission } from '../middlewares/auth';

// Import Controllers
import { AuthController } from '../controllers/authController';
import { GeminiController } from '../controllers/geminiController';
import { VehicleController } from '../controllers/vehicleController';
import { PaymentController } from '../controllers/paymentController';
import { ApplicationController } from '../controllers/applicationController';
import { ContractController } from '../controllers/contractController';
import { LogController } from '../controllers/logController';
import { DocumentController } from '../controllers/documentController';
import { WhatsAppController } from '../controllers/whatsappController';
import { ReportController } from '../controllers/reportController';
import { AdminController } from '../controllers/adminController';
import { AttendanceController } from '../controllers/attendanceController';
import { SheetsController } from '../controllers/sheetsController';
import { SearchController } from '../controllers/searchController';
import { AppStorageController } from '../controllers/appStorageController';
import { SWAGGER_SPEC, SWAGGER_HTML } from '../config/swagger';

// Import Zod Validation Schemas
import {
  loginSchema,
  tokenRefreshSchema,
  geminiChatSchema,
  ocrSchema,
  vehicleSchema,
  vehicleHistorySchema,
  validateSeatingSchema,
  updateSeatingSchema,
  attendanceSchema,
  createPaymentSchema,
  rollbackPaymentSchema,
  validateApplicationAddressSchema,
  createApplicationSchema,
  updateApplicationSchema,
  createContractSchema,
  signContractSchema,
  createLogSchema,
  uploadDocumentSchema,
  updateDocumentSchema,
  sendWhatsAppSchema,
  sheetsSyncSchema,
  restoreBackupSchema,
  idParamSchema,
  reportTypeParamSchema,
  userCreateSchema,
  userUpdateSchema,
  changePasswordSchema,
  schoolSchema,
  studentMutationSchema
} from '../validators/schemas';

// Create Version 1 Router
const v1Router = Router();

// ==========================================
// CSRF TOKEN ROUTE (Fetch token before state-mutating requests)
// ==========================================
v1Router.get('/auth/csrf', getCsrfToken);

// ==========================================
// SWAGGER / OPENAPI DOCUMENTATION ROUTES
// ==========================================
v1Router.get('/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(SWAGGER_HTML);
});
v1Router.get('/swagger.json', (req, res) => {
  res.json(SWAGGER_SPEC);
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
v1Router.post('/auth/login', validateRequest({ body: loginSchema }), asyncHandler(AuthController.login));
v1Router.get('/auth/verify', asyncHandler(AuthController.verify));
v1Router.post('/auth/refresh', validateRequest({ body: tokenRefreshSchema }), asyncHandler(AuthController.refresh));
v1Router.post('/auth/logout', csrfTokenProtection, asyncHandler(AuthController.logout));

// ==========================================
// GEMINI / AI ROUTES
// ==========================================
v1Router.post('/gemini/chat', csrfTokenProtection, requirePermission(['READ_REPORTS']), validateRequest({ body: geminiChatSchema }), asyncHandler(GeminiController.chat));
v1Router.post('/extract-doc-date', csrfTokenProtection, requirePermission(['READ_DOCUMENTS']), validateRequest({ body: ocrSchema }), asyncHandler(GeminiController.extractDocDate));

// ==========================================
// VEHICLE ROUTES (REST: GET, POST, PUT, DELETE)
// ==========================================
v1Router.get('/vehicles', requirePermission(['READ_VEHICLES']), asyncHandler(VehicleController.getVehicles));
v1Router.post('/vehicles', csrfTokenProtection, requirePermission(['WRITE_VEHICLES']), validateRequest({ body: vehicleSchema }), asyncHandler(VehicleController.createVehicle));
v1Router.put('/vehicles/:id', csrfTokenProtection, requirePermission(['WRITE_VEHICLES']), validateRequest({ params: idParamSchema, body: vehicleSchema.partial() }), asyncHandler(VehicleController.updateVehicle));
v1Router.delete('/vehicles/:id', csrfTokenProtection, requirePermission(['WRITE_VEHICLES']), validateRequest({ params: idParamSchema }), asyncHandler(VehicleController.deleteVehicle));
v1Router.post('/vehicles/:id/history', csrfTokenProtection, requirePermission(['WRITE_VEHICLES']), validateRequest({ params: idParamSchema, body: vehicleHistorySchema }), asyncHandler(VehicleController.addHistory));
v1Router.post('/vehicles/:id/seating/validate', csrfTokenProtection, requirePermission(['WRITE_VEHICLES']), validateRequest({ params: idParamSchema, body: validateSeatingSchema }), asyncHandler(VehicleController.validateSeating));
v1Router.post('/vehicles/:id/seating', csrfTokenProtection, requirePermission(['WRITE_VEHICLES']), validateRequest({ params: idParamSchema, body: updateSeatingSchema }), asyncHandler(VehicleController.updateSeating));

// ==========================================
// ATTENDANCE (PUANTAJ) ROUTES
// ==========================================
v1Router.get('/attendance', requirePermission(['READ_ATTENDANCE']), asyncHandler(AttendanceController.getAttendance));
v1Router.post('/attendance', csrfTokenProtection, requirePermission(['WRITE_ATTENDANCE']), validateRequest({ body: attendanceSchema }), asyncHandler(AttendanceController.saveAttendance));

// ==========================================
// PAYMENT ROUTES (REST: GET, POST)
// ==========================================
v1Router.get('/payments', requirePermission(['READ_PAYMENTS']), asyncHandler(PaymentController.getPayments));
v1Router.post('/payments', csrfTokenProtection, requirePermission(['WRITE_PAYMENTS']), validateRequest({ body: createPaymentSchema }), asyncHandler(PaymentController.createPayment));
v1Router.post('/payments/:id/rollback', csrfTokenProtection, requirePermission(['WRITE_PAYMENTS']), validateRequest({ params: idParamSchema, body: rollbackPaymentSchema }), asyncHandler(PaymentController.rollbackPayment));

// ==========================================
// REGISTRATION APPLICATION ROUTES (REST: GET, POST, PUT)
// ==========================================
v1Router.get('/applications', requirePermission(['READ_APPLICATIONS']), asyncHandler(ApplicationController.getApplications));
v1Router.post('/applications/validate-address', csrfTokenProtection, validateRequest({ body: validateApplicationAddressSchema }), asyncHandler(ApplicationController.validateAddress));
v1Router.post('/applications', csrfTokenProtection, validateRequest({ body: createApplicationSchema }), asyncHandler(ApplicationController.createApplication));
v1Router.put('/applications/:id', csrfTokenProtection, requirePermission(['WRITE_APPLICATIONS']), validateRequest({ params: idParamSchema, body: updateApplicationSchema }), asyncHandler(ApplicationController.updateApplication));

// ==========================================
// CONTRACT ROUTES (REST: GET, POST)
// ==========================================
v1Router.get('/contracts', requirePermission(['READ_CONTRACTS']), asyncHandler(ContractController.getContracts));
v1Router.post('/contracts', csrfTokenProtection, requirePermission(['WRITE_CONTRACTS']), validateRequest({ body: createContractSchema }), asyncHandler(ContractController.createContract));
v1Router.post('/contracts/:id/sign', csrfTokenProtection, requirePermission(['WRITE_CONTRACTS']), validateRequest({ params: idParamSchema, body: signContractSchema }), asyncHandler(ContractController.signContract));

// ==========================================
// SYSTEM LOGS ROUTES
// ==========================================
v1Router.get('/logs', requirePermission(['READ_LOGS']), asyncHandler(LogController.getLogs));
v1Router.post('/logs', csrfTokenProtection, requirePermission(['WRITE_LOGS']), validateRequest({ body: createLogSchema }), asyncHandler(LogController.createLog));

// ==========================================
// DOCUMENT ROUTES (REST: GET, POST, PUT, DELETE)
// ==========================================
v1Router.get('/documents', requirePermission(['READ_DOCUMENTS']), asyncHandler(DocumentController.getDocuments));
v1Router.get('/documents/:id/download', requirePermission(['READ_DOCUMENTS']), validateRequest({ params: idParamSchema }), asyncHandler(DocumentController.downloadDocument));
v1Router.get('/documents/download/:id', requirePermission(['READ_DOCUMENTS']), validateRequest({ params: idParamSchema }), asyncHandler(DocumentController.downloadDocument));
v1Router.get('/documents/:id', requirePermission(['READ_DOCUMENTS']), validateRequest({ params: idParamSchema }), asyncHandler(DocumentController.getDocumentById));
v1Router.post('/documents/upload', csrfTokenProtection, requirePermission(['WRITE_DOCUMENTS']), validateRequest({ body: uploadDocumentSchema }), asyncHandler(DocumentController.uploadDocument));
v1Router.put('/documents/:id', csrfTokenProtection, requirePermission(['WRITE_DOCUMENTS']), validateRequest({ params: idParamSchema, body: updateDocumentSchema }), asyncHandler(DocumentController.updateDocument));
v1Router.delete('/documents/:id', csrfTokenProtection, requirePermission(['WRITE_DOCUMENTS']), validateRequest({ params: idParamSchema }), asyncHandler(DocumentController.deleteDocument));

// ==========================================
// WHATSAPP GATEWAY ROUTES
// ==========================================
v1Router.get('/whatsapp/logs', requirePermission(['READ_WHATSAPP']), asyncHandler(WhatsAppController.getLogs));
v1Router.post('/whatsapp/send', csrfTokenProtection, requirePermission(['WRITE_WHATSAPP']), validateRequest({ body: sendWhatsAppSchema }), asyncHandler(WhatsAppController.send));
v1Router.post('/whatsapp/interpret', csrfTokenProtection, requirePermission(['READ_WHATSAPP']), asyncHandler(WhatsAppController.interpretMessage));
v1Router.get('/whatsapp/status', requirePermission(['READ_WHATSAPP']), asyncHandler(WhatsAppController.getStatus));
v1Router.post('/whatsapp/connect', csrfTokenProtection, requirePermission(['WRITE_WHATSAPP']), asyncHandler(WhatsAppController.connect));
v1Router.post('/whatsapp/disconnect', csrfTokenProtection, requirePermission(['WRITE_WHATSAPP']), asyncHandler(WhatsAppController.disconnect));
v1Router.post('/whatsapp/send-media', csrfTokenProtection, requirePermission(['WRITE_WHATSAPP']), asyncHandler(WhatsAppController.sendMedia));

// ==========================================
// ANALYTICAL REPORTS ROUTE
// ==========================================
v1Router.get('/reports/:type', requirePermission(['READ_REPORTS']), validateRequest({ params: reportTypeParamSchema }), asyncHandler(ReportController.getReport));

// ==========================================
// GOOGLE SHEETS WEBHOOK ROUTE (Exempted from CSRF)
// ==========================================
v1Router.post('/sheets-webhook', validateRequest({ body: sheetsSyncSchema }), asyncHandler(SheetsController.sync));

// ==========================================
// GENERAL TEXT SEARCH ROUTE
// ==========================================
v1Router.get('/search', requireRole(['admin', 'manager', 'coordinator']), asyncHandler(SearchController.search));

// ==========================================
// CLIENT CACHE PERSISTENCE ROUTES
// ==========================================
v1Router.get('/app-storage', requireRole(['admin', 'manager', 'coordinator', 'accounting', 'parent', 'driver', 'hostess', 'operation']), asyncHandler(AppStorageController.list));
v1Router.post('/app-storage/bulk', csrfTokenProtection, requireRole(['admin', 'manager', 'coordinator', 'accounting', 'parent', 'driver', 'hostess', 'operation']), asyncHandler(AppStorageController.bulkUpsert));
v1Router.delete('/app-storage/bulk', csrfTokenProtection, requireRole(['admin', 'manager', 'coordinator', 'accounting', 'parent', 'driver', 'hostess', 'operation']), asyncHandler(AppStorageController.bulkDelete));

// ==========================================
// ADMINISTRATIVE & CONTROL BOARD ROUTES
// ==========================================
v1Router.get('/admin/database-tables', requirePermission(['MANAGE_SYSTEM']), asyncHandler(AdminController.getDatabaseTables));
v1Router.get('/admin/system-stats', requirePermission(['MANAGE_SYSTEM']), asyncHandler(AdminController.getSystemStats));
v1Router.post('/admin/backup', csrfTokenProtection, requirePermission(['MANAGE_SYSTEM']), asyncHandler(AdminController.createBackup));
v1Router.get('/admin/backups', requirePermission(['MANAGE_SYSTEM']), asyncHandler(AdminController.getBackups));
v1Router.post('/admin/backup/restore', csrfTokenProtection, requirePermission(['MANAGE_SYSTEM']), validateRequest({ body: restoreBackupSchema }), asyncHandler(AdminController.restoreBackup));
v1Router.get('/admin/run-tests', requirePermission(['MANAGE_SYSTEM']), asyncHandler(AdminController.runTests));
v1Router.post('/admin/run-load-test', requirePermission(['MANAGE_SYSTEM']), asyncHandler(AdminController.runConcurrencyLoadTest));

// ==========================================
// PERSONNEL & ASSIGNMENT MANAGEMENT ROUTES
// ==========================================
v1Router.get('/users', requirePermission(['READ_USERS']), asyncHandler(AdminController.getUsers));
v1Router.post('/users', csrfTokenProtection, requirePermission(['MANAGE_USERS']), validateRequest({ body: userCreateSchema }), asyncHandler(AdminController.createUser));
v1Router.put('/users/:id', csrfTokenProtection, requirePermission(['MANAGE_USERS']), validateRequest({ params: idParamSchema, body: userUpdateSchema }), asyncHandler(AdminController.updateUser));
v1Router.delete('/users/:id', csrfTokenProtection, requirePermission(['MANAGE_USERS']), validateRequest({ params: idParamSchema }), asyncHandler(AdminController.deleteUser));
v1Router.post('/users/:id/change-password', csrfTokenProtection, requireRole(['admin', 'manager', 'coordinator', 'driver', 'hostess', 'accounting', 'parent', 'operation']), validateRequest({ params: idParamSchema, body: changePasswordSchema }), asyncHandler(AdminController.changePassword));
v1Router.get('/assignments/audit-logs', requirePermission(['MANAGE_SYSTEM']), asyncHandler(AdminController.getAssignmentAuditLogs));

// ==========================================
// SCHOOL ROUTES (REST: GET, POST, PUT, DELETE)
// ==========================================
v1Router.get('/schools', requirePermission(['READ_SCHOOLS']), asyncHandler(AdminController.getSchools));
v1Router.post('/schools', csrfTokenProtection, requirePermission(['CREATE_SCHOOLS']), validateRequest({ body: schoolSchema }), asyncHandler(AdminController.createSchool));
v1Router.put('/schools/:id', csrfTokenProtection, requirePermission(['UPDATE_SCHOOLS']), validateRequest({ params: idParamSchema, body: schoolSchema.partial() }), asyncHandler(AdminController.updateSchool));
v1Router.delete('/schools/:id', csrfTokenProtection, requirePermission(['DELETE_SCHOOLS']), validateRequest({ params: idParamSchema }), asyncHandler(AdminController.deleteSchool));

// ==========================================
// STUDENT ROUTES (REST: GET, POST, PUT, DELETE)
// ==========================================
v1Router.get('/students', requirePermission(['READ_STUDENTS']), asyncHandler(AdminController.getStudents));
v1Router.post('/students', csrfTokenProtection, requirePermission(['WRITE_STUDENTS']), validateRequest({ body: studentMutationSchema }), asyncHandler(AdminController.createStudent));
v1Router.put('/students/:id', csrfTokenProtection, requirePermission(['WRITE_STUDENTS']), validateRequest({ params: idParamSchema, body: studentMutationSchema.partial() }), asyncHandler(AdminController.updateStudent));
v1Router.delete('/students/:id', csrfTokenProtection, requirePermission(['WRITE_STUDENTS']), validateRequest({ params: idParamSchema }), asyncHandler(AdminController.deleteStudent));


// ==========================================
// CENTRAL EXPORT ROUTER
// ==========================================
export const apiRouter = Router();

// Mount Version 1
apiRouter.use('/v1', v1Router);

// Fallback legacy support (allows existing frontend clients to query /api/X directly)
apiRouter.use('/', v1Router);
