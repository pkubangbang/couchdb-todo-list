/* createStoreHook used in
   Use compat-mode with React 17 and before, and `useSyncExternalStore` for 18 and later.
*/

// deno-lint-ignore-file no-explicit-any no-window
import React, { useCallback, useMemo, useRef } from "react";
import { type Draft, enablePatches, produceWithPatches } from "immer";
import { useSyncExternalStore } from "use-sync-external-store/shim";

import { PlTable } from "./plTable.ts";

// immer patches will report the props that changes.
enablePatches();

/** Type of the useXxxStore created by calling createStoreHook.
 * - use `useXxxStore()` with no selector inside React components.
 * - create a dispatcher by `useXxxStore.createDispatcher(...)`
 * - when in DEV mode, `useXxxStore.set()` and `useXxxStore.reset()`
 * will manipulate the state.
 */
type IUseStore<T> = {
  (/* No selector! */): T;

  createDispatcher<FN extends (draft: Draft<T>, ...args: any[]) => void>(
    cb: FN,
    debugName?: string,
  ): VoidFunctionWithoutFirstParam<FN>;
} & Partial<IUseStoreDebugTools<T>>;

interface IUseStoreDebugTools<T> {
  set(mockState: Partial<T>): T;
  reset(stash?: T): void;
}

/** Augment the `window` object with store utilities. Available in the browser console.
 * - `$stores.someStore`: get a store by storeName.
 * - `$store_version`: show the version in use. (18 or 17compat)
 * - `$store_resetAll()`: reset all store to their initial state.
 */
declare global {
  interface Window {
    $stores: Record<string, IUseStoreDebugTools<any>>;
    $store_version: string;
    $store_resetAll(): void;
  }
}

/** "checkAndForceUpdate" function that get called when the store has changed its state.
 * `_id` is a random hash, useful for debugging the lifecycle.
 */
type Listener = {
  (): void;
  _id?: string;
};

type ComputedFn<T> = (store: T) => any;

/** A `useXxxStore` factory method.
 * @param initializer a provider function that produce the initial state object.
 * @param storeName a debug name. If specified, the store can be retrieved (in the browser console)
 * by using `$stores.storeName`.
 *
 * The initializer should return a plain old javascript object (i.e. Record<string, any>).
 *
 * If the property value is a function, then it should be a pure function that takes the
 * state-of-the-store and produce a value, like `fullName: (state) => state.firstName + ' ' + state.lastName`
 *
 * Symbol as property key is not supported due to the limitation of immer-js.
 */
