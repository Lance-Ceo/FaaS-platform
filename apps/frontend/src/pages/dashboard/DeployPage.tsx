import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Rocket, Code2, Plus, Trash2, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

const RUNTIME_TEMPLATES: Record<string, string> = {
  NODE18: `// Node.js 18 Function Handler
module.exports = async (event, context) => {
  const body = event.body ? JSON.parse(event.body) : {};
  const name = body.name || 'World';
  
  return context.status(200).succeed({
    message: \`Hello, \${name}!\`,
    timestamp: new Date().toISOString(),
  });
};`,
  PYTHON3: `# Python 3 Function Handler
import json

def handle(event, context):
    body = json.loads(event.body) if event.body else {}
    name = body.get('name', 'World')
    
    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": f"Hello, {name}!",
            "timestamp": __import__('datetime').datetime.utcnow().isoformat()
        })
    }`,
  GO119: `// Go Function Handler
package function

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

func Handle(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    response := map[string]interface{}{
        "message":   "Hello, World!",
        "timestamp": time.Now().UTC().Format(time.RFC3339),
    }
    
    json.NewEncoder(w).Encode(response)
    fmt.Println("Function invoked successfully")
}`,
};

const RUNTIME_LANG: Record<string, string> = {
  NODE18: 'javascript',
  PYTHON3: 'python',
  GO119: 'go',
};

const schema = z.object({
  name: z
    .string()
    .min(2, 'At least 2 characters')
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500).optional(),
  runtime: z.enum(['NODE18', 'PYTHON3', 'GO119']),
  memory: z.number().int().min(64).max(2048),
  timeout: z.number().int().min(1).max(300),
  replicas: z.number().int().min(1).max(20),
  minReplicas: z.number().int().min(0).max(20),
  maxReplicas: z.number().int().min(1).max(50),
});

type FormData = z.infer<typeof schema>;

export default function DeployPage() {
  const [sourceCode, setSourceCode] = useState(RUNTIME_TEMPLATES.NODE18);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [deployAfterCreate, setDeployAfterCreate] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      runtime: 'NODE18',
      memory: 128,
      timeout: 30,
      replicas: 1,
      minReplicas: 1,
      maxReplicas: 5,
    },
  });

  const runtime = watch('runtime');

  const handleRuntimeChange = (rt: string) => {
    setValue('runtime', rt as 'NODE18' | 'PYTHON3' | 'GO119');
    setSourceCode(RUNTIME_TEMPLATES[rt]);
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const envVarsObj = Object.fromEntries(envVars.map((e) => [e.key, e.value]));
      const fn = await api.post('/functions', {
        ...data,
        sourceCode,
        envVars: envVarsObj,
      });

      if (deployAfterCreate) {
        await api.post(`/functions/${fn.data.data.id}/deploy`);
      }

      return fn.data.data;
    },
    onSuccess: (fn) => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      toast.success(`Function "${fn.name}" created${deployAfterCreate ? ' and deployment queued' : ''}`);
      navigate(`/dashboard/functions/${fn.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create function';
      toast.error(msg);
    },
  });

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnvVar = (i: number) => setEnvVars(envVars.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars];
    updated[i][field] = val;
    setEnvVars(updated);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Deploy New Function</h2>
        <p className="text-sm text-slate-400 mt-0.5">Configure and deploy a serverless function</p>
      </div>

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-5">
            {/* Basic info */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                Function Details
              </h3>

              <div>
                <label className="label">Function Name *</label>
                <input {...register('name')} className="input" placeholder="my-function" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                <p className="text-xs text-slate-500 mt-1">Lowercase letters, numbers, and hyphens</p>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  {...register('description')}
                  className="input resize-none"
                  rows={2}
                  placeholder="What does this function do?"
                />
              </div>

              {/* Runtime selector */}
              <div>
                <label className="label">Runtime *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'NODE18', label: 'Node.js 18', color: 'text-green-400' },
                    { value: 'PYTHON3', label: 'Python 3', color: 'text-blue-400' },
                    { value: 'GO119', label: 'Go 1.19', color: 'text-cyan-400' },
                  ].map((rt) => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => handleRuntimeChange(rt.value)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        runtime === rt.value
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-white">Resources & Scaling</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Memory (MB)</label>
                  <input {...register('memory', { valueAsNumber: true })} type="number" className="input" />
                  {errors.memory && <p className="text-red-400 text-xs mt-1">{errors.memory.message}</p>}
                </div>
                <div>
                  <label className="label">Timeout (s)</label>
                  <input {...register('timeout', { valueAsNumber: true })} type="number" className="input" />
                </div>
                <div>
                  <label className="label">Replicas</label>
                  <input {...register('replicas', { valueAsNumber: true })} type="number" className="input" />
                </div>
                <div>
                  <label className="label">Max Replicas</label>
                  <input {...register('maxReplicas', { valueAsNumber: true })} type="number" className="input" />
                </div>
              </div>
            </div>

            {/* Environment variables */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Environment Variables</h3>
                <button type="button" onClick={addEnvVar} className="btn-secondary text-xs py-1.5">
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {envVars.length === 0 ? (
                <p className="text-sm text-slate-500">No environment variables configured</p>
              ) : (
                <div className="space-y-2">
                  {envVars.map((env, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={env.key}
                        onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                        className="input flex-1"
                        placeholder="KEY"
                      />
                      <input
                        value={env.value}
                        onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                        className="input flex-1"
                        placeholder="value"
                      />
                      <button type="button" onClick={() => removeEnvVar(i)} className="btn-ghost p-2 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — code editor */}
          <div className="glass-card p-5 flex flex-col">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-400" />
              Source Code
            </h3>
            <div className="flex-1 rounded-lg overflow-hidden border border-slate-700 min-h-[400px]">
              <Editor
                height="100%"
                language={RUNTIME_LANG[runtime]}
                value={sourceCode}
                onChange={(v) => setSourceCode(v || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>
        </div>

        {/* Deploy options */}
        <div className="glass-card p-5 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deployAfterCreate}
              onChange={(e) => setDeployAfterCreate(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-200">Deploy immediately after creation</div>
              <div className="text-xs text-slate-500">Function will be queued for deployment</div>
            </div>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/functions')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              {createMutation.isPending ? 'Creating...' : 'Create Function'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
