import { useSyncExternalStore } from "use-sync-external-store/shim";
import { PersistentKvStore } from './persistentKvStore.ts';

const storeCache = new Map<string, any>();

function getStore<T extends Record<string, any>>(
    key: string,
    initial: T
): PersistentKvStore<T> {
    if (!storeCache.has(key)) {
        storeCache.set(key, new PersistentKvStore(key, initial));
    }

    return storeCache.get(key);
}

export function usePersistentKv<T extends Record<string, any>>(
    key: string,
    initial: T
): PersistentKvStore<T> {
    const store = getStore(key, initial);

    useSyncExternalStore(
        store.subscribe.bind(store),
        () => store.snapshot,
        () => store.snapshot
    );

    return store;
}