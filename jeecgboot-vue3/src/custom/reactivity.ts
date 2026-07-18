import { customRef } from 'vue';

//region MySet
class MySet<T> extends Set<T> {
  track!: () => void;
  private trigger!: () => void;
  constructor(iterable?: Iterable<T>) {
    super();
    customRef((track, trigger) => {
      this.track = track;
      this.trigger = trigger;
      return {
        get: () => {
          return this;
        },
        set() {},
      };
    });
    if (iterable) {
      this._addAll(iterable);
    }
  }

  private _add(value: T) {
    super.add(value);
  }

  private _addAll(iterable: Iterable<T>) {
    if (Array.isArray(iterable)) {
      for (let i = 0; i < iterable.length; ++i) {
        super.add(iterable[i]);
      }
    } else {
      for (const value of iterable) {
        super.add(value);
      }
    }
  }

  private _deleteAll(iterable: Iterable<T>) {
    if (Array.isArray(iterable)) {
      for (let i = 0; i < iterable.length; ++i) {
        super.delete(iterable[i]);
      }
    } else {
      for (const value of iterable) {
        super.delete(value);
      }
    }
  }

  private _autoTrigger<R>(fn: () => R): R {
    const oldSize = this.size;
    const res = fn();
    if (oldSize !== this.size) {
      this.trigger();
    }
    return res;
  }

  add(value: T): this {
    this._autoTrigger(() => {
      super.add(value);
    });
    return this;
  }

  addAll(iterable: Iterable<T>): this {
    this._autoTrigger(() => {
      this._addAll(iterable);
    });
    return this;
  }

  delete(value: T): boolean {
    return this._autoTrigger(() => {
      return super.delete(value);
    });
  }

  deleteAll(iterable: Iterable<T>): this {
    this._autoTrigger(() => {
      this._deleteAll(iterable);
    });
    return this;
  }

  clear(): void {
    this._autoTrigger(() => {
      super.clear();
    });
  }

  some(predicate: (value: T, index: number) => boolean): boolean {
    let index = 0;
    for (const item of this) {
      if (predicate(item, index++)) {
        return true;
      }
    }
    return false;
  }

  every(predicate: (value: T, index: number) => boolean): boolean {
    let index = 0;
    for (const item of this) {
      if (!predicate(item, index++)) {
        return false;
      }
    }
    return true;
  }

  filter(predicate: (value: T, index: number) => boolean): MySet<T> {
    const set = new MySet<T>();
    let index = 0;
    for (const item of this) {
      if (predicate(item, index++)) {
        set._add(item);
      }
    }
    return set;
  }

  get value() {
    this.track();
    return this;
  }
}
//endregion
//region MyMap
class MyMap<K, V> extends Map<K, V> {
  track!: () => void;
  private trigger!: () => void;
  constructor(iterable?: Iterable<readonly [K, V]>) {
    super();
    customRef((track, trigger) => {
      this.track = track;
      this.trigger = trigger;
      return {
        get: () => {
          return this;
        },
        set() {},
      };
    });
    if (iterable) {
      this._setAll(iterable, (key, value) => {
        super.set(key, value);
      });
    }
  }

  private _set(key: K, value: V) {
    super.set(key, value);
  }

  private _setAll(iterable: Iterable<readonly [K, V]>, fn: (key: K, value: V) => void) {
    if (Array.isArray(iterable)) {
      for (let i = 0; i < iterable.length; ++i) {
        const [k, v] = iterable[i];
        fn(k, v);
      }
    } else {
      for (const [k, v] of iterable) {
        fn(k, v);
      }
    }
  }

  private _deleteAll(iterable: Iterable<K>) {
    if (Array.isArray(iterable)) {
      for (let i = 0; i < iterable.length; ++i) {
        super.delete(iterable[i]);
      }
    } else {
      for (const value of iterable) {
        super.delete(value);
      }
    }
  }

  private _autoTrigger<R>(fn: () => R): R {
    const oldSize = this.size;
    const res = fn();
    if (oldSize !== this.size) {
      this.trigger();
    }
    return res;
  }

  set(key: K, value: V): this {
    if (!super.has(key) || super.get(key) !== value) {
      super.set(key, value);
      this.trigger();
    }
    return this;
  }

  setAll(iterable: Iterable<readonly [K, V]>) {
    let changed = false;
    this._setAll(iterable, (key, value) => {
      if (changed) {
        super.set(key, value);
      } else if (!super.has(key) || super.get(key) !== value) {
        changed = true;
        super.set(key, value);
      }
    });
    if (changed) {
      this.trigger();
    }
  }

  delete(value: K): boolean {
    return this._autoTrigger(() => {
      return super.delete(value);
    });
  }

  deleteAll(iterable: Iterable<K>): this {
    this._autoTrigger(() => {
      this._deleteAll(iterable);
    });
    return this;
  }

  clear(): void {
    this._autoTrigger(() => {
      super.clear();
    });
  }

  some(predicate: (value: V, key: K, index: number) => boolean): boolean {
    let index = 0;
    for (const [k, v] of this) {
      if (predicate(v, k, index++)) {
        return true;
      }
    }
    return false;
  }

  every(predicate: (value: V, key: K, index: number) => boolean): boolean {
    let index = 0;
    for (const [k, v] of this) {
      if (!predicate(v, k, index++)) {
        return false;
      }
    }
    return true;
  }

  filter(predicate: (value: V, key: K, index: number) => boolean): MyMap<K, V> {
    const map = new MyMap<K, V>();
    let index = 0;
    for (const [k, v] of this) {
      if (predicate(v, k, index++)) {
        map._set(k, v);
      }
    }
    return map;
  }

  get value() {
    this.track();
    return this;
  }
}
//endregion

export { MySet, MyMap };
