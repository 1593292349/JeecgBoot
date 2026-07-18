<template>
  <ResizeObserver ref="rootRef" class="pf-ScrollArea" @mouseenter="mouseenterFn" @mouseleave="mouseleaveFn" @resize="containerResizeFn">
    <div ref="containerRef" class="pf-ScrollArea_container" @scroll.self.passive.capture="scrollFn">
      <ResizeObserver ref="scrollRef" class="pf-ScrollArea_scroll" :class="contentClass" :style="contentStyle" @resize="scrollResizeFn">
        <slot v-bind="slotScope"></slot>
      </ResizeObserver>
    </div>
    <template v-if="xScrollSize > xContainerSize">
      <div :class="xBarClass()" :style="xBarStyle" @mousedown="xScrollToFn"></div>
      <div ref="xThumbRef" :class="xThumbClass()" :style="_xThumbStyle" @mousedown="xPanStartFn"></div>
    </template>
    <template v-if="yScrollSize > yContainerSize">
      <div :class="yBarClass()" :style="yBarStyle" @mousedown="yScrollToFn"></div>
      <div ref="yThumbRef" :class="yThumbClass()" :style="_yThumbStyle" @mousedown="yPanStartFn"></div>
    </template>
  </ResizeObserver>
</template>

<script setup lang="ts">
  import type { Axis } from '/@/custom/type';
  import type { SizeObject } from '/@/custom/components/ResizeObserver/type';
  import type { DataInfo } from './type';
  import { toRef, shallowRef, computed, onActivated } from 'vue';
  import ResizeObserver from '/@/components/Eosen/ResizeObserver/index.vue';
  import useSingleScroll from './useSingleScroll';
  import { gsap } from 'gsap';
  import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
  gsap.registerPlugin(ScrollToPlugin);
  /**
   * 滚动条组件
   * @author 唐国雄
   * @date 2022/9/6
   * 属性----------------------
   * :delay				滚动条消失延时
   * :visible				手动控制滚动条是否显示
   * :x-bar-style			横向滚动槽样式
   * :x-thumb-style		横向滚动条样式
   * :y-bar-style			纵向滚动槽样式
   * :y-thumb-style		纵向滚动条样式
   * :content-class		内容 class
   * :content-style		内容 style
   * 事件----------------------
   * @container-resize	容器大小变化
   * @scroll-resize		内容大小变化
   * @scroll				发生滚动
   * 插槽----------------------
   * #default
   * 方法----------------------
   * getScrollTarget()			获取滚动dom
   * getInfo()					获取所有信息
   * setScrollPosition(type,offset,duration?)			设置滚动距离
   * setScrollPercentage(type,percentage,duration?)	设置滚动百分比
   */
  const emit = defineEmits<{
    (e: 'container-resize', size: SizeObject): void;
    (e: 'scroll-resize', size: SizeObject): void;
    (e: 'scroll', info: { x: number; y: number }): void;
  }>();
  const props = withDefaults(
    defineProps<{
      delay?: number;
      visible?: boolean | null;
      xBarStyle?: any;
      xThumbStyle?: any;
      yBarStyle?: any;
      yThumbStyle?: any;
      contentClass?: any;
      contentStyle?: any;
    }>(),
    {
      delay: 1000,
      visible: true,
    }
  );
  const hover = shallowRef(false);
  const rootRef = shallowRef<InstanceType<typeof ResizeObserver>>();
  const containerRef = shallowRef<HTMLElement>();
  const scrollRef = shallowRef<InstanceType<typeof ResizeObserver>>();
  //region 横向滚动条
  const xThumbRef = shallowRef<HTMLElement>();
  const xContainerSize = shallowRef(0);
  const xScrollSize = shallowRef(0);
  const xPosition = shallowRef(0);
  const {
    visible: xVisible,
    percentage: xPercentage,
    thumbSize: xThumbSize,
    barClass: xBarClass,
    thumbClass: xThumbClass,
    thumbStyle: _xThumbStyle,
    panStartFn: xPanStartFn,
    scrollToFn: xScrollToFn,
    startTimerFn: xStartTimerFn,
  } = useSingleScroll({
    props,
    containerSize: xContainerSize,
    scrollSize: xScrollSize,
    position: xPosition,
    passThumbStyle: toRef(props, 'xThumbStyle'),
    hover,
    containerRef,
    thumbRef: xThumbRef,
    type: 'x',
  });
  //endregion
  //region 纵向滚动条
  const yThumbRef = shallowRef<HTMLElement>();
  const yContainerSize = shallowRef(0);
  const yScrollSize = shallowRef(0);
  const yPosition = shallowRef(0);
  const {
    visible: yVisible,
    percentage: yPercentage,
    thumbSize: yThumbSize,
    barClass: yBarClass,
    thumbClass: yThumbClass,
    thumbStyle: _yThumbStyle,
    panStartFn: yPanStartFn,
    scrollToFn: yScrollToFn,
    startTimerFn: yStartTimerFn,
  } = useSingleScroll({
    props,
    containerSize: yContainerSize,
    scrollSize: yScrollSize,
    position: yPosition,
    passThumbStyle: toRef(props, 'yThumbStyle'),
    hover,
    containerRef,
    thumbRef: yThumbRef,
    type: 'y',
  });
  //endregion
  //region 插槽作用域
  const slotScope = computed<DataInfo>(() => {
    return {
      containerSize: {
        width: xContainerSize.value,
        height: yContainerSize.value,
      },
      scrollSize: {
        width: xScrollSize.value,
        height: yScrollSize.value,
      },
      thumbSize: {
        x: xThumbSize.value,
        y: yThumbSize.value,
      },
      thumbVisible: {
        x: xVisible.value,
        y: yVisible.value,
      },
      position: {
        x: xPosition.value,
        y: yPosition.value,
      },
      percentage: {
        x: xPercentage.value,
        y: yPercentage.value,
      },
    };
  });
  //endregion
  //region 更新滚动条大小和位置信息
  function scrollFn() {
    const { scrollLeft: x, scrollTop: y } = containerRef.value!;
    if (xPosition.value !== x) {
      xPosition.value = x;
      xStartTimerFn();
    }
    if (yPosition.value !== y) {
      yPosition.value = y;
      yStartTimerFn();
    }
    emit('scroll', { x, y });
  }
  function containerResizeFn(size: SizeObject) {
    const { width, height } = size;
    if (xContainerSize.value !== width) {
      xContainerSize.value = width;
    }
    if (yContainerSize.value !== height) {
      yContainerSize.value = height;
    }
    emit('container-resize', size);
  }
  function scrollResizeFn(size: SizeObject) {
    const { width, height } = size;
    if (xScrollSize.value !== width) {
      xScrollSize.value = width;
    }
    if (yScrollSize.value !== height) {
      yScrollSize.value = height;
    }
    emit('scroll-resize', size);
  }
  //endregion
  //region 设置滚动条位置
  function setScrollPosition(type: Axis, offset: number, duration?: number): Promise<void> {
    const prop = type === 'x' ? 'scrollLeft' : 'scrollTop';
    const dom = containerRef.value!;
    if (dom[prop] !== offset) {
      if (duration) {
        return new Promise((resolve, reject) => {
          gsap.to(dom, {
            duration,
            scrollTo: {
              [type]: offset,
              autoKill: true,
              onAutoKill: reject,
            },
            overwrite: true,
            onComplete: resolve,
          });
        });
      }
      dom[prop] = offset;
    }
    return Promise.resolve();
  }
  function setScrollPercentage(type: Axis, percentage: number, duration?: number): Promise<void> {
    const totalOffset = type === 'x' ? xScrollSize.value - xContainerSize.value : yScrollSize.value - yContainerSize.value;
    return setScrollPosition(type, Math.round(percentage * totalOffset), duration);
  }
  //endregion
  //region 聚焦状态
  function mouseenterFn() {
    hover.value = true;
  }
  function mouseleaveFn() {
    hover.value = false;
  }
  //endregion
  onActivated(() => {
    const { x, y } = slotScope.value.position;
    setScrollPosition('x', x);
    setScrollPosition('y', y);
  });
  //region 导出的内容
  defineExpose({
    getScrollTarget(): HTMLElement {
      return containerRef.value!;
    },
    getInfo(): DataInfo {
      scrollFn();
      rootRef.value!.getSize();
      scrollRef.value!.getSize();
      return slotScope.value;
    },
    setScrollPosition,
    setScrollPercentage,
  });
  //endregion
