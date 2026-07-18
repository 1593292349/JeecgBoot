<template>
  <Select ref="rawRef" v-bind="mergedAttrs">
    <template v-for="slotName in remainSlots()" #[slotName]="optionsSlotScope">
      <slot :name="slotName" v-bind="optionsSlotScope || {}"></slot>
    </template>
  </Select>
</template>

<script setup lang="ts" name="EosEN-Select">
  import { useSlots, useAttrs, computed, ref } from 'vue';
  import { Select } from 'ant-design-vue';
  import getCache from './cache';
  import usePopupContainer from '/@/ant-design-vue/composables/usePopupContainer/index';
  import useDropdownVisibleChange from '/@/ant-design-vue/composables/useDropdownVisibleChange/index';

  defineOptions({
    inheritAttrs: false,
  });
  const props = withDefaults(
    defineProps<{
      fieldNames?: {
        label?: string;
        value?: string;
        options?: string;
      };
      autoPopup?: boolean;
      getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
    }>(),
    {
      autoPopup: true,
    }
  );

  const { usedSlots } = getCache();

  const dropdownVisibleProps = useDropdownVisibleChange();
  //region 弹出位置
  const getPopupContainer = usePopupContainer({
    autoPopup() {
      return props.autoPopup;
    },
    getPopupContainer() {
      return props.getPopupContainer;
    },
  });
  //endregion
  //region 插槽
  const slots = useSlots();
  const remainSlots = () => {
    return Object.keys(slots).filter((slotName) => {
      return !usedSlots.has(slotName);
    });
  };
  //endregion
  //region 属性
  const attrs = useAttrs();
  const mergedAttrs = computed(() => {
    const { fieldNames } = props;
    const result: Record<string, any> = {
      ...attrs,
      ...dropdownVisibleProps.value,
      fieldNames,
    };
    if (!('optionFilterProp' in result)) {
      if (typeof fieldNames?.label === 'string') {
        result.optionFilterProp = fieldNames.label;
      } else {
        result.optionFilterProp = 'label';
      }
    }
    if (getPopupContainer.value) {
      result.getPopupContainer = getPopupContainer.value;
    }
    return result;
  });
  //endregion
  //region 创建代理对象暴露所有方法
  const rawRef = ref();
  const data = {
    focus: null,
    blur: null,
    scrollTo: null,
  };
  const exposeMethods = new Proxy(data, {
    get(_, prop) {
      return rawRef.value?.[prop];
    },
  });
  defineExpose(exposeMethods);
  //endregion
</script>

<style lang="less">
  //region 全局样式
  //.ant-select-dropdown {
  //  .ant-select-item {
  //    color: @eosen-hint-color;
  //  }
  //  .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
  //    color: #fff;
  //  }
  //}
  //
  //html[data-theme='light'] .ant-select-multiple .ant-select-selection-item-content {
  //  color: @eosen-hint-color;
  //}
  //endregion
</style>
