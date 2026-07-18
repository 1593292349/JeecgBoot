import type { Param } from './type';
import { shallowRef, watch } from 'vue';

export default function ({ showCondition, onVisibleChange }: Param) {
  let isFirst = true;
  const exist = shallowRef(false);
  const initShow = shallowRef(false);
  watch(
    showCondition,
    (visible) => {
      if (onVisibleChange) {
        onVisibleChange(visible, isFirst);
      }
      if (visible) {
        initShow.value = isFirst;
        exist.value = true;
      }
      isFirst = false;
    },
    {
      immediate: true,
    }
  );
  return {
    exist,
    initShow,
  };
}
