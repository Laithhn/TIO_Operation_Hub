import { canViewTab, hasRight } from './rights';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router';
import { ApiError, get } from './api';
import { label } from './format';

export type Me = {
  id: number; account: string; displayName: string; timeZone: string; roles: string[]; roleLabels: string[]; rights: string[];
  /** Rights allowed only for some clients, projects or teams. They open the page; the record's own flags decide its actions. */
  scopedAllowRights?: string[];
  scope: { allClients: boolean; clientCount: number; projectCount: number; allInternal: boolean; internalTeamCount: number; hasBusinessAccess: boolean };
  app: { version: string; environmentName: string; supportContact: string; devSignIn: boolean; authMode: string; mustChangePassword: boolean; map: { tileUrl: string; attribution: string } | null };
};

export type Lookup = { listName: string; code: string; label: string; description?: string; isRetired: boolean; category?: string };
export type Reference = {
  lookups: Record<string, Lookup[]>;
  products: { id: number; code: string; name: string; isActive: boolean; modules: { id: number; code: string; name: string; isActive: boolean }[]; versions: { id: number; version: string; isActive: boolean }[] }[];
  teams: { id: number; code: string; name: string; isActive: boolean }[];
  jiraInstances: { id: number; name: string; kind: string; approvedHost: string; isActive: boolean }[];
  enums: Record<string, string[]>;
  enumLabels: Record<string, Record<string, string>>;
  countries: string[];
};

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => get<Me>('/me'), staleTime: 10_000, refetchInterval: 15_000, refetchOnWindowFocus: true, retry: false });
}

export function useReference(enabled = true) {
  return useQuery({ queryKey: ['reference'], queryFn: () => get<Reference>('/reference'), staleTime: 60_000, enabled });
}

/** UI hint only; the API enforces the same right on every request. */
export function useRight(resource: string, action: string): boolean {
  return hasRight(useMe().data, resource, action);
}

export function useEnum(name: string): string[] {
  return useReference().data?.enums[name] ?? [];
}

export function useEnumLabel(name: 'Condition' | 'CaseStatus') {
  const labels = useReference().data?.enumLabels?.[name] ?? {};
  return (code: string) => labels[code] ?? label(code);
}

export function useLookup(list: string, keep?: string | null) {
  const ref = useReference().data;
  return (ref?.lookups[list] ?? []).filter(l => !l.isRetired || l.code === keep);
}

/**
 * A34: configured types (environment, server, contract and case types). name() shows the configured label, category() the built-in
 * behaviour (for example LogicalEndpoint), options() the active values plus the record's current one; filterOptions() includes historical values.
 */
export function useTypes() {
  const ref = useReference().data;
  const all = (list: string) => ref?.lookups[list] ?? [];
  return {
    all,
    name: (list: string, code?: string | null) => (code ? all(list).find(l => l.code === code)?.label ?? label(code) : ''),
    category: (list: string, code?: string | null) => (code ? all(list).find(l => l.code === code)?.category ?? code : undefined),
    options: (list: string, keep?: string | null) => all(list).filter(l => !l.isRetired || l.code === keep).map(l => ({ value: l.code, label: l.label })),
    // Filters must still find historical records after their configured type has been retired.
    filterOptions: (list: string) => all(list).map(l => ({ value: l.code, label: l.isRetired ? `${l.label} (retired)` : l.label }))
  };
}

export function useRefresh() {
  const qc = useQueryClient();
  return useCallback(() => qc.invalidateQueries(), [qc]);
}

/** Filters kept in the URL, so they survive navigating into a record and back (UX-02). */
export function useUrlState<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>) => void] {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => {
    const s = { ...defaults } as T;
    for (const k of Object.keys(defaults)) { const v = params.get(k); if (v !== null) (s as Record<string, string>)[k] = v; }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const set = useCallback((patch: Partial<T>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '' || v === (defaults as Record<string, string>)[k]) next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in patch)) next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams, defaults]);
  return [state, set];
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/**
 * Form state for UX-03: values kept after validation errors, errors beside fields, warning before discarding edits
 * (route change and tab close), and a stale-version (412) state that keeps the draft for review.
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [base, setBase] = useState<T>(initial);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(base), [values, base]);
  // The tab-close guard reads a ref: a successful submit clears it at once, so a page that navigates right after
  // saving (location.assign, e.g. sign-in) is not asked "Leave site?" before React has re-rendered.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const set = useCallback(<K extends keyof T>(k: K, v: T[K]) => setValues(p => ({ ...p, [k]: v })), []);
  const reset = useCallback((v: T) => { setValues(v); setBase(v); setError(null); }, []);

  async function submit<R>(fn: (v: T) => Promise<R>): Promise<R | undefined> {
    setBusy(true);
    setError(null);
    try {
      const r = await fn(values);
      dirtyRef.current = false;
      setBase(values);
      return r;
    } catch (e) {
      if (e instanceof ApiError) setError(e); else setError(new ApiError(0, { title: 'The request failed. Check your connection and try again.' }));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (name: string) => error?.field(name);
  return { values, set, setValues, reset, dirty, error, setError, busy, submit, fieldError };
}

/** Asks before leaving a page with unsaved edits (in-app navigation). */
export function useLeaveGuard(dirty: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('You have unsaved changes. Leave this page and discard them?')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
}

/** Selected denied tabs never render; changing rights immediately reselects an allowed section. */
export function usePermittedTab(resource: string, keys: string[], initial = keys[0]) {
  const me = useMe().data;
  const [params] = useSearchParams();
  const [requested, setRequested] = useState(params.get('tab') ?? initial);
  const allowed = keys.filter(key => canViewTab(me, resource, key));
  const selected = allowed.includes(requested) ? requested : allowed[0] ?? '';
  return [selected, setRequested, allowed] as const;
}
