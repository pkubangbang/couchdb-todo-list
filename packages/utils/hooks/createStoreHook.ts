// deno-lint-ignore-file no-window no-explicit-any
import { type Draft, enablePatches, produceWithPatches } from 'immer';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

// Immer patches need explicit enabling to work.
enablePatches();

type IUseStore<T> = {
    (/* No selector! */): T;

    createDispatcher<FN extends (draft: Draft<T>, ...args: unknown[]) => void>(
        cb: FN,
        debugName?: string
    ): VoidFunctionWithoutFirstParam<FN>;
} & Partial<IUseStoreDebugTools<T>>;

type IStoreListener = (changedKeys: (string | number)[]) => void;

interface IUseStoreDebugTools<T> {
    set(mockState: Partial<T>): T;
    reset(stash?: T): void;
}

// Add `window.$stores.xxx` functionality
declare global {
    interface Window {
        $stores: {
            [storeName: string]: IUseStoreDebugTools<any>;
        };
        $store_resetAll(): void;
    }
}

if (import.meta.env.MODE === 'development') {
    window.$store_resetAll = () => {
        const storeNames = Object.keys(window.$stores || {});
        storeNames.forEach(storeName => {
            window.$stores[storeName].reset();
        });
        console.log(
            'Successfully reset all named stores to their initial states.'
        );
    };
}

export function createStoreHook<T extends object>(
    storeProvider: () => T,
    storeName?: string
): IUseStore<T> {
    let state: T;
    // deno-lint-ignore prefer-const
    let original: T;
    const listeners: Set<IStoreListener> = new Set();
    const sessionStorageKey = `store#${storeName}`;

    let isDispatching = false;
    let activeDispatcherName = '';

    const getState = () => state;

    const setState = (recipe: (draft: Draft<T>) => void) => {
        const [newState, patches] = produceWithPatches(state, recipe);

        // NewState was of type Immutable<T>, so this cast is safe.
        state = newState as T;

        if (import.meta.env.MODE === 'development') {
            if (storeName) {
                sessionStorage.setItem(
                    sessionStorageKey,
                    JSON.stringify(newState)
                );
            }
        }

        const changedKeys = distinct(patches.map(p => p.path[0])); // only the first level.
        listeners.forEach(listener => listener(changedKeys));
    };

    // Initialize the store state.
    original = state = storeProvider();

    // Improving dev agility by caching the store state.
    if (import.meta.env.MODE === 'development') {
        if (storeName) {
            const sessionData = sessionStorage.getItem(sessionStorageKey);
            if (sessionData) {
                try {
                    state = JSON.parse(sessionData) as T;
                    console.log(
                        `useStoreHook[${storeName}]: successfully restored data from SessionStorage after reload.`
                    );
                } catch {
                    console.error(
                        `useStoreHook[${storeName}]: failed to restore data from SessionStorage after reload. Use default instead`
                    );
                }
            }
        }
    }

    // The generated `useStore` hook.
    const useStoreHook: IUseStore<T> = () => {
        const [, forceUpdate] = useReducer(c => c + 1, 0);
        const watchedKeysRef = useRef<Record<string, true>>({});
        const memoRef = useRef(state);

        // Watch the read
        const proxy = useMemo(() => {
            return new Proxy(original, {
                get: (_target, prop: string | symbol) => {
                    if (typeof prop === 'symbol') {
                        // Immer does not allow symbol access here. Return undefined.
                        return undefined;
                    }

                    const result = memoRef.current[prop as keyof T];
                    if (
                        typeof result !== 'function' &&
                        !watchedKeysRef.current[prop] &&
                        !prop.startsWith('$')
                    ) {
                        // New prop to watch
                        watchedKeysRef.current[prop] = true;
                        return (memoRef.current = getState())[prop as keyof T];
                    } else {
                        return result;
                    }
                }
            });
        }, []);

        const listener = useCallback<IStoreListener>(changedKeys => {
            for (let i = 0, key: string | number; i < changedKeys.length; i++) {
                key = changedKeys[i];
                // console.log(watchedKeysRef.current, key, watchedKeysRef.current[key]);
                if (watchedKeysRef.current[key]) {
                    // A watched key has changed its value; update the internal state.
                    memoRef.current = getState();
                    forceUpdate();
                    return;
                }
            }
        }, []);

        useEffect(() => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        }, [listener]);

        return proxy;
    };

    useStoreHook.createDispatcher = (
        cb,
        debugName = 'unspecified dispatcher'
    ) => {
        return (...args: any[]) => {
            const curriedFn = (draft: Draft<T>) => cb(draft, ...args);

            if (!isDispatching) {
                isDispatching = true;
                activeDispatcherName = debugName;
            } else {
                throw new Error(
                    `Nested dispatching: [${debugName}] inside [${activeDispatcherName}]`
                );
            }

            let hasFailure = true;
            try {
                setState(curriedFn);
                hasFailure = false;
            } catch (e) {
                console.error(e);
            } finally {
                isDispatching = false;
                activeDispatcherName = '';
            }

            if (hasFailure) {
                throw new Error(`Dispatcher [${debugName}] error`);
            }
        };
    };

    const _set = (mockState: Partial<T>) => {
        // For better development experience.
        if (typeof mockState === 'undefined') {
            throw new Error('set() needs a state as input.');
        }

        setState(draft => {
            // Remember to always modify the draft in case to trigger updates.
            Object.keys(mockState).forEach(key => {
                // @ts-ignore keys should be valid on both sides
                draft[key] = mockState[key];
            });
        });

        return getState();
    };

    const _reset = (stash?: T) => {
        setState(draft => {
            // Remove extra keys and update own keys
            const newState = stash ?? original;
            const ownKeys = Object.keys(newState);
            const draftKeys = Object.keys(draft);

            const ownKeysSet = new Set(ownKeys);
            const extraKeys = draftKeys.filter(key => !ownKeysSet.has(key));

            extraKeys.forEach(key => {
                delete draft[key as keyof Draft<T>];
            });

            ownKeys.forEach(key => {
                // @ts-ignore keys should be valid on both sides
                draft[key] = newState[key];
            });
        });
    };

    // Add jest testing fixture
    if (import.meta.env.MODE === 'test') {
        useStoreHook.set = _set;
        useStoreHook.reset = _reset;
    }

    // Add console devtools
    if (import.meta.env.MODE === 'development') {
        if (storeName) {
            if (!window.$stores) {
                window.$stores = {};
            }
            window.$stores[storeName] = {
                set: _set,
                reset: _reset
            };
        }
    }

    return useStoreHook;
}

function distinct(keys: (string | number)[]) {
    return Array.from(new Set(keys));
}
