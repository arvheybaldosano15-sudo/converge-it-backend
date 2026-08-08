const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) =>
    stack ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
           : `[${timestamp}] ${level.toUpperCase()}: ${message}`)
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat)
    }),
    new DailyRotateFile({
      dirname: logDir, filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD', maxSize: '20m', maxFiles: '14d', level: 'info'
    }),
    new DailyRotateFile({
      dirname: logDir, filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD', maxSize: '20m', maxFiles: '30d', level: 'error'
    })
  ]
});

module.exports = logger;
