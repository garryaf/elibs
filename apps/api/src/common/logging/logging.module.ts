import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { Request } from 'express';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Generate request ID from header or create a new one
        genReqId: (req: Request) => {
          return (req.headers['x-request-id'] as string) || randomUUID();
        },
        // Custom log level mapping
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        // Serializers to shape the log output
        serializers: {
          req(req) {
            return {
              method: req.method,
              url: req.url,
              traceId: req.id,
            };
          },
          res(res) {
            return {
              statusCode: res.statusCode,
            };
          },
          err(err) {
            return {
              type: err.type,
              message: err.message,
              stack: err.stack,
            };
          },
        },
        // Custom attributes added to every log line
        customProps: (req: Request) => ({
          traceId: req.id || req.headers['x-request-id'] || 'unknown',
        }),
        // Redact sensitive headers
        redact: ['req.headers.authorization'],
        // Transport configuration based on environment
        ...(process.env.NODE_ENV !== 'production'
          ? {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: false,
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              },
            }
          : {}),
        // Base options for production JSON format
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
      },
    }),
  ],
})
export class LoggingModule {}
