import type { MaybeRef } from 'vue';
import type { SizeObject } from '/@/custom/components/ResizeObserver/type';
import { shallowReactive, isRef, watch, onUnmounted } from 'vue';
import { lazyTask, bindEvent, stateSwitcher, toValue } from '/@/custom/function';

interface Cache {
  windowSize: SizeObject;
  start: () => void;
  end: () => void;
}

const cacheMap = new Map<Window, Cache>();
function createCache(view: MaybeRef<Window>): Cache {
  let win = toValue(view);
  let eventActive = false;
  const windowSize = shallowReactive({
    width: win.innerWidth,
    height: win.innerHeight,
  });
  if (isRef(view)) {
    watch(view, (value, oldValue) => {
      win = value;
      if (eventActive) {
        offEvent(oldValue);
        onEvent(value);
        run();
      }
    });
  }
  //region 对resize处理器节流
  const run = lazyTask(function () {
    const { width, height } = windowSize;
    if (width !== win.innerWidth) {
      windowSize.width = win.innerWidth;
    }
    if (height !== win.innerHeight) {
      windowSize.height = win.innerHeight;
    }
  });
  //endregion
  //region 绑定事件
  const [onEvent, offEvent] = bindEvent('resize', run, {
    passive: true,
  });
  //endregion
  const [start, end] = stateSwitcher(
    () => {
      eventActive = true;
      onEvent(win);
      run();
    },
    () => {
      eventActive = false;
      offEvent(win);
    }
  );
  return {
    windowSize,
    start,
    end,
  };
}
export default function ({ autoStart = true, view = window }: { autoStart?: boolean; view?: MaybeRef<Window> }): Cache {
  let cache;
  if (isRef(view)) {
    cache = createCache(view);
  } else {
    cache = cacheMap.get(view);
    if (!cache) {
      cache = createCache(view);
      cacheMap.set(view, cache);
    }
  }
  if (autoStart) {
    cache.start();
    onUnmounted(cache.end);
  }
  return cache;
}
