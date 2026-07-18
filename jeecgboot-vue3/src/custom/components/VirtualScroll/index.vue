<template>
  <div class="pf-VirtualScroll" :style="containerStyle()">
    <div class="pf-VirtualScroll_view" :style="viewStyle()">
      <template v-for="obj in renderData">
        <slot v-if="typeof obj !== 'number'" v-bind="obj" :set-size="setSize"></slot>
        <div v-else :key="obj"></div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { FieldGetter, Axis, RelativePosition } from '/@/custom/type';
  import type { Type, Data, ItemScope, DataList, Scope, DataFn, Info } from './type';
  import type { Ref } from 'vue';
  import { computed, customRef } from 'vue';
  import getCache from './cache';
  import useDynamic from './useDynamic';
  import useFix from './useFix';
  import useSizeArray from './useSizeArray';
  /**
   * fixme 插槽存在重复渲染问题
   * 虚拟滚动组件
   * @author 唐国雄
   * @date 2022/9/15
   * 属性----------------------
   * :type			类型
   * :data			列表数据
   * :total			当 data 为函数类型时, 标识数据总量
   * :data-map		映射数据
   * :direction		滚动方向
   * :min-size		最小尺寸
   * :size-array		数据的大小信息
   * :preload			预加载数量
   * :view-size		视口大小
   * :scroll-offset	滚动距离
   * 事件----------------------
   * @size-compute	显示数据变化, 重新计算虚拟总大小
   * 插槽----------------------
   * #default			必须为组件且加key(否则可能有性能问题)
   * 方法----------------------
   * getInfo(index,pos?)	获取滚动距离和项目大小等信息
   */
  const { infos } = getCache();

  const emit = defineEmits<{
    (e: 'size-compute', change: boolean): void;
  }>();
  const props = withDefaults(
    defineProps<{
      type?: Type;
      data: Data;
      total?: number;
      dataMap?: FieldGetter<ItemScope, Record<string, unknown>>;
      direction?: Axis;
      minSize?: number;
      sizeArray?: number[];
      preload?: number;
      viewSize: number;
      scrollOffset: number;
    }>(),
    {
      type: 'dynamic',
      total: 0,
      direction: 'y',
      minSize: 24,
      preload: 4,
    }
  );

  //region 列表数据
  const dataList = customRef<DataList>((track, trigger) => {
    //要求数据的范围
    let lastScope: Scope | undefined;
    let lastList: unknown[] | undefined;
    //region 计算请求分段
    function getPartList(oldScope?: Scope) {
      const scope = lastScope!;
      const multiPart: Scope[] = [];
      if (oldScope) {
        const { start, end } = scope;
        const { start: curStart, end: curEnd } = oldScope;
        //上一页有数据
        if (start < curStart) {
          if (end <= curStart) {
            //没有交集的全新请求
            return scope;
          }
          multiPart.push({
            start,
            end: curStart,
          });
        }
        //下一页有数据
        if (end > curEnd) {
          if (start >= curEnd) {
            //没有交集的全新请求
            return scope;
          }
          multiPart.push({
            start: curEnd,
            end,
          });
        }
      } else {
        //首次请求
        return scope;
      }
      return multiPart;
    }
    //endregion
    //region 装载数据
    function patchData(list: unknown[], scope: Scope) {
      const { start: dataStart, end: dataEnd } = scope;
      const { start: lastStart, end: lastEnd } = lastScope!;
      const start = Math.max(dataStart, lastStart);
      const end = Math.min(dataEnd, lastEnd);
      if (start >= end) {
        return false;
      }
      for (let i = start; i < end; ++i) {
        lastList![i - lastStart] = list[i - dataStart];
      }
      return true;
    }
    //endregion
    //region 请求数据
    function queryList(fn: DataFn, scope: Scope) {
      Promise.resolve(fn(scope)).then((result) => {
        if (patchData(result, scope)) {
          trigger();
        }
      });
    }
    //endregion
    const obj: DataList = {
      getData(scope) {
        if (scope.end - scope.start <= 0) {
          return [];
        }
        const { data } = props;
        if (typeof data === 'function') {
          const oldScope = lastScope;
          const oldList = lastList;
          lastScope = scope;
          lastList = new Array(lastScope.end - lastScope.start);
          lastList.fill(undefined);
          const partList = getPartList(oldScope);
          if (Array.isArray(partList)) {
            if (oldList && oldScope) {
              patchData(oldList, oldScope);
            }
            for (const part of partList) {
              queryList(data, part);
            }
          } else {
            //与之前数据无交集
            queryList(data, partList);
          }
          track();
          return lastList;
        } else {
          return data.slice(scope.start, scope.end);
        }
      },
      //region 数据总量
      get size() {
        const { data } = props;
        return typeof data === 'function' ? props.total : data.length;
      },
      //endregion
    };
    //region 返回
    return {
      get() {
        return obj;
      },
      set() {},
    };
    //endregion
  }).value;
  //endregion
  //region 核心数据
  let scrollSize: Ref<number>;
  let offset: Ref<number>;
  let start: Ref<number>;
  let end: Ref<number>;
  let getInfo: (index: number, pos?: RelativePosition) => Info;
  let setSize: (index: number, size: number) => void;
  if (props.type === 'sizeArray') {
    ({ scrollSize, offset, start, end, getInfo } = useSizeArray(props, dataList));
  } else if (props.type === 'fix') {
    ({ scrollSize, offset, start, end, getInfo } = useFix(props, dataList));
  } else {
    ({ setSize, scrollSize, offset, start, end, getInfo } = useDynamic(props, dataList, emit));
  }
  //endregion
  //region 样式
  const containerStyle = () => {
    return {
      [infos[props.direction].size]: scrollSize.value + 'px',
    };
  };
  const viewStyle = () => {
    const { transform, direction } = infos[props.direction];
    return {
      [transform]: offset.value + 'px',
      flexDirection: direction,
    };
  };
  //endregion
  //region 显示数据
  const renderData = computed(() => {
    const startVal = start.value;
    const { dataMap } = props;
    return dataList
      .getData({
        start: startVal,
        end: end.value,
      })
      .map((item, index) => {
        if (item === undefined) {
          return index + startVal;
        }
        const scopeData = {
          item,
          index: index + startVal,
        };
        if (dataMap) {
          return dataMap(scopeData);
        }
        return scopeData;
      });
  });
  //endregion
  //region 导出的内容
  defineExpose({
    getInfo,
  });
  //endregion
</script>

<style lang="less">
  //region 样式
  .pf-VirtualScroll {
    position: relative;
    overflow: hidden;
  }
  .pf-VirtualScroll_view {
    display: flex;
    position: relative;
    > * {
      flex-shrink: 0;
    }
  }
  //endregion
</style>
