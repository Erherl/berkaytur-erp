/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SWAGGER_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'BKT Okul Servisi & Yönetim Sistemi REST API',
    description: 'BKT Okul Taşıma ve Servis Yönetim Otomasyonu güvenli REST API dökümantasyonu.',
    version: '1.0.0',
    contact: {
      name: 'BKT Sistem Yönetimi',
      email: 'admin@bkt.com'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Geliştirme / Canlı Ortam API Sunucusu'
    }
  ],
  paths: {
    '/auth/csrf': {
      get: {
        summary: 'CSRF Token Al',
        description: 'Güvenlik doğrulaması için her kullanıcı oturumunda ve form göndermede kullanılan CSRF çerez tokenını oluşturur.',
        responses: {
          '200': {
            description: 'Başarılı CSRF üretimi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'CSRF token başarıyla üretildi.' },
                    data: {
                      type: 'object',
                      properties: {
                        csrfToken: { type: 'string', example: 'csrf_abcdef123456789' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Kullanıcı Girişi',
        description: 'Kullanıcı adı ve parola ile oturum açar, JWT Access ve Refresh tokenları üretir.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'admin123' },
                  role: { type: 'string', example: 'admin' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Başarılı Giriş',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    accessToken: { type: 'string', example: 'jwt_access_token_here' },
                    refreshToken: { type: 'string', example: 'jwt_refresh_token_here' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        username: { type: 'string' },
                        role: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/vehicles': {
      get: {
        summary: 'Tüm Araçları Listele',
        description: 'Sistemde kayıtlı olan aktif ve silinmemiş servis araçlarını listeler.',
        responses: {
          '200': {
            description: 'Başarılı liste'
          }
        }
      },
      post: {
        summary: 'Yeni Servis Aracı Ekle',
        description: 'Sisteme yeni bir plaka, marka ve kapasiteyle araç kaydeder.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['plate', 'brand', 'model', 'capacity'],
                properties: {
                  plate: { type: 'string', example: '34BKT2026' },
                  brand: { type: 'string', example: 'Mercedes' },
                  model: { type: 'string', example: 'Sprinter' },
                  capacity: { type: 'integer', example: 19 }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Araç oluşturuldu'
          }
        }
      }
    },
    '/attendance': {
      get: {
        summary: 'Puantaj Listesi',
        description: 'Seçilen tarih ve servis için puantaj / katılım durumlarını getirir.',
        responses: {
          '200': {
            description: 'Başarılı puantaj verisi'
          }
        }
      },
      post: {
        summary: 'Puantaj Durumunu Kaydet',
        description: 'Öğrencinin sabah/akşam servise binme durumunu kaydeder.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['studentId', 'date', 'shift', 'status'],
                properties: {
                  studentId: { type: 'string', example: 'student_uuid' },
                  date: { type: 'string', example: '2026-07-17' },
                  shift: { type: 'string', example: 'morning' },
                  status: { type: 'string', example: 'on_board' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Durum güncellendi'
          }
        }
      }
    }
  }
};

export const SWAGGER_HTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BKT API OpenAPI Dökümantasyonu</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #fafafa;
    }
    #swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #1e293b;
      color: white;
      padding: 20px;
      text-align: center;
      font-family: sans-serif;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>BKT API OpenAPI Dökümantasyonu (REST v1)</h1>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(SWAGGER_SPEC)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
`;
