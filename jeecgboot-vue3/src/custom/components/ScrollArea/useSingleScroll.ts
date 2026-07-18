import type { Axis } from '/@/custom/type';
import type { Ref } from 'vue';
import { shallowRef, computed } from 'vue';
import useMousemove from '/@/custom/composables/useMousemove/index';
import { createMouseEvent, platform, numberBetween } from '/@/custom/function';

//region 类型声明
type KindInfo = {
  [key in Axis]: {
    posProp: 'left' | 'top';
    sizeProp: 'width' | 'height';
    offsetProp: 'clientX' | 'clientY';
    offsetProp2: 'offsetX' | 'offsetY';
    scrollProp: 'scrollLeft' | 'scrollTop';
  };
};
interface UseSingleScrollParam {
  props: {
    delay?: number;
    visible?: boolean | null;
  };
  containerSize: Ref<number>;
  scrollSize: Ref<number>;
  position: Ref<number>;
  passThumbStyle: Ref<any>;
  hover: Ref<boolean>;
  containerRef: Ref<HTMLElement | undefined>;
  thumbRef: Ref<HTMLElement | undefined>;
  type: Axis;
}
//endregion
//region 分类信息
const info: KindInfo = {
  x: {
    posProp: 'left',
    sizeProp: 'width',
    offsetProp: 'clientX',
    offsetProp2: 'offsetX',
    scrollProp: 'scrollLeft',
  },
  y: {
    posProp: 'top',
    sizeProp: 'height',
    offsetProp: 'clientY',
    offsetProp2: 'offsetY',
    scrollProp: 'scrollTop',
  },
};
//endregion
export default function ({ props, containerSize, scrollSize, position, passThumbStyle, hover, containerRef, thumbRef, type }: UseSingleScrollParam) {
  const { posProp, sizeProp, offsetProp, offsetProp2, scrollProp } = info[type];
  const tempShowing = shallowRef(false);
  const panning = shallowRef(false);
  //region 滚动条可见
  const visible = computed<boolean>(() => {
    return (props.visible == null ? hover.value : props.visible) || panning.value || tempShowing.value;
  });
  //endregion
  //region 滚动百分比
  const percentage = computed<number>(() => {
    const diff = scrollSize.value - containerSize.value;
    if (diff <= 0) {
      return 0;
    }
    return numberBetween(position.value / diff, 0, 1);
  });
  //endregion
  //region 滚动条大小
  const thumbSize = computed<number>(() => {
    const maxSize = containerSize.value;
    return numberBetween(Math.round((maxSize * maxSize) / scrollSize.value), maxSize >= 60 ? 30 : Math.ceil(maxSize / 2), maxSize);
  });
  //endregion
  //region 滚动比例因子
  const scale = computed<number>(() => {
    return (scrollSize.value - containerSize.value) / (containerSize.value - thumbSize.value);
  });
  //endregion
  //region 滚动条类名及样式
  const barClass = () => {
    return `pf-ScrollArea_bar pf--direction-${type}` + (visible.value ? '' : ' pf--hidden');
  };
  const thumbClass = () => {
    return `pf-ScrollArea_thumb pf--direction-${type}` + (visible.value ? '' : ' pf--hidden');
  };
  const thumbStyle = computed(() => {
    const size = thumbSize.value;
    return {
      ...passThumbStyle.value,
      [posProp]: Math.round(percentage.value * (containerSize.value - size)) + 'px',
      [sizeProp]: size + 'px',
    };
  });
  //endregion
  //region 拖拽滚动条
  const panInfo = {
    offset: 0,
    lastOffset: 0,
    position: 0,
  };
  function setScroll(offset: number) {
    containerRef.value![scrollProp] = Math.round(panInfo.position + (offset - panInfo.offset) * scale.value);
  }
  const panStartFn = useMousemove({
    cursor: 'grabbing',
    start(e) {
      const offset = e[offsetProp];
      panInfo.lastOffset = panInfo.offset = offset;
      panInfo.position = position.value;
      panning.value = true;
    },
    end() {
      panning.value = false;
    },
    move(e) {
      const offset = e[offsetProp];
      if (panInfo.lastOffset !== offset) {
        panInfo.lastOffset = offset;
        if (platform.ie) {
          setScroll(offset);
        } else {
          self.setTimeout(setScroll, 0, offset);
        }
      }
    },
  });
  //endregion
  //region 滚动到点击位置
  const scrollToFn = function (e: MouseEvent) {
    const toPosition = Math.round((e[offsetProp2] - thumbSize.value / 2) * scale.value);
    containerRef.value![scrollProp] = toPosition;
    position.value = toPosition;
    thumbRef.value!.dispatchEvent(createMouseEvent(e.type, e));
  };
  //endregion
  //region 滚动条延时消失
  let timer: number;
  const startTimerFn = function () {
    if (tempShowing.value) {
      self.clearTimeout(timer);
    } else {
      tempShowing.value = true;
    }
    timer = self.setTimeout(() => {
      tempShowing.value = false;
    }, props.delay);
  };
  //endregion
  return {
    visible,
    percentage,
    thumbSize,
    barClass,
    thumbClass,
    thumbStyle,
    panStartFn,
    scrollToFn,
    startTimerFn,
  };
}
