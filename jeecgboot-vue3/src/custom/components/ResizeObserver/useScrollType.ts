import type { Ref } from 'vue';
import { onMounted } from 'vue';
import { throttle, operateDom } from '/@/custom/function';

export default function (
  expandDom: Ref<HTMLElement | undefined>,
  shrinkDom: Ref<HTMLElement | undefined>,
  getSizeObject: () => void,
  time: number | false
): () => void {
  const operateDomVal = operateDom(() => {
    getSizeObject();
    const expand = expandDom.value;
    const shrink = shrinkDom.value;
    if (expand && shrink) {
      expand.scrollLeft = shrink.scrollLeft = 1e8;
      expand.scrollTop = shrink.scrollTop = 1e8;
    }
  });
  let emitEvent;
  if (time === false) {
    emitEvent = operateDomVal.run;
  } else {
    const throttleVal = throttle(operateDomVal.run, time || undefined);
    emitEvent = throttleVal.run;
  }
  onMounted(emitEvent);
  return emitEvent;
}
