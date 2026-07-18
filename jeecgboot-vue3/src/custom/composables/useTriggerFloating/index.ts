import type { ReferenceElement } from '@floating-ui/dom';
import type { Param } from './type';
import { onUnmounted } from 'vue';
import { bindEvent, throttle } from '/@/custom/function';
import useFloating from '../useFloating';

interface Cache {
  pending: () => boolean;
  cancel: () => void;
  onCheckInside: () => void;
  offCheckInside: () => void;
}
export default function <T extends ReferenceElement = ReferenceElement>({
  emitInput,
  value,
  trigger,
  hideOnClick,
  interactive,
  disabled,
  hideCondition,
}: Param) {
  const { referenceRef, floatingRef, visible, initShow, exist, show, hide, toggle } = useFloating<T>({
    emitInput,
    value,
    disabled,
    //@ts-ignore
    onVisibleChange(visible, isFirst) {
      if (!isFirst) {
        stopCheck();
      }
    },
  });
  //region 触发监听器
  const referenceListenersFn = () => {
    const triggerVal = trigger();
    if (triggerVal === 'hover') {
      return {
        mouseenter: showTrigger,
        mouseleave: hideTrigger,
      };
    } else if (triggerVal === 'click') {
      return {
        click: showTrigger,
      };
    }
    return null;
  };
  //endregion
  //region 显示/隐藏, 触发器
  function showTrigger() {
    stopCheck();
    if (trigger() === 'click' && hideOnClick()) {
      toggle();
    } else {
      show();
    }
  }
  function hideTrigger() {
    if (trigger() === 'hover' && interactive()) {
      startCheck();
    } else {
      hide();
    }
  }
  //endregion
  //region 可交互范围检查
  let cache: Cache | (() => Cache) = function () {
    const { run, pending, cancel } = throttle((e: MouseEvent) => {
      const isOutside = floatingRef.value.isOutside(e);
      if (hideCondition ? hideCondition(isOutside) : isOutside) {
        hide();
      }
    });
    const [onCheckInside, offCheckInside] = bindEvent('mousemove', run, {
      passive: true,
    });
    return {
      pending,
      cancel,
      onCheckInside,
      offCheckInside,
    };
  };
  function startCheck() {
    if (visible() && !isDestroy) {
      if (typeof cache === 'function') {
        cache = cache();
      }
      cache.onCheckInside();
    }
  }
  function stopCheck() {
    if (typeof cache !== 'function') {
      cache.pending() && cache.cancel();
      cache.offCheckInside();
    }
  }
  //endregion
  let isDestroy = false;
  onUnmounted(() => {
    isDestroy = true;
    stopCheck();
  });
  return {
    referenceRef,
    floatingRef,
    visible,
    initShow,
    exist,
    referenceListenersFn,
    mouseenterFn: stopCheck,
    mouseleaveFn() {
      if (trigger() === 'hover' && interactive()) {
        startCheck();
      }
    },
    show,
    hide,
    toggle,
    showTrigger,
    hideTrigger,
  };
}
