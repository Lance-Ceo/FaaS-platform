import {
  Counter, Histogram, Gauge, register,
} from 'prom-client';

// ─── HTTP Metrics ─────────────────────────────────────────────
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// ─── Function Metrics ─────────────────────────────────────────
export const functionInvocationsTotal = new Counter({
  name: 'faas_function_invocations_total',
  help: 'Total function invocations',
  labelNames: ['function_name', 'runtime', 'status'],
});

export const functionDuration = new Histogram({
  name: 'faas_function_duration_seconds',
  help: 'Function execution duration',
  labelNames: ['function_name', 'runtime'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30, 60],
});

export const activeFunctions = new Gauge({
  name: 'faas_active_functions',
  help: 'Number of active (READY) functions',
});

export const deploymentQueueSize = new Gauge({
  name: 'faas_deployment_queue_size',
  help: 'Number of deployments in queue',
});

export const wsConnectedClients = new Gauge({
  name: 'faas_ws_connected_clients',
  help: 'Number of connected WebSocket clients',
});

// ─── Deployment Metrics ───────────────────────────────────────
export const deploymentsTotal = new Counter({
  name: 'faas_deployments_total',
  help: 'Total deployments',
  labelNames: ['status', 'runtime'],
});

export const deploymentDuration = new Histogram({
  name: 'faas_deployment_duration_seconds',
  help: 'Deployment duration in seconds',
  labelNames: ['runtime', 'status'],
  buckets: [5, 10, 30, 60, 120, 300],
});

export { register };
