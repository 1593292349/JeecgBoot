import type { BasicTableProps, TableRowSelection, BasicColumn } from '../types/table';
import type { Ref, ComputedRef, Slots } from 'vue';
import { computed, unref, ref, shallowRef, nextTick, watch } from 'vue';
import { getViewportOffset } from '/@/utils/domUtils';
import { useWindowSizeFn } from '/@/hooks/event/useWindowSizeFn';
import { useModalContext } from '/@/components/Modal';
import { onMountedOrActivated } from '/@/hooks/core/onMountedOrActivated';
import { useDebounceFn } from '@vueuse/core';
import componentSetting from '/@/settings/componentSetting';

export function useTableScroll(
  propsRef: ComputedRef<BasicTableProps>,
  tableElRef: Ref<ComponentRef>,
  columnsRef: ComputedRef<BasicColumn[]>,
  rowSelectionRef: ComputedRef<TableRowSelection<any> | null>,
  getDataSourceRef: ComputedRef<Recordable[]>,
  slots: Slots,
  getPaginationInfo: ComputedRef<any>,
  fullHeight: Ref<number>,
) {
  const fixHeight = shallowRef(0);
  watch(
    () => {
      if (propsRef.value.height && fullHeight.value) {
        return propsRef.value.height - fullHeight.value;
      }
      return 0;
    },
    (diff) => {
      if (diff) {
        if (fixHeight.value) {
          fixHeight.value += diff;
        } else {
          fixHeight.value = diff;
        }
        calcTableHeight();
      }
    }
  );

  const tableHeightRef: Ref<Nullable<number>> = ref(null);

  const modalFn = useModalContext();

  // Greater than animation time 280
  const debounceRedoHeight = useDebounceFn(redoHeight, 100);

  const getCanResize = computed(() => {
    const { canResize, scroll } = unref(propsRef);
    return canResize && !(scroll || {}).y;
  });

  watch(
    () => [unref(getCanResize), unref(getDataSourceRef)?.length],
    () => {
      debounceRedoHeight();
    },
    {
      flush: 'post',
    }
  );

  function redoHeight() {
    nextTick(() => {
      calcTableHeight();
    });
  }

  function setHeight(heigh: number) {
    tableHeightRef.value = heigh;
    //  Solve the problem of modal adaptive height calculation when the form is placed in the modal
    modalFn?.redoModalHeight?.();
  }

  // No need to repeat queries
  let paginationEl: HTMLElement | null;
  let footerEl: HTMLElement | null;
  let bodyEl: HTMLElement | null;

  async function calcTableHeight() {
    const { resizeHeightOffset, pagination, maxHeight, minHeight } = unref(propsRef);

    const table = unref(tableElRef);
    if (!table) return;

    const tableEl: Element = table.$el;
    if (!tableEl) return;

    if (!bodyEl) {
      // 代码逻辑说明: issues/355 前端-jeecgboot-vue3 3.4.4版本,BasicTable高度自适应功能失效,设置BasicTable组件maxHeight失效; 原因已找到,请看详情
      bodyEl = tableEl.querySelector('.ant-table-tbody');
      if (!bodyEl) return;
    }

    const hasScrollBarY = bodyEl.scrollHeight > bodyEl.clientHeight;
    const hasScrollBarX = bodyEl.scrollWidth > bodyEl.clientWidth;

    if (hasScrollBarY) {
      tableEl.classList.contains('hide-scrollbar-y') && tableEl.classList.remove('hide-scrollbar-y');
    } else {
      !tableEl.classList.contains('hide-scrollbar-y') && tableEl.classList.add('hide-scrollbar-y');
    }

    if (hasScrollBarX) {
      tableEl.classList.contains('hide-scrollbar-x') && tableEl.classList.remove('hide-scrollbar-x');
    } else {
      !tableEl.classList.contains('hide-scrollbar-x') && tableEl.classList.add('hide-scrollbar-x');
    }

    bodyEl!.style.height = 'unset';

    if (!unref(getCanResize)) return;

    await nextTick();
    //Add a delay to get the correct bottomIncludeBody paginationHeight footerHeight headerHeight

    const headEl = tableEl.querySelector('.ant-table-thead');

    if (!headEl) return;

    // Table height from bottom
    const { bottomIncludeBody } = getViewportOffset(headEl);
    // Table height from bottom height-custom offset

    const paddingHeight = 32;
    // Pager height
    let paginationHeight = 2;
    // 【issues/9217】当配置了pagination: true时,BasicTable组件自适应高度异常
    if (pagination !== false) {
      paginationEl = tableEl.querySelector('.ant-pagination') as HTMLElement;
      if (paginationEl) {
        const offsetHeight = paginationEl.offsetHeight;
        paginationHeight += offsetHeight || 0;
      } else {
        // TODO First fix 24
        paginationHeight += 24;
      }
    } else {
      paginationHeight = -8;
    }

    let footerHeight = 0;
    // 代码逻辑说明: 【issues/1137】BasicTable自适应高度计算没有减去尾部高度
    footerEl = tableEl.querySelector('.ant-table-footer');
    if (footerEl) {
      const offsetHeight = footerEl.offsetHeight;
      footerHeight = offsetHeight || 0;
    }

    let headerHeight = 0;
    if (headEl) {
      headerHeight = (headEl as HTMLElement).offsetHeight;
    }

    let height = bottomIncludeBody - (resizeHeightOffset || 0) - paddingHeight - paginationHeight - footerHeight - headerHeight;
    // update-begin--author:liaozhiyang---date:20240603---for【TV360X-861】列表查询区域不可往上滚动
    // 10+6(外层边距padding:10 + 内层padding-bottom:6)
    height -= 16;
    // 代码逻辑说明: 【issues/8880】BasicTable组件在modal中适应高度
    try {
      // 当BasicTable在BasicModal容器中时,扣减容器底部高度
      const modalFooter = tableEl.closest('.ant-modal-root')?.querySelector('.ant-modal-footer');
      if (modalFooter) {
        const { bottomIncludeBody: modalFooterHeight } = getViewportOffset(modalFooter);
        height = height - modalFooterHeight;
      }
    } catch (e) {}
    height = (height < minHeight! ? (minHeight as number) : height) ?? height;
    height = (height > maxHeight! ? (maxHeight as number) : height) ?? height;
    if (propsRef.value.height) {
      height = fixHeight.value;
    }
    setHeight(height);

    bodyEl!.style.height = `${height}px`;

    const tableBody = tableEl.querySelector('.ant-table-body') as HTMLElement;
    if(tableBody){
      tableBody.style.height = `${height}px`;
    }
  }
  useWindowSizeFn(calcTableHeight, 280);
  onMountedOrActivated(() => {
    calcTableHeight();
    nextTick(() => {
      debounceRedoHeight();
    });
  });

  const getScrollX = computed(() => {
    let width = 0;
    // if (unref(rowSelectionRef)) {
    //   width += 60;
    // }
    // 代码逻辑说明: 【issues/5411】BasicTable 配置maxColumnWidth 未生效
    const { maxColumnWidth } = unref(propsRef);
    // TODO props ?? 0;
    const NORMAL_WIDTH = maxColumnWidth ?? 150;
    // date-begin--author:liaozhiyang---date:20250716---for：【QQYUN-13122】有数十个字段时只展示2个字段，其余字段为ifShow:false会有滚动条
    const columns = unref(columnsRef).filter((item) => !(item.defaultHidden == true || item.ifShow == false))
    // date-end--author:liaozhiyang---date:20250716---for：【QQYUN-13122】有数十个字段时只展示2个字段，其余字段为ifShow:false会有滚动条
    columns.forEach((item) => {
      width += Number.parseInt(item.width as string) || 0;
    });
    const unsetWidthColumns = columns.filter((item) => !Reflect.has(item, 'width'));

    const len = unsetWidthColumns.length;
    if (len !== 0) {
      width += len * NORMAL_WIDTH;
    }
    // 代码逻辑说明: 【TV360X-116】内嵌风格字段较多时表格错位
    if (slots.expandedRowRender) {
      width += propsRef.value.expandColumnWidth;
    }
    const table = unref(tableElRef);
    const tableWidth = table?.$el?.offsetWidth ?? 0;
    return tableWidth > width ? '100%' : width;
  });

  const getScrollRef = computed(() => {
    const tableHeight = unref(tableHeightRef);
    const { canResize, scroll } = unref(propsRef);
    const { table } = componentSetting;
    return {
      x: unref(getScrollX),
      y: canResize ? tableHeight : null,
      // 代码逻辑说明: 【issues/1188】BasicTable加上scrollToFirstRowOnChange类型定义
      scrollToFirstRowOnChange: table.scrollToFirstRowOnChange,
      ...scroll,
    };
  });

  return { getScrollRef, redoHeight };
}