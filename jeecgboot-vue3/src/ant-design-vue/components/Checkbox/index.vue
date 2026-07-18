<template>
  <Checkbox ref="rawRef" v-bind="mergedAttrs">
    <template v-for="slotName in remainSlots()" #[slotName]="optionsSlotScope">
      <slot :name="slotName" v-bind="optionsSlotScope || {}"></slot>
    </template>
  </Checkbox>
</template>

<script setup lang="ts" name="EosEN-Checkbox">
  import { useSlots, useAttrs, computed, ref } from 'vue';
  import { Checkbox } from 'ant-design-vue';
  import getCache from './cache';

  defineOptions({
    inheritAttrs: false,
  });
  const props = withDefaults(
    defineProps<{
      checked?: boolean | 'indeterminate';
    }>(),
    {
      checked: false,
    }
  );

  const { usedSlots } = getCache();

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
    const { checked } = props;
    const result: Record<string, unknown> = {
      ...attrs,
      checked: checked === true,
    };
    if (checked === 'indeterminate' && !('indeterminate' in result)) {
      result.indeterminate = true;
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
