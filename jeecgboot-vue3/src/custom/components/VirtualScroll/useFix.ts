import type { RelativePosition } from '/@/custom/type';
import type { DataList, Info } from './type';
import { shallowRef, watchEffect } from 'vue';

export default function (
  props: {
    minSize: number;
    preload: number;
    viewSize: number;
    scrollOffset: number;
  },
  dataList: DataList
) {
  const scrollSize = shallowRef(0);
  const offset = shallowRef(0);
  const start = shallowRef(0);
  const end = shallowRef(0);
  let lastStart = 0;
  let lastEnd = 0;
  //region 计算显示区域,偏移距离,滚动高度等
  watchEffect(() => {
    const { minSize, viewSize, scrollOffset } = props;
    const length = dataList.size;
    let startIndex = Math.max(Math.floor(scrollOffset / minSize), 0);
    let endIndex = Math.max(Math.ceil((scrollOffset + viewSize) / minSize), 0);
    scrollSize.value = length * minSize;
    if (lastStart > startIndex || lastEnd < endIndex) {
      const { preload } = props;
      startIndex = Math.max(startIndex - preload, 0);
      endIndex = Math.min(endIndex + preload, length);
      offset.value = startIndex * minSize;
      start.value = lastStart = startIndex;
      end.value = lastEnd = endIndex;
    }
  });
  //endregion
  //region 获取指定项信息
  function getInfo(index: number, pos: RelativePosition = 'start'): Info {
    if (index < 0 || index > dataList.size - 1) {
      throw new Error('索引越界!');
    }
    const { minSize: itemSize } = props;
    let offset = index * itemSize;
    if (pos !== 'start') {
      const height = props.viewSize - itemSize;
      if (pos === 'center') {
        if (height > 0) {
          offset -= Math.round(height / 2);
        }
      } else {
        offset -= height;
      }
    }
    return {
      offset,
      itemSize,
    };
  }
  //endregion
  return {
    scrollSize,
    offset,
    start,
    end,
    getInfo,
  };
}
