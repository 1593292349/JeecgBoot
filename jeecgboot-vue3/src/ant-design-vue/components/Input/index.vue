<template>
  <Input ref="rawRef" v-bind="mergedAttrs">
    <template v-for="slotName in remainSlots()" #[slotName]="optionsSlotScope">
      <slot :name="slotName" v-bind="optionsSlotScope || {}"></slot>
    </template>
    <template
		v-if="preIcon || prefix || $slots.prefix"
		#prefix
	>
      <slot name="prefix">
        <component :is="iconComponent" v-if="preIcon" :icon="preIcon" class="icon" />
        {{ prefix }}
      </slot>
    </template>
    <template
		v-if="postIcon || suffix || $slots.suffix"
		#suffix
	>
      <slot name="suffix">
        {{ suffix }}
        <component :is="iconComponent" v-if="postIcon" :icon="postIcon" class="icon" />
      </slot>
    </template>
  </Input>
</template>

<script setup lang="ts" name="EosEN-Input">
  import { useSlots, useAttrs, computed, ref, defineAsyncComponent } from 'vue';
  import { Input } from 'ant-design-vue';
  import getCache from './cache';
  // 使用动态导入避免初始化冲突
  const iconComponent = defineAsyncComponent(() => import('/@/components/Icon/src/Icon.vue'));

  defineOptions({
    inheritAttrs: false,
  });
  withDefaults(
    defineProps<{
      preIcon?: string;
      prefix?: string;
      postIcon?: string;
      suffix?: string;
    }>(),
    {}
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
    const result: Record<string, any> = {
      ...attrs,
    };
    return result;
  });
  //endregion
  //region 创建代理对象暴露所有方法
  const rawRef = ref();
  const data = {
    focus: null,
    blur: null,
    input: null,
    setSelectionRange: null,
    select: null,
  };
  const exposeMethods = new Proxy(data, {
    get(_, prop) {
      return rawRef.value?.[prop];
    },
  });
  defineExpose(exposeMethods);
  //endregion
</script>

<style scoped>
  .icon {
    font-size: 20px !important;
  }
</style>