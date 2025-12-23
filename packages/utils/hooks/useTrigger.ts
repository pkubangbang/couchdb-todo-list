import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

export type IApiStatus = 'not-started' | 'loading' | 'aborted' | 'success' | 'error';

export interface IApiType {
    // Manually trigger the api call
    fire(): void;
    // Abort the api call so the result never show.
    // TODO: implement this logic
    abort(): void;
    // Expose this api call to `window.$api.xxx` for debug simplicity.
    debug(debugNameShownAs$Api: string): void;
}

// After you "debug()", you get these tools in the web console.
export interface IApiTypeExtended extends IApiType {
    // The current status
    status: IApiStatus;
    // The current data
    data: unknown;
    // The current error (object)
    error: unknown;

    // Set the current status.
    setStatus(status: IApiStatus): void;
    // Set the current data. Will not change the error.
    setData(data: unknown): void;
    // Set the current error. Will not change the data.
    setError(error: unknown): void;
    // Reset data, error and loading state.
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

export function useAutoTrigger<ResponseType, ErrorType = Error>(
    apiCallFn: (abortSignal: AbortSignal) => Promise<ResponseType>,
    deps: unknown[]
): [IApiStatus, ResponseType | undefined, ErrorType | undefined, IApiType] {
    const [tick, forceUpdate] = useReducer(n => n + 1, 0);
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
            .then(data => {
                setData(data);
                setError(undefined);
                setStatus('success');
            })
            .catch((e: ErrorType) => {
                setData(undefined);
                setError(e);
                setStatus('error');
                throw e;
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
            debug: debugNameShownAs$Api => {
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
            .then(data => {
                setData(data);
                setError(undefined);
                setStatus('success');
            })
            .catch((e: ErrorType) => {
                setData(undefined);
                setError(e);
                setStatus('error');
                // re-throw so that certain errors (such as 401) can be handled globally.
                throw e;
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
            debug: debugNameShownAs$Api => {
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
