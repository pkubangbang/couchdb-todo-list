import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';

/** Status of an API call */
export type IApiStatus =
  | 'not-started'
  | 'loading'
  | 'aborted'
  | 'success'
  | 'error';

/**
 * Basic API control interface returned by trigger hooks
 */
export interface IApiType {
  /**
   * Manually trigger the API call
   */
  fire(): void;
  /**
   * Abort the API call so the result never shows
   * TODO: implement this logic
   */
  abort(): void;
  /**
   * Expose this API call to `window.$apis.xxx` for debug simplicity
   */
  debug(debugNameShownAs$Api: string): void;
}

/**
 * Extended API interface with state accessors (available via debug mode in `window.$apis.xxx`)
 * After you call `debug()`, you get these tools in the web console.
 */
export interface IApiTypeExtended extends IApiType {
  /** The current status */
  status: IApiStatus;
  /** The current data */
  data: unknown;
  /** The current error (object) */
  error: unknown;

  /** Set the current status */
  setStatus(status: IApiStatus): void;
  /** Set the current data. Will not change the error. */
  setData(data: unknown): void;
  /** Set the current error. Will not change the data. */
  setError(error: unknown): void;
  /** Reset data, error and loading state */
  reset(): void;
}

// Add `window.$apis.xxx` functionality
declare global {
  interface Window {
    $apis: {
      [apiDebugName: string]: IApiTypeExtended;
    };
  }
}

/**
 * Auto-triggered API hook that automatically calls the API when dependencies change
 *
 * @template ResponseType - The type of data returned by the API call
 * @template ErrorType - The type of error returned (defaults to Error)
 * @param apiCallFn - Function that performs the API call, accepts an AbortSignal
 * @param deps - Dependency array that triggers re-calls when changed
 * @returns Tuple containing [status, data, error, apiControl]
 *
 * @example
 * const [status, data, error, api] = useAutoTrigger(
 *   (signal) => fetch('/api/data', { signal }).then(r => r.json()),
 *   [userId]
 * );
 */
export function useAutoTrigger<ResponseType, ErrorType = Error>(
  apiCallFn: (abortSignal: AbortSignal) => Promise<ResponseType>,
  deps: unknown[]
): [IApiStatus, ResponseType | undefined, ErrorType | undefined, IApiType] {
  const [tick, forceUpdate] = useReducer((n) => n + 1, 0);
  const [status, setStatus] = useState<IApiStatus>('not-started');
  const [data, setData] = useState<ResponseType>();
  const [error, setError] = useState<ErrorType>();

  const [debugName, setDebugName] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // When auto trigger, abort the last request and then start a new one.
    abortControllerRef.current?.abort();

    setStatus('loading');
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    apiCallFn(signal) // apiCallFn depends on deps
      .then((data) => {
        setData(data);
        setError(undefined);
        setStatus('success');
      })
      .catch((e: ErrorType) => {
        setData(undefined);
        setError(e);
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const api = useMemo<IApiType>(
    () => ({
      fire: () => {
        forceUpdate();
      },
      abort: () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
      },
      debug: (debugNameShownAs$Api) => {
        if (debugName !== debugNameShownAs$Api) {
          setDebugName(debugNameShownAs$Api);
        }
      }
    }),
    [debugName]
  );

  useEffect(() => {
    if (import.meta.env.DEV) {
      const $apis = window.$apis ?? {};
      if (debugName) {
        $apis[debugName] = {
          ...api,
          status: status,
          data: data,
          error: error,
          setStatus: setStatus,
          setData: setData,
          setError: setError,
          reset: () => {
            setData(undefined);
            setError(undefined);
            setStatus('not-started');
          }
        };

        window.$apis = $apis;
        return () => {
          delete $apis[debugName];
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, api, status, data, error, debugName]);

  return [status, data, error, api];
}

/**
 * Manually-triggered API hook that only calls the API when `fire()` is invoked
 *
 * @template ResponseType - The type of data returned by the API call
 * @template ErrorType - The type of error returned (defaults to Error)
 * @param apiCallFn - Function that performs the API call, accepts an AbortSignal
 * @param deps - Dependency array that updates the closure but doesn't auto-trigger
 * @returns Tuple containing [status, data, error, apiControl]
 *
 * @example
 * const [status, data, error, api] = useManualTrigger(
 *   (signal) => fetch('/api/data', { signal }).then(r => r.json()),
 *   [userId]
 * );
 *
 * // Call the API manually
 * api.fire();
 */
export function useManualTrigger<ResponseType, ErrorType = Error>(
  apiCallFn: (abortSignal: AbortSignal) => Promise<ResponseType>,
  deps: unknown[]
): [IApiStatus, ResponseType | undefined, ErrorType | undefined, IApiType] {
  const [status, setStatus] = useState<IApiStatus>('not-started');
  const [data, setData] = useState<ResponseType>();
  const [error, setError] = useState<ErrorType>();

  const [debugName, setDebugName] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fire = useCallback(() => {
    setStatus('loading');
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    apiCallFn(signal) // apiCallFn depends on deps
      .then((data) => {
        setData(data);
        setError(undefined);
        setStatus('success');
      })
      .catch((e: ErrorType) => {
        setData(undefined);
        setError(e);
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  const api = useMemo<IApiType>(
    () => ({
      fire: fire,
      abort: () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
      },
      debug: (debugNameShownAs$Api) => {
        if (debugName !== debugNameShownAs$Api) {
          setDebugName(debugNameShownAs$Api);
        }
      }
    }),
    [debugName, fire]
  );

  useEffect(() => {
    if (import.meta.env.DEV) {
      const $apis = window.$apis ?? {};
      if (debugName) {
        $apis[debugName] = {
          ...api,
          status: status,
          data: data,
          error: error,
          setStatus: setStatus,
          setData: setData,
          setError: setError,
          reset: () => {
            setData(undefined);
            setError(undefined);
            setStatus('not-started');
          }
        };

        window.$apis = $apis;
        return () => {
          delete $apis[debugName];
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, api, status, data, error, debugName]);

  return [status, data, error, api];
}
