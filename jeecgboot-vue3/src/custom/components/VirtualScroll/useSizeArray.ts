import type { RelativePosition } from '/@/custom/type';
import type { DataList, Info } from './type';
import { shallowRef, watchEffect } from 'vue';

export default function (
  props: {
    minSize: number;
    sizeArray?: number[];
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
    const { minSize, viewSize, scrollOffset, sizeArray = [] } = props;
    const length = dataList.size;
    let startIndex: number | undefined;
    let endIndex: number | undefined;
    let itemTop = 0;
    let itemBottom = 0;
    let offsetSize = 0;
    for (let i = 0; i < length; ++i) {
      itemBottom += sizeArray[i] ?? minSize;
      if (startIndex === undefined && itemBottom > scrollOffset) {
        startIndex = i;
        offsetSize = itemTop;
      }
      if (endIndex === undefined && itemBottom > scrollOffset + viewSize) {
        endIndex = i + 1;
      }
      itemTop = itemBottom;
    }
    if (startIndex === undefined) {
      startIndex = length;
      offsetSize = itemBottom;
    }
    if (endIndex === undefined) {
      endIndex = length;
    }
    scrollSize.value = itemBottom;
    if (lastStart > startIndex! || lastEnd < endIndex!) {
      const { preload } = props;
      for (let i = 1; i <= preload; ++i) {
        const index = startIndex! - i;
        if (index < 0) {
          break;
        }
        offsetSize -= sizeArray[index] ?? minSize;
      }
      startIndex = Math.max(startIndex! - preload, 0);
      endIndex = Math.min(endIndex! + preload, length);
      offset.value = offsetSize;
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
    const { minSize, sizeArray = [] } = props;
    let offset = 0;
    for (let i = 0; i < index; ++i) {
      offset += sizeArray[i] ?? minSize;
    }
    const itemSize = sizeArray[index] ?? minSize;
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
