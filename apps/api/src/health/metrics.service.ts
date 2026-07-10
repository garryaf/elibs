import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry: Registry;
  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;
  readonly activeConnections: Gauge;

  constructor() {
    this.registry = new Registry();

    // Default Node.js metrics (memory, CPU, event loop)
    collectDefaultMetrics({ register: this.registry });

    // Custom application metrics
    this.httpRequestsTotal = new Counter({
      name: 'elis_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'elis_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'elis_active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Metrics are ready
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