export function createStoreHook<T extends Record<string, any>>(
  initializer: () => T,
  storeName?: string,
) {
  const original = initializer();

  // listeners are spread on each property of the internal state
  const table = new PlTable(original);

  let state = original;
  const getState = () => state;
  const setState = (recipe: (draft: Draft<T>) => void) => {
    const [newState, patches] = produceWithPatches(state, recipe);

    // NewState was of type Immutable<T>, so this cast is safe.
    state = newState as T;
    dev_saveToSessionStorage(storeName);

    // only the first level is tracked
    const changedKeys = distinct(patches.map((p) => p.path[0]));
    for (const prop of changedKeys) {
      if (typeof prop === "string") {
        table.notifyListeners(prop);
      }
    }
  };

  /**
   * A react hook that when called (in the component) will give you a global data store.
   *
   * The data store is smart to detect all 1st-level property access so you don't need
   * to provide the "value selector fn"; just read the store and the dependency will
   * be established.
   *
   * @example given that you've created a store-hook called `useXxxStore`:
   * ```ts
   * // on the top level within the component
   * const { propA, propB } = useXxxStore();
   *
   * // when propA or propB changes, this component will re-render.
   * ```
   *
   * @returns a global data store.
   */
  const useStoreHook = () => {
    const fnRef = useRef<Listener | null>(null);
    /** For each call site, there is a buffer that temporarily holds
     * the property-access record BEFORE its listener (fnRef) gets registered.
     *
     * When registering, all the pending requests will be processed
     * and removed from this buffer.
     */
    const pendingPropsRef = useRef<Set<string>>(new Set());

    // It only relies on stable refs, so
    const subscribe = useCallback((checkForUpdates: () => void) => {
      fnRef.current = checkForUpdates;

      // process all pending requests
      for (const prop of pendingPropsRef.current) {
        table.addListener(prop, checkForUpdates);
      };

      pendingPropsRef.current.clear();

      const random = randomHash(); // e.g. r2ader
      fnRef.current._id = random;
      console.log("subscribe done", random);

      return () => {
        console.log("unsubscribe", random);
        fnRef.current = null;
        table.removeListener(checkForUpdates);
        pendingPropsRef.current.clear();
      };
    }, []);

    // forget about the return value; only use the trigger.
    useSyncExternalStore(subscribe, getState);

    const proxy = useMemo(() => {
      return new Proxy(original, {
        get(_target, prop) {
          if (!(prop in original)) {
            // Do not allow prop creation on the top level.
            return undefined;
          }

          const value = getState()[prop as keyof T];
          if (typeof prop === "symbol") {
            // Do not record symbol access.
            return value;
          }

          if (typeof value === "function") {
            return (value as ComputedFn<T>)(proxy);
          }

          console.log("proxying", fnRef.current?._id);
          if (fnRef.current) {
            // idempotent add dep tracking
            table.addListener(prop, fnRef.current);
          } else {
            // fnRef not ready (why?). Cache the requests.
            pendingPropsRef.current.add(prop);
          }

          return value;
        },
      });
    }, []); // The proxy is stable!

    return proxy;
  };

  /* ====================================================
   * Dispatcher API
   * ====================================================
   */

  let isDispatching = false;
  let activeDispatcherName = "";

  /**
   * Add arbitrary dispatcher to the store. To declare a dispatcher,
   * you need to provide a function that describe "how to manipulate the store", like
   *
   * ```ts
   * (draft, input1, input2) => {
   *   // directly manipulate the store, thanks to immer-js
   *   draft.propA = input1;
   *   draft.propB = input2;
   * }
   * ```
   *
   * In return, you get a dispatcher of type `(input1, input2) => void`.
   *
   * **Note that the 1st param in the declaration is predefined and removed
   * in the produced method.**
   *
   * @param cb how to manipulate the store. The 1st param is the store itself.
   * @param debugName a debugName shown in console log if specified. Otherwise a random name will be given.
   * @returns a dispatcher which takes all params from the cb EXCEPT the first one.
   */
  const createDispatcher: IUseStore<T>["createDispatcher"] = (
    cb,
    debugName = "unspecified dispatcher " + randomHash(),
  ) => {
    return (...args: any[]) => {
      if (!isDispatching) {
        isDispatching = true;
        activeDispatcherName = debugName;
      } else {
        throw new Error(
          `Nested dispatching: [${debugName}] inside [${activeDispatcherName}]`,
        );
      }

      let hasFailure = true;
      try {
        setState((draft) => cb(draft, ...args));
        hasFailure = false;
      } catch (e) {
        console.error(e);
      } finally {
        isDispatching = false;
        activeDispatcherName = "";
      }

      if (hasFailure) {
        throw new Error(`Dispatcher [${debugName}] error`);
      }
    };
  };

  /* ====================================================
   * dev tools
   * ====================================================
   */
  function dev_saveToSessionStorage(storeName: string | undefined) {
    if (import.meta.env.MODE === "development") {
      if (storeName) {
        const sessionStorageKey = `store#${storeName}`;
        sessionStorage.setItem(
          sessionStorageKey,
          JSON.stringify(state),
        );
      }
    }
  }

  function dev_loadFromSessionStorage(storeName: string) {
    const sessionStorageKey = `store#${storeName}`;
    const sessionData = sessionStorage.getItem(sessionStorageKey);
    if (sessionData) {
      try {
        state = JSON.parse(sessionData) as T;
        console.log(
          `useStoreHook[${storeName}]: successfully restored data from SessionStorage after reload.`,
        );
      } catch {
        console.error(
          `useStoreHook[${storeName}]: failed to restore data from SessionStorage after reload. Use default instead`,
        );
      }
    }
  }

  function _set(mockState: Partial<T>) {
    if (typeof mockState === "undefined") {
      throw new Error("set() needs a state as input.");
    }

    setState((draft) => {
      // Remember to always modify the draft in case to trigger updates.
      Object.keys(mockState).forEach((key) => {
        // @ts-ignore keys should be valid on both sides
        draft[key] = mockState[key];
      });
    });

    return getState();
  }

  function _reset(stash?: T) {
    setState((draft) => {
      // Remove extra keys and update own keys
      const newState = stash ?? original;
      const ownKeys = Object.keys(newState);
      const draftKeys = Object.keys(draft);

      const ownKeysSet = new Set(ownKeys);
      const extraKeys = draftKeys.filter((key) => !ownKeysSet.has(key));

      extraKeys.forEach((key) => {
        delete draft[key as keyof Draft<T>];
      });

      ownKeys.forEach((key) => {
        // @ts-ignore keys should be valid on both sides
        draft[key] = newState[key];
      });
    });
  }

  // Add jest testing fixture
  if (import.meta.env.MODE === "test") {
    useStoreHook.set = _set;
    useStoreHook.reset = _reset;
  }

  // Add console devtools
  if (import.meta.env.MODE === "development") {
    if (storeName) {
      dev_loadFromSessionStorage(storeName);
      if (!window.$stores) {
        window.$stores = {};
      }
      window.$stores[storeName] = {
        set: _set,
        reset: _reset,
      };

      window.$store_resetAll = () => {
        const storeNames = Object.keys(window.$stores || {});
        storeNames.forEach((storeName) => {
          window.$stores[storeName].reset();
        });
        console.log(
          "Successfully reset all named stores to their initial states.",
        );
      };

      window.$store_version = (React as any).useSyncExternalStore
        ? "18"
        : "17compat";
    }
  }

  /* ===============================================
   * public api
   * ===============================================
   */

  useStoreHook.createDispatcher = createDispatcher;
  return useStoreHook;
}

function randomHash() {
  return Math.random().toString(36).slice(2, 8);
}

function distinct(keys: (string | number)[]) {
  return Array.from(new Set(keys));
}
