import pino from 'pino'

export const LOGGER_REDACT_PATHS = [
  'apiKey',
  'api_key',
  'authorization',
  'Authorization',
  'headers.authorization',
  'headers.Authorization',
  'headers["x-api-key"]',
  'req.headers.authorization',
  'req.headers["x-api-key"]',
  'request.headers.authorization',
  'request.headers["x-api-key"]',
  '*.apiKey',
  '*.api_key',
  '*.authorization',
  '*.headers.authorization',
  '*.headers["x-api-key"]'
]

export const logger = pino({
  level: 'info',
  redact: {
    paths: LOGGER_REDACT_PATHS,
    censor: '[REDACTED]'
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  },
  formatters: {
    level: (label) => {
      return { level: label }
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    error: pino.stdSerializers.err
  }
})
