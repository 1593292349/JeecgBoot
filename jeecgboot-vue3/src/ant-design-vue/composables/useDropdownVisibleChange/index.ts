import { computed, shallowRef, useAttrs } from 'vue';

export default function (event: string = 'onDropdownVisibleChange') {
  const key = shallowRef(0);
  const hasClosed = shallowRef(false);
  const attrs = useAttrs();
  return computed(() => {
    return {
      key: key.value,
      defaultOpen: hasClosed.value ? false : attrs.defaultOpen,
      [event](...args: unknown[]) {
        const listener = attrs[event];
        if (typeof listener === 'function') {
          listener(...args);
        } else if (Array.isArray(listener)) {
          for (const fn of listener) {
            fn(...args);
          }
        }
        if (!args[0]) {
          hasClosed.value = true;
          key.value = (key.value + 1) % Number.MAX_SAFE_INTEGER;
        }
      },
    };
  });
}