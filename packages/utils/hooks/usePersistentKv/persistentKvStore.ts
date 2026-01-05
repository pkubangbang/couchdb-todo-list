import { idbGet, idbSet } from './idbUtils.ts';

type Listener = () => void;

export class PersistentKvStore<T extends Record<string, any>> {
  private data: T;
  private listeners: Set<Listener> = new Set();
  private ready: Promise<void>;

  constructor(
    private readonly key: string,
    initial: T
  ) {
    this.data = initial;

    this.ready = idbGet<T>(key).then((stored) => {
      if (stored) {
        this.data = stored;
        this.emit();
      }
    });
  }

  get snapshot(): T {
    return this.data;
  }

  async whenReady() {
    await this.ready;
  }

  get(k: string): T[typeof k] {
    return this.data[k];
  }

  set(k: string, v: any) {
    this.data = { ...this.data, [k]: v };
    this.emit();
    idbSet(this.key, this.data);
  }

  delete(k: string) {
    if (!(k in this.data)) {
      return;
    }

    const result = {} as typeof this.data;
    for (const key in this.data) {
      if (key !== k) {
        result[key] = this.data[key];
      }
    }

    this.data = result;
    this.emit();
    idbSet(this.key, this.data);
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    for (const l of this.listeners) {
      l();
    }
  }
}
