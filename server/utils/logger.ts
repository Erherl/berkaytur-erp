/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Helper to filter log entries by type
const typeFilter = (type: string) => {
  return winston.format((info) => {
    return info.type === type ? info : false;
  })();
};

// Custom format for clean json output in files
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.json()
);

// Custom format for colored output in console
const consoleFormat = winston.format.combine(
  winston.format((info) => {
    // Exclude access logs from the console to avoid spam and false positive keyword triggers
    if (info.type === 'access') {
      return false;
    }
    return info;
  })(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, type, ...meta }) => {
    const typeStr = type ? `[${String(type).toUpperCase()}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${typeStr}${message}${metaStr}`;
  })
);

// Define Transports
const transports: winston.transport[] = [
  // Always log to console
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }),

  // Error Log (all errors go here)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    level: 'error',
    format: fileFormat,
  }),

  // Access Log (HTTP request/response logs)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: winston.format.combine(typeFilter('access'), fileFormat)
  }),

  // Audit Log (admin/moderator critical state alterations)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: winston.format.combine(typeFilter('audit'), fileFormat)
  }),

  // Security Log (Auth, CSRF, rate limit anomalies)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: winston.format.combine(typeFilter('security'), fileFormat)
  }),

  // Performance Log (Latency, memory, concurrent connection alerts)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: winston.format.combine(typeFilter('performance'), fileFormat)
  }),

  // System Log (Server states, DB events, application start)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'system-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: winston.format.combine(typeFilter('system'), fileFormat)
  }),

  // Combined Log (Everything)
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: fileFormat
  })
];

const winstonInstance = winston.createLogger({
  level: 'debug',
  transports,
  exitOnError: false
});

// Capture unhandled exceptions and promise rejections as Exception Logs
winstonInstance.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: fileFormat
  })
);

winstonInstance.rejections.handle(
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: fileFormat
  })
);

// Wrapper for easy access across the app
export const logger = {
  info: (message: string, meta?: any) => {
    winstonInstance.info(message, { type: 'system', ...meta });
  },
  warn: (message: string, meta?: any) => {
    winstonInstance.warn(message, { type: 'system', ...meta });
  },
  error: (message: string, error?: any, meta?: any) => {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;
    winstonInstance.error(message, { error: errorDetails, ...meta });
  },
  debug: (message: string, meta?: any) => {
    winstonInstance.debug(message, { type: 'system', ...meta });
  },
  // Specific logs requested
  access: (message: string, meta?: any) => {
    winstonInstance.info(message, { type: 'access', ...meta });
  },
  audit: (message: string, meta?: any) => {
    winstonInstance.info(message, { type: 'audit', ...meta });
  },
  security: (message: string, meta?: any) => {
    winstonInstance.info(message, { type: 'security', ...meta });
  },
  performance: (message: string, meta?: any) => {
    winstonInstance.info(message, { type: 'performance', ...meta });
  },
  system: (message: string, meta?: any) => {
    winstonInstance.info(message, { type: 'system', ...meta });
  }
};

export default logger;
