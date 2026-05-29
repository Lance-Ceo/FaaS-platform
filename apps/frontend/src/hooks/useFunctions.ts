import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { FaasFunction, CreateFunctionRequest } from '@faas/shared-types';

export const FUNCTIONS_KEY = ['functions'] as const;

export function useFunctions(params?: { search?: string; status?: string; runtime?: string }) {
  return useQuery({
    queryKey: [...FUNCTIONS_KEY, params],
    queryFn: () =>
      api.get('/functions', { params }).then((r) => r.data as { data: FaasFunction[]; pagination: unknown }),
  });
}

export function useFunction(id: string | undefined) {
  return useQuery({
    queryKey: ['function', id],
    queryFn: () => api.get(`/functions/${id}`).then((r) => r.data.data as FaasFunction),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCreateFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFunctionRequest) =>
      api.post('/functions', data).then((r) => r.data.data as FaasFunction),
    onSuccess: (fn) => {
      qc.invalidateQueries({ queryKey: FUNCTIONS_KEY });
      toast.success(`Function "${fn.name}" created`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create function';
      toast.error(msg);
    },
  });
}

export function useDeployFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/functions/${id}/deploy`).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['function', id] });
      qc.invalidateQueries({ queryKey: FUNCTIONS_KEY });
      toast.success('Deployment queued');
    },
    onError: () => toast.error('Failed to queue deployment'),
  });
}

export function useDeleteFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/functions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FUNCTIONS_KEY });
      toast.success('Function deleted');
    },
    onError: () => toast.error('Failed to delete function'),
  });
}

export function useScaleFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, replicas }: { id: string; replicas: number }) =>
      api.post(`/functions/${id}/scale`, { replicas }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['function', id] });
      toast.success('Function scaled');
    },
    onError: () => toast.error('Failed to scale function'),
  });
}
