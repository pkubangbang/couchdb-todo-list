import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { type IUsePGSOption, PersistentStore } from './PersistentStore.ts';

interface IPersistentStoreDevTools<T> {
  get(): T;
  set(value: T): void;
  reset(): void;
}

declare global {
  interface Window {
    $states: Record<string, IPersistentStoreDevTools<any>>;
  }
}

const storeRegistry: Map<string, PersistentStore> = new Map();
function getPersistentStore<T>(
  ns: string,
  options?: IUsePGSOption<T>
): PersistentStore<T> {
  let found = storeRegistry.get(ns);
  if (!found) {
    console.log('creating persistent store: ' + ns);
    const version = options?.version ?? 0;
    const initialValue = options?.default() ?? undefined;
    found = new PersistentStore(ns, version, initialValue);
    storeRegistry.set(ns, found);

    found.attach(options?.migrate); // don't wait

    // Add devtools in development mode
    if (import.meta.env.MODE === 'development') {
      if (!window.$states) {
        window.$states = {};
      }

      window.$states[ns] = {
        get: () => found.dev_get(),
        set: (value: any) => found.dev_set(value),
        reset: () => found.dev_reset()
      };
    }
  }

  return found;
}

/**
 * created a namespace-scoped `useState` that is persistent and globally shared.
 * @param ns the namespace
 * @param options the (optional) options to specify
 * @returns 2-element tuple that is similar to what `useState` returns.
 */
export function usePersistentGlobalState<T>(
  ns: string,
  options?: IUsePGSOption<T>
): [T, (newValue: T) => void] {
  const store = getPersistentStore(ns, options);
  const value = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.get
  );

  return [value, store.set];
}
