import localforage from 'localforage';
export interface IUsePGSOption<T = any> {
  /** default value provider */
  default: () => T;
  /** expected schema version */
  version: number;
  /** async function to migrate to current version if oldVersion < version */
  migrate: (
    oldVersion: number,
    oldValue: unknown,
    setValue: (newValue: T) => void
  ) => Promise<void>;
}

export interface IPersistentStore<T> {
  version: number;
  value: T;
}

const PERSISTENT_STORE_PREFIX = 'couch-db-pstore:';

/** a localforage-backed persistent storage, namespace-scoped and version protected. */
export class PersistentStore<T = any> {
  private ns: string;
  private version: number;
  private internalValue: T;
  private initialValue: T;

  private attached = false;
  private listeners = new Set<() => void>();

  constructor(ns: string, version: number, initialValue: T) {
    this.ns = ns;
    this.version = version;
    this.internalValue = initialValue;
    this.initialValue = initialValue;

    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  private get storeId() {
    return PERSISTENT_STORE_PREFIX + this.ns;
  }

  /** attach to the localforage with key `PREFIX + ns` */
  async attach(
    migrate?: (
      oldVersion: number,
      oldValue: unknown,
      setValue: (newValue: T) => void
    ) => Promise<void>
  ) {
    let envelop = await localforage.getItem<IPersistentStore<T>>(this.storeId);
    if (!envelop) {
      // no such store; create one
      envelop = {
        version: this.version,
        value: this.internalValue
      };

      await localforage.setItem(this.storeId, envelop);
    }

    if (this.version < envelop.version) {
      // rollback mode; refuse to attach
      return;
    }

    if (this.version === envelop.version) {
      // open and use
      this.attached = true;
      this.internalValue = envelop.value;
      this.emit();
      return;
    }

    if (this.version > envelop.version) {
      // need migration
      if (migrate) {
        await migrate(envelop.version, envelop.value, this.set);
      }

      this.attached = true;
    }
  }

  private emit() {
    for (const lnr of this.listeners) { lnr(); }
  }

  subscribe(notify: () => void) {
    this.listeners.add(notify);
    // in accordance with useSyncExternalStore
    return () => this.listeners.delete(notify);
  }

  get() {
    return this.internalValue;
  }

  set(newValue: T) {
    this.internalValue = newValue;
    if (this.attached) {
      // update localforage too
      localforage.setItem(this.storeId, {
        version: this.version,
        value: newValue
      }).then(() => {
        this.emit();
      });
    } else {
      // just notify
      this.emit();
    }
  }

  /** get current value for devtools */
  dev_get() {
    return this.internalValue;
  }

  /** set value for devtools */
  dev_set(newValue: T) {
    this.set(newValue);
  }

  /** reset to initial value for devtools */
  dev_reset() {
    this.set(this.initialValue);
  }

  /** get default value for devtools */
  dev_getDefault() {
    return this.initialValue;
  }
}
