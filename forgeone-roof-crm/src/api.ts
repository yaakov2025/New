import type { PropertyRecord, Takeoff } from '../shared/types.ts';
import type { VerificationCheck } from '../shared/measure.ts';

export interface ClientConfig {
  browserKey: string | null;
  mapId: string;
  serverKeyConfigured: boolean;
  sharedKeyWarning: boolean;
  expectedProjectNumber: string;
}

export interface Usage {
  date: string;
  solar: number;
  geocode: number;
  addressValidation: number;
  limits: { solar: number; geocode: number; addressValidation: number };
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: any) {
    super(message);
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error || `HTTP ${res.status}`, res.status, json);
  return json as T;
}

export const api = {
  config: () => req<ClientConfig>('GET', '/api/config'),
  usage: () => req<Usage>('GET', '/api/usage'),
  list: () => req<{ properties: PropertyRecord[] }>('GET', '/api/properties'),
  measure: (q: { address?: string; placeId?: string; forceRefresh?: boolean }) =>
    req<{ property: PropertyRecord; reused?: boolean }>('POST', '/api/property/measure', q),
  saveTakeoff: (id: string, t: Takeoff) => req<{ property: PropertyRecord }>('PUT', `/api/properties/${id}/takeoff`, t),
  verify: (id: string) => req<{ property: PropertyRecord; checks: VerificationCheck[] }>('POST', `/api/properties/${id}/verify`),
  remove: (id: string) => req<{ deleted: boolean }>('DELETE', `/api/properties/${id}`),
};
