<template>
  <ScrollContainer
    v-bind="$attrs"
    :style="spinStyle"
    ref="wrapperRef"
    @resize="$emit('height-change', $event.height)"
    @scroll-resize="scrollSize = $event"
  >
    <div ref="spinRef" v-loading="loading" :loading-tip="loadingTip">
      <slot></slot>
    </div>
  </ScrollContainer>
</template>
<script lang="ts">
  import type { SizeObject } from '/@/custom/components/ResizeObserver/type';
  import type { CSSProperties } from 'vue';
  import { defineComponent, computed, ref, shallowRef, unref, onMounted, nextTick } from 'vue';
  import { ScrollContainer } from '/@/components/Container';
  import { createModalContext } from '../hooks/useModalContext';
  import useWindowSize from '/@/custom/composables/useWindowSize/index';

  const props = {
    loading: { type: Boolean },
    useWrapper: { type: Boolean, default: true },
    modalHeaderHeight: { type: Number, default: 57 },
    modalFooterHeight: { type: Number, default: 74 },
    minHeight: { type: Number, default: null },
    maxHeight: { type: Number, default: null },
    height: { type: Number },
    footerOffset: { type: Number, default: 0 },
    visible: { type: Boolean },
    fullScreen: { type: Boolean },
    loadingTip: { type: String },
    uid: { type: String, default: '' },
  };

  export default defineComponent({
    name: 'ModalWrapper',
    components: { ScrollContainer },
    inheritAttrs: false,
    props,
    emits: ['height-change', 'ext-height'],
    setup(props, { emit }) {
      const { windowSize } = useWindowSize({});
      const scrollSize = shallowRef<SizeObject>();
      const wrapperRef = ref<ComponentRef>(null);
      const spinRef = ref<ElRef>(null);

      createModalContext({
        redoModalHeight: setModalHeight,
        uid: props.uid,
      });

      const spinStyle = computed((): CSSProperties => {
        // 代码逻辑说明: 【QQYUN-7147】Model的高度设置不生效
        if (props.fullScreen) {
          return {
            height: `${windowSize.height - props.modalFooterHeight - props.modalHeaderHeight}px`,
          };
        } else {
          const style: CSSProperties = {
            minHeight: `${props.minHeight ?? 200}px`,
            maxHeight: `${props.maxHeight}px`,
          };
          if (props.height != undefined) {
            style.height = `${props.height}px`;
          } else if (scrollSize.value) {
            style.height = `${scrollSize.value.height}px`;
          }
          return style;
        }
      });

      onMounted(() => {
        const { modalHeaderHeight, modalFooterHeight } = props;
        emit('ext-height', modalHeaderHeight + modalFooterHeight);
      });

      async function scrollTop() {
        nextTick(() => {
          const wrapperRefDom = unref(wrapperRef);
          if (!wrapperRefDom) return;
          (wrapperRefDom as any)?.scrollTo?.(0);
        });
      }

      async function setModalHeight(option?) {
      }

      return { scrollSize, wrapperRef, spinRef, spinStyle, scrollTop, setModalHeight };
    },
  });
</script>