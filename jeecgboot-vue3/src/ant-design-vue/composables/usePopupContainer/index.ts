import type { MaybeRefOrGetter } from 'vue';
import { computed } from 'vue';
import { useModalContext } from '@/components/Modal';
import { toValue } from '/@/custom/function';

export default function ({
  autoPopup,
  getPopupContainer,
}: {
  autoPopup: MaybeRefOrGetter<boolean>;
  getPopupContainer: MaybeRefOrGetter<((triggerNode: HTMLElement) => HTMLElement) | undefined>;
}) {
  const modalFn = useModalContext();
  return computed(() => {
    const getPopupContainerVal = toValue(getPopupContainer);
    const modalId = modalFn?.uid;
    if (toValue(autoPopup) && modalId) {
      return function (triggerNode) {
        const el = document.querySelector(`.ant-modal-wrap.${modalId}`);
        return el || getPopupContainerVal?.(triggerNode);
      };
    }
    return getPopupContainerVal;
  });
}
