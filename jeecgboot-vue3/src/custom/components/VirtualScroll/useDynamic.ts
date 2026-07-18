import type { RelativePosition } from '/@/custom/type';
import type { DataList, Info } from './type';
import { customRef, shallowRef, watchEffect } from 'vue';
import { lazyTask } from '/@/custom/function';

const bucketLength = 1000;
export default function (
  props: {
    minSize: number;
    preload: number;
    viewSize: number;
    scrollOffset: number;
  },
  dataList: DataList,
  emit: {
    (e: 'size-compute', change: boolean): void;
  }
) {
  const dataLen = shallowRef(0);
  const scrollSize = shallowRef(0);
  const offset = shallowRef(0);
  const start = shallowRef(0);
  const end = shallowRef(0);
  let lastStart = 0;
  let lastEnd = 0;
  //region 缓存
  const sizeCaches = customRef((track, trigger) => {
    const cache: number[] = [];
    const bucketCache: number[] = [];
    let defaultSize = 0;
    let change = false;
    const afterSetSize = lazyTask(() => {
      if (change) {
        trigger();
      }
      emit('size-compute', change);
      change = false;
    });
    //region 获取缓存大小
    function getSize(index: number) {
      let size = cache[index];
      if (size == null) {
        size = defaultSize;
        cache[index] = size;
      }
      return size;
    }
    function getBucketSize(index: number) {
      let bucketSize = bucketCache[index];
      if (bucketSize == null) {
        bucketSize = defaultSize * bucketLength;
        bucketCache[index] = bucketSize;
      }
      return bucketSize;
    }
    //endregion
    const obj = {
      //region 遍历器
      *loopBucket(start = 0, end = bucketCache.length) {
        track();
        while (start < end) {
          yield [start, getBucketSize(start)];
          ++start;
        }
      },
      *loop(start = 0, end = cache.length) {
        track();
        while (start < end) {
          yield [start, getSize(start)];
          ++start;
        }
      },
      getSize,
      //endregion
      //region 缓存实际大小
      setSize(index: number, size: number) {
        const oldSize = getSize(index);
        if (oldSize !== size) {
          const bucketIndex = Math.floor(index / bucketLength);
          bucketCache[bucketIndex] = getBucketSize(bucketIndex) + size - oldSize;
          cache[index] = size;
          change = true;
        }
        afterSetSize();
      },
      //endregion
      //region 设置数据信息
      setDefaultSize(minSize: number) {
        if (defaultSize !== minSize) {
          defaultSize = minSize;
          cache.length = 0;
          bucketCache.length = 0;
        }
      },
      setLength(len: number) {
        if (cache.length !== len) {
          cache.length = len;
          bucketCache.length = Math.floor(len / bucketLength);
          const lastBucketSize = len % bucketLength;
          if (lastBucketSize !== 0) {
            let sum = 0;
            for (let i = 1; i <= lastBucketSize; ++i) {
              sum += getSize(len - i);
            }
            bucketCache.push(sum);
          }
          trigger();
        }
      },
      //endregion
    };
    return {
      get() {
        return obj;
      },
      set() {},
    };
  }).value;
  //endregion
  watchEffect(() => {
    sizeCaches.setDefaultSize(props.minSize);
    const len = dataList.size;
    dataLen.value = len;
    sizeCaches.setLength(len);
  });
  //region 计算显示区域,偏移距离,滚动高度等
  watchEffect(() => {
    let itemTop = 0;
    let startIndex: number | undefined;
    let endIndex: number | undefined;
    const { viewSize, scrollOffset } = props;
    if (!viewSize) {
      startIndex = endIndex = 0;
    }
    const len = dataLen.value;
    for (const [bucketIndex, bucket] of sizeCaches.loopBucket()) {
      const curBucketBottom = itemTop + bucket;
      if (startIndex === undefined && curBucketBottom > scrollOffset) {
        for (const [itemIndex, size] of sizeCaches.loop(bucketIndex * bucketLength)) {
          const curItemBottom = itemTop + size;
          if (startIndex === undefined && curItemBottom >= scrollOffset) {
            startIndex = itemIndex;
          }
          if (endIndex === undefined && curItemBottom > scrollOffset + viewSize) {
            endIndex = itemIndex + 1;
            break;
          }
          itemTop = curItemBottom;
        }
      }
      itemTop = curBucketBottom;
    }
    if (startIndex === undefined) {
      startIndex = len;
    }
    if (endIndex === undefined) {
      endIndex = len;
    }
    scrollSize.value = itemTop;
    if (lastStart > startIndex || lastEnd < endIndex) {
      const { preload } = props;
      startIndex = Math.max(startIndex - preload, 0);
      endIndex = Math.min(endIndex + preload, len);
      let offsetVal = 0;
      const bucketIndex = Math.floor(startIndex / bucketLength);
      for (const [, bucket] of sizeCaches.loopBucket(0, bucketIndex)) {
        offsetVal += bucket;
      }
      for (const [, size] of sizeCaches.loop(bucketIndex * bucketLength, startIndex)) {
        offsetVal += size;
      }
      offset.value = offsetVal;
      start.value = lastStart = startIndex;
      end.value = lastEnd = endIndex;
    }
  });
  //endregion
  //region 获取指定项信息
  function getInfo(index: number, pos: RelativePosition = 'start'): Info {
    if (index < 0 || index > dataLen.value - 1) {
      throw new Error('索引越界!');
    }
    let offset = 0;
    const bucketIndex = Math.floor(index / bucketLength);
    for (const [, bucket] of sizeCaches.loopBucket(0, bucketIndex)) {
      offset += bucket;
    }
    for (const [, size] of sizeCaches.loop(bucketIndex * bucketLength, index)) {
      offset += size;
    }
    const itemSize = sizeCaches.getSize(index);
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
    setSize(index: number, size: number) {
      sizeCaches.setSize(index, size);
    },
    scrollSize,
    offset,
    start,
    end,
    getInfo,
  };
}
