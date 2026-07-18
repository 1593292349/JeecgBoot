<template>
  <TimePicker ref="rawRef" v-bind="mergedAttrs">
    <template v-for="slotName in remainSlots()" #[slotName]="optionsSlotScope">
      <slot :name="slotName" v-bind="optionsSlotScope || {}"></slot>
    </template>
  </TimePicker>
</template>

<script setup lang="ts" name="EosEN-TimePicker">
  import { computed, ref, useAttrs, useSlots } from 'vue';
  import { TimePicker } from 'ant-design-vue';
  import getCache from './cache';
  import usePopupContainer from '/@/ant-design-vue/composables/usePopupContainer/index';
  import useDropdownVisibleChange from '/@/ant-design-vue/composables/useDropdownVisibleChange/index';

  defineOptions({
    inheritAttrs: false,
  });
  const props = withDefaults(
    defineProps<{
      autoPopup?: boolean;
      getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
    }>(),
    {
      autoPopup: true,
    }
  );

  const { usedSlots } = getCache();

  const dropdownVisibleProps = useDropdownVisibleChange('onOpenChange');
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
    const result: Record<string, any> = {
      ...attrs,
      ...dropdownVisibleProps.value,
    };
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
  };
  const exposeMethods = new Proxy(data, {
    get(_, prop) {
      return rawRef.value?.[prop];
    },
  });
  defineExpose(exposeMethods);
  //endregion
</script>