</script>

<style lang="less">
  //region 样式
  @content-index: 1;
  @transition: 0.3s ease;
  @bar-index: 10;
  @bar-size: 8px;
  @thumb-size: 8px;
  .pf-ScrollArea {
    position: relative;
    contain: strict;
  }
  .pf-ScrollArea_container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none;
    }
  }
  .pf-ScrollArea_scroll {
    position: absolute !important;
    //内容没有高度或者没有宽度时, 无法正常滚动
    min-height: 1px;
    min-width: 1px;
    z-index: @content-index;
  }
  .pf-ScrollArea_bar,
  .pf-ScrollArea_thumb {
    position: absolute;
    transition: opacity @transition;
    cursor: grab;
    z-index: @bar-index;
    &.pf--hidden {
      opacity: 0 !important;
      pointer-events: none;
    }
  }
  .pf-ScrollArea_bar {
    &.pf--direction-x {
      left: 0;
      right: 0;
      bottom: 0;
      height: @bar-size;
    }
    &.pf--direction-y {
      top: 0;
      bottom: 0;
      right: 0;
      width: @bar-size;
    }
  }
  .pf-ScrollArea_thumb {
    background-color: rgba(144, 147, 153, 0.3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.2);
    border-radius: 2px;
    @gap-size: ((@bar-size - @thumb-size) / 2);
    &:hover {
      background-color: @primary-color;
    }
    &:active {
      background-color: @primary-color;
    }
    &.pf--direction-x {
      bottom: @gap-size;
      height: @thumb-size;
    }
    &.pf--direction-y {
      right: @gap-size;
      width: @thumb-size;
    }
  }
  //endregion
</style>
