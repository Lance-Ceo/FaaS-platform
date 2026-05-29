// ============================================================
// Shared Types for FaaS Platform
// ============================================================

// --- Auth Types ---
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'developer';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

// --- Function Types ---
export type Runtime = 'NODE18' | 'PYTHON3' | 'GO119';

export type FunctionStatus =
  | 'PENDING'
  | 'BUILDING'
  | 'DEPLOYING'
  | 'READY'
  | 'ERROR'
  | 'STOPPED';

export type TriggerType = 'HTTP' | 'CRON' | 'QUEUE' | 'WEBHOOK';

export interface FaasFunction {
  id: string;
  name: string;
  description?: string;
  runtime: Runtime;
  status: FunctionStatus;
  endpoint?: string;
  memory: number;       // MB
  timeout: number;      // seconds
  replicas: number;
  minReplicas: number;
  maxReplicas: number;
  envVars: Record<string, string>;
  labels: Record<string, string>;
  triggers: TriggerType[];
  userId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  invocationCount: number;
  errorCount: number;
}

export interface CreateFunctionRequest {
  name: string;
  description?: string;
  runtime: Runtime;
  sourceCode?: string;
  memory?: number;
  timeout?: number;
  replicas?: number;
  minReplicas?: number;
  maxReplicas?: number;
  envVars?: Record<string, string>;
  labels?: Record<string, string>;
  triggers?: TriggerType[];
}

export interface UpdateFunctionRequest extends Partial<CreateFunctionRequest> {
  id: string;
}

export interface DeployFunctionRequest {
  functionId: string;
  version?: number;
}

// --- Deployment Types ---
export type DeploymentStatus =
  | 'QUEUED'
  | 'BUILDING'
  | 'PUSHING'
  | 'DEPLOYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'ROLLED_BACK';

export interface Deployment {
  id: string;
  functionId: string;
  functionName: string;
  version: number;
  status: DeploymentStatus;
  logs: string[];
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
  imageTag?: string;
  error?: string;
}

// --- Log Types ---
export interface FunctionLog {
  id: string;
  functionId: string;
  functionName: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
}

// --- Metrics Types ---
export interface FunctionMetrics {
  functionId: string;
  functionName: string;
  invocations: number;
  errors: number;
  avgDuration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: string;
}

export interface PlatformMetrics {
  totalFunctions: number;
  activeFunctions: number;
  totalInvocations: number;
  totalErrors: number;
  avgSuccessRate: number;
  totalUsers: number;
  activeDeployments: number;
}

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// --- WebSocket Types ---
export type WsEventType =
  | 'log'
  | 'deployment_status'
  | 'function_status'
  | 'metrics'
  | 'ping'
  | 'pong';

export interface WsMessage<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: string;
}

// --- OpenFaaS Types ---
export interface OpenFaaSFunction {
  name: string;
  image: string;
  namespace?: string;
  envProcess?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  limits?: {
    memory?: string;
    cpu?: string;
  };
  requests?: {
    memory?: string;
    cpu?: string;
  };
  constraints?: string[];
  envVars?: Record<string, string>;
  secrets?: string[];
  readOnlyRootFilesystem?: boolean;
}

export interface OpenFaaSDeployRequest {
  service: string;
  image: string;
  namespace?: string;
  envProcess?: string;
  envVars?: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  limits?: { memory?: string; cpu?: string };
  requests?: { memory?: string; cpu?: string };
  constraints?: string[];
  secrets?: string[];
  readOnlyRootFilesystem?: boolean;
}

export interface OpenFaaSFunctionInfo {
  name: string;
  image: string;
  invocationCount: number;
  replicas: number;
  availableReplicas: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  envProcess?: string;
  envVars?: Record<string, string>;
  namespace?: string;
  createdAt?: string;
}
