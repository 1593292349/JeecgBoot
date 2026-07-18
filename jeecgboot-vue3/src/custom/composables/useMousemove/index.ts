import type { Param } from './type';
import { throttle, bindEvent, toValue } from '/@/custom/function';

interface Cache<T> {
  onMousedown: (e: MouseEvent, args: T) => void;
}
const classList = ['pf_global--noSelectable', 'pf_global--noPointerEvents'];
export default function <P extends unknown[] = []>({
  start,
  end,
  move,
  cursor,
  throttle: time,
  view = window,
}: Param<P>): (e: MouseEvent, ...args: P) => void {
  let cache: Cache<P> | (() => Cache<P>) = function () {
    let doMousemove: (e: MouseEvent) => void | boolean;
    let flushMousemove: undefined | (() => void);
    let cancelMousemove: undefined | (() => void);
    let lastWin: Window;
    //region 对move节流
    if (time === false) {
      doMousemove = move;
    } else {
      ({ run: doMousemove, flush: flushMousemove, cancel: cancelMousemove } = throttle(move, time));
    }
    //endregion
    //region 事件绑定
    const [onEvent, offEvent] = bindEvent(
      [
        {
          type: 'mousemove',
          listener(e: MouseEvent) {
            if (doMousemove(e) === false) {
              stop();
              cancelMousemove && cancelMousemove();
            }
          },
        },
        {
          type: 'mouseup',
          listener(e: MouseEvent) {
            stop();
            flushMousemove && flushMousemove();
            end && end(e);
          },
        },
      ],
      {
        passive: true,
      }
    );
    //endregion
    //region 开始
    function onMousedown(e: MouseEvent, args: P) {
      if (start(e, ...args) !== false) {
        lastWin = toValue(view);
        onEvent(lastWin);
        lastWin.document.body.classList.add(...classList);
        if (cursor) {
          lastWin.document.documentElement.style.cursor = typeof cursor === 'string' ? cursor : cursor();
        }
      }
    }
    //endregion
    //region 停止
    function stop() {
      offEvent(lastWin);
      lastWin.document.body.classList.remove(...classList);
      if (cursor) {
        lastWin.document.documentElement.style.cursor = '';
      }
    }
    //endregion
    return {
      onMousedown,
    };
  };
  return function (e: MouseEvent, ...args: P) {
    if (typeof cache === 'function') {
      cache = cache();
    }
    cache.onMousedown(e, args);
  };
}
