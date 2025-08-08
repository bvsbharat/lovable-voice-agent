import type { AgentConfig } from '@/types/agent';

// Use empty string in development to use Vite proxy, or explicit base URL in production
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const url = `${base}${path}`;
  
  console.log('[API] Making request to:', url);
  console.log('[API] API_BASE:', API_BASE);
  console.log('[API] Environment mode:', import.meta.env.MODE);
  
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error('[API] Request failed:', res.status, text);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  
  const data = await res.json();
  console.log('[API] Response received:', data);
  return data;
}

export const AgentsAPI = {
  list(): Promise<AgentConfig[]> {
    return http('/api/agents');
  },
  get(id: string): Promise<AgentConfig> {
    return http(`/api/agents/${id}`);
  },
  create(payload: AgentConfig): Promise<AgentConfig> {
    return http('/api/agents', { method: 'POST', body: JSON.stringify(payload) });
  },
  update(id: string, payload: Partial<AgentConfig>): Promise<AgentConfig> {
    return http(`/api/agents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  delete(id: string): Promise<void> {
    return http(`/api/agents/${id}`, { method: 'DELETE' });
  },
  publish(id: string): Promise<AgentConfig> {
    return http(`/api/agents/${id}/publish`, { method: 'POST' });
  },
  previewCall(id: string): Promise<{ 
    ok: boolean; 
    localId: string;
    agentId?: string; 
    hasVapiAgent: boolean;
  }> {
    return http(`/api/agents/${id}/preview-call`, { method: 'POST' });
  },
};

export const CallsAPI = {
  list(params?: Record<string, string | number | boolean>) {
    const qs = params
      ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
      : '';
    return http(`/api/calls${qs}`);
  },
};


