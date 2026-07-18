import type { ReferenceElement } from '@floating-ui/dom';
import type { Param } from './type';
import { shallowRef, watch } from 'vue';
import useLazyTransition from '../useLazyTransition';

export default function <T extends ReferenceElement = ReferenceElement>({ emitInput, value, disabled, onVisibleChange }: Param) {
  const referenceRef = shallowRef<T>();
  const floatingRef = shallowRef();
  const innerVisible = shallowRef<boolean>(false);
  //region 可见性
  const visible = () => {
    if (disabled && disabled()) {
      return false;
    }
    const _visible = value && value();
    if (_visible == null) {
      return innerVisible.value;
    }
    return _visible;
  };
  //endregion
  const { exist, initShow } = useLazyTransition({
    showCondition: visible,
    onVisibleChange,
  });
  //region 显示/隐藏
  function show(): void {
    toggle(true);
  }
  function hide(): void {
    toggle(false);
  }
  function toggle(show?: boolean) {
    if (disabled && disabled()) {
      return;
    }
    _setVisible(show == null ? !visible() : show);
  }
  if (disabled) {
    watch(disabled, (val) => {
      if (val) {
        _setVisible(false);
      }
    });
  }
  function _setVisible(show: boolean) {
    if (innerVisible.value !== show) {
      innerVisible.value = show;
    }
    if (value && value() !== show) {
      emitInput && emitInput(show);
    }
  }
  //endregion
  return {
    referenceRef,
    floatingRef,
    visible,
    initShow,
    exist,
    show,
    hide,
    toggle,
  };
}
