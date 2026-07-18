<template>
  <div :ref="refGetter" class="pf-ResizeObserver">
    <template v-if="!hasObserver">
      <div ref="expandRef" class="pf-ResizeObserver_expand" @scroll.passive="emitEvent">
        <div></div>
      </div>
      <div ref="shrinkRef" class="pf-ResizeObserver_shrink" @scroll.passive="emitEvent">
        <div></div>
      </div>
    </template>
    <slot v-bind="containerSize"></slot>
  </div>
</template>

<script setup lang="ts">
  import type { Ref } from 'vue';
  import type { SizeObject } from './type';
  import { shallowRef, onActivated, onDeactivated } from 'vue';
  import getCache from './cache';
  import useScrollType from './useScrollType';
  import useObserver from './useObserver';

  const { hasObserver } = getCache();

  const emit = defineEmits<{
    (e: 'resize', size: SizeObject): void;
    (e: 'ref:root', size: HTMLElement): void;
  }>();
  const props = withDefaults(
    defineProps<{
      throttle?: number | false;
    }>(),
    {
      throttle: false,
    }
  );
  //region 获取当前容器大小, 并发射resize事件
  const containerSize = shallowRef<SizeObject>({
    width: 0,
    height: 0,
  });
  const rootRef = shallowRef<HTMLElement>();
  function refGetter(el: HTMLElement) {
    rootRef.value = el;
    emit('ref:root', el);
  }
  const getSizeObject = () => {
    if (!rootRef.value?.parentNode || !alive) {
      return;
    }
    const { offsetWidth, offsetHeight } = rootRef.value;
    const { width, height } = containerSize.value;
    if (width !== offsetWidth || height !== offsetHeight) {
      const newSize = {
        width: offsetWidth,
        height: offsetHeight,
      };
      containerSize.value = newSize;
      emit('resize', newSize);
    }
  };
  let alive = true;
  onActivated(() => {
    alive = true;
  });
  onDeactivated(() => {
    alive = false;
  });
  //endregion
  let expandRef: Ref<HTMLElement | undefined>;
  let shrinkRef: Ref<HTMLElement | undefined>;
  let emitEvent: () => void;
  if (hasObserver) {
    useObserver(rootRef, getSizeObject, props.throttle);
  } else {
    expandRef = shallowRef<HTMLElement>();
    shrinkRef = shallowRef<HTMLElement>();
    emitEvent = useScrollType(expandRef, shrinkRef, getSizeObject, props.throttle);
  }
  //region 导出的内容
  defineExpose({
    getSize(): SizeObject {
      getSizeObject();
      return containerSize.value;
    },
  });
  //endregion
</script>

<style lang="less">
  //region 样式
  .pf-ResizeObserver {
    position: relative;
  }
  .pf-ResizeObserver_expand,
  .pf-ResizeObserver_shrink {
    display: block;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
    z-index: -9999;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
    > div {
      transition: 0s;
      animation: none;
    }
  }
  .pf-ResizeObserver_expand {
    > div {
      width: 10000000px;
      height: 10000000px;
    }
  }
  .pf-ResizeObserver_shrink {
    > div {
      width: 200%;
      height: 200%;
    }
  }
  //endregion
</style>
