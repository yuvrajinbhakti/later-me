import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState as RNAppState } from 'react-native';
import { AiError } from '../domain/ai';
import { calloutBasis, shouldRefreshCallouts } from '../domain/aiCallouts';
import { focusQuest } from '../domain/quests';
import { useAppStore } from '../store/AppStore';
import { useApiKey } from './apiKey';
import { requestCallouts } from './claude';

/** Settles rapid changes, like tapping through sarcasm levels, into one request. */
const DEBOUNCE_MS = 1500;

interface AiCalloutStatus {
  writing: boolean;
  error: string | null;
}

let status: AiCalloutStatus = { writing: false, error: null };
const listeners = new Set<() => void>();
const setStatus = (next: AiCalloutStatus) => {
  status = next;
  listeners.forEach((l) => l());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAiCalloutStatus = () => useSyncExternalStore(subscribe, () => status);

/**
 * Keeps AI-written callout lines fresh while the app is open: a new batch when the focus quest or level
 * changes, and otherwise once a day. The watcher only ever reads the saved batch, so callouts never wait
 * on the network.
 */
export function AiCalloutRefresher() {
  const { state, dispatch, ready } = useAppStore();
  const { key } = useApiKey();
  const focus = focusQuest(state);
  const level = state.settings.sarcasmLevel;
  const enabled = ready && !!key && state.settings.aiCallouts && state.settings.alertsEnabled && focus !== null;
  const basis = focus ? calloutBasis(level, focus) : null;

  const [foregrounded, setForegrounded] = useState(0);
  const latest = useRef({ state, focus, level, key });
  latest.current = { state, focus, level, key };
  const inFlight = useRef<{ basis: string; controller: AbortController } | null>(null);
  const lastFailure = useRef<{ basis: string; at: number; key: string } | null>(null);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'active') setForegrounded((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !basis) {
      inFlight.current?.controller.abort();
      inFlight.current = null;
      if (status.writing) setStatus({ writing: false, error: null });
      return;
    }
    const timer = setTimeout(() => {
      const { state: s, focus: quest, level: lvl, key: apiKey } = latest.current;
      if (!quest || !apiKey || inFlight.current?.basis === basis) return;
      // A failure only holds back retries for the key it happened with; a replaced key gets a fresh try.
      const failure = lastFailure.current?.key === apiKey ? lastFailure.current : null;
      if (!shouldRefreshCallouts({ set: s.aiCallouts, basis, now: Date.now(), lastFailure: failure })) return;

      inFlight.current?.controller.abort();
      const controller = new AbortController();
      inFlight.current = { basis, controller };
      setStatus({ writing: true, error: null });
      requestCallouts(lvl, quest, apiKey, { signal: controller.signal })
        .then((lines) => {
          dispatch({ type: 'setAiCallouts', set: { basis, createdAt: new Date().toISOString(), ...lines } });
          lastFailure.current = null;
          setStatus({ writing: false, error: null });
        })
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          lastFailure.current = { basis, at: Date.now(), key: apiKey };
          setStatus({ writing: false, error: e instanceof AiError ? e.message : 'Something went wrong writing callouts.' });
        })
        .finally(() => {
          if (inFlight.current?.controller === controller) inFlight.current = null;
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, basis, key, foregrounded, dispatch]);

  useEffect(() => () => inFlight.current?.controller.abort(), []);
  return null;
}
