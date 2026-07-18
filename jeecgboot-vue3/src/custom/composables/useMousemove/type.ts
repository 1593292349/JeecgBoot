import type { MaybeRef } from 'vue';

interface Param<P extends unknown[]> {
  cursor?: string | (() => string);
  throttle?: number | false;
  start: (e: MouseEvent, ...args: P) => void | boolean;
  end?: (e: MouseEvent) => void;
  move: (e: MouseEvent) => void | boolean;
  view?: MaybeRef<Window>;
}

export type { Param };
