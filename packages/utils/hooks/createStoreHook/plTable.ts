type FN = () => void;

/**
 * A 2 dimension table that holds the relationship of
 * property (string) agains listeners (fn).
 * 
 * ```
 * prop \ listener | l1 | l2 | l3 | l4 <- add new
 * ----------------|----|----|----|-------------
 * p1              | v  |    |    |
 * p2              |    | v  |    |
 * p3 (notify -> ) | v  | v  |    |
 * p4              |    |    | v  |
 * ```
 * 
 * You can imagin the table rapidly changes by adding
 * new columns and v's, and when a row gets notified,
 * all related listeners will be called.
 */
export class PlTable {
    private p2l: Record<string, Set<FN>> = {};
    private l2p: WeakMap<FN, string[]> = new WeakMap();

    constructor (stateObj: Record<string, unknown>) {
        for (const key in stateObj) {
            this.p2l[key] = new Set();
        }

        if (import.meta.env.DEV) {
            (window as any).$p2l = this.p2l;
        }
    }

    /**
     * Idempotantly bind listener to a prop.
     * @param prop 
     * @param listener 
     * @returns 
     */
    addListener(prop: string, listener: FN) {
        const listeners = this.p2l[prop];
        if (!listeners) {
            return;
        }

        if (!listeners.has(listener)) {
            // new tracking; add prop to l2p
            listeners.add(listener);

            const watchedProps = this.l2p.get(listener);
            if (!watchedProps) {
                // single member prop list
                this.l2p.set(listener, [prop])
            } else {
                watchedProps.push(prop);
            }
        } else {
            // existed binding; skip
        }
    }

    /**
     * Idempotantly remove a listener from the table,
     * releasing all of its watched props.
     * @param listener 
     */
    removeListener(listener: FN) {
        const watchedProps = this.l2p.get(listener) ?? [];
        for (const prop of watchedProps) {
            const listeners = this.p2l[prop];
            if (listeners) {
                listeners.delete(listener);
            }
        }
    }

    /**
     * Notify all listeners related with a prop.
     * @param prop 
     */
    notifyListeners(prop: string) {
        const listeners = this.p2l[prop];
        if (listeners) {
            for (const listener of listeners) {
                listener();
            }
        }
    }
}