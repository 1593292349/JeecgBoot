import type { Ref } from 'vue';
import { onMounted, onBeforeUnmount } from 'vue';
import { throttle, operateDom } from '/@/custom/function';

export default function (rootDom: Ref<HTMLElement | undefined>, getSizeObject: () => void, time: number | false) {
  const operateDomVal = operateDom(getSizeObject);
  let emitEvent;
  if (time === false) {
    emitEvent = operateDomVal.run;
  } else {
    const throttleVal = throttle(operateDomVal.run, time || undefined);
    emitEvent = throttleVal.run;
  }
  const observer = new ResizeObserver(emitEvent);
  onMounted(() => {
    if (rootDom.value) {
      observer.observe(rootDom.value, { box: 'border-box' });
    }
  });
  onBeforeUnmount(() => {
    observer.disconnect();
  });
}
