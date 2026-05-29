import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from './logger';
import type { OpenFaaSDeployRequest, OpenFaaSFunctionInfo } from '@faas/shared-types';

/**
 * Client for the FaaS Function Runner (our custom OpenFaaS-compatible engine).
 * API surface mirrors the OpenFaaS gateway so the rest of the codebase
 * doesn't need to change if you swap in real OpenFaaS later.
 */
class OpenFaaSClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.openfaasGateway,
      // Basic auth — function runner accepts but doesn't enforce it
      auth: {
        username: config.openfaasUsername,
        password: config.openfaasPassword,
      },
      timeout: 120_000, // 2 min — image builds can take time
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        logger.error(
          {
            status: err.response?.status,
            data:   err.response?.data,
            url:    err.config?.url,
          },
          'Function Runner request failed'
        );
        return Promise.reject(err);
      }
    );
  }

  /** Deploy or update a function */
  async deployFunction(req: OpenFaaSDeployRequest): Promise<void> {
    try {
      // Try PUT (update) first, fall back to POST (create)
      await this.client.put('/system/functions', req);
      logger.info({ service: req.service }, 'Function updated in runner');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number } };
      if (axiosErr.response?.status === 404) {
        await this.client.post('/system/functions', req);
        logger.info({ service: req.service }, 'Function deployed to runner');
      } else {
        throw err;
      }
    }
  }

  /** Delete a function */
  async deleteFunction(name: string, _namespace?: string): Promise<void> {
    await this.client.delete('/system/functions', {
      data: { functionName: name },
    });
    logger.info({ name }, 'Function deleted from runner');
  }

  /** List all functions */
  async listFunctions(_namespace?: string): Promise<OpenFaaSFunctionInfo[]> {
    const res = await this.client.get<OpenFaaSFunctionInfo[]>('/system/functions');
    return res.data;
  }

  /** Get a single function */
  async getFunction(name: string, _namespace?: string): Promise<OpenFaaSFunctionInfo | null> {
    try {
      const res = await this.client.get<OpenFaaSFunctionInfo>(`/system/function/${name}`);
      return res.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number } };
      if (axiosErr.response?.status === 404) return null;
      throw err;
    }
  }

  /** Scale a function */
  async scaleFunction(name: string, replicas: number, _namespace?: string): Promise<void> {
    await this.client.post(`/system/scale-function/${name}`, { replicas });
    logger.info({ name, replicas }, 'Function scaled');
  }

  /** Get function logs */
  async getFunctionLogs(name: string, tail?: number): Promise<string> {
    const params = new URLSearchParams({ name });
    if (tail) params.set('tail', String(tail));
    const res = await this.client.get<string>(`/system/logs?${params.toString()}`);
    return res.data;
  }

  /** Invoke a function */
  async invokeFunction(
    name: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
    const res = await this.client.post(`/function/${name}`, body, {
      headers: headers || {},
      timeout: config.openfaasGateway ? 60_000 : 30_000,
    });
    return {
      status: res.status,
      data:   res.data,
      headers: res.headers as Record<string, string>,
    };
  }

  /** Health check */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/healthz');
      return true;
    } catch {
      return false;
    }
  }
}

export const openfaas = new OpenFaaSClient();
