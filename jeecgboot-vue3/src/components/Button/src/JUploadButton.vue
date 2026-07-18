<template>
	<div>
		<Button
			:type="type"
			:class="getButtonClass"
			:disabled="props.disabled"
			@click="openModal(true, {})"
		>
			<template #default="data">
				<Icon
					:icon="preIcon"
					v-if="preIcon"
					:size="iconSize"
				/>
				<slot v-bind="data || {}"></slot>
				<Icon
					:icon="postIcon"
					v-if="postIcon"
					:size="iconSize"
				/>
			</template>
		</Button>
		<ImportModal
			:templateUrl
			:templateName
			@register="registerModal"
			@success="onClick"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
	name: 'JUploadButton',
	inheritAttrs: false,
});
</script>
<script lang="ts" setup>
import { computed } from 'vue';
import { Button } from 'ant-design-vue';
import Icon from '/@/components/Icon/src/Icon.vue';
import { buttonProps } from './props';
import { useModal } from '@/components/Modal';
import ImportModal from './ImportModal.vue';

const props = defineProps(buttonProps);

const [registerModal, { openModal: openModal }] = useModal();
const getButtonClass = computed(() => {
	const { color, disabled } = props;
	return [
		{
			[`ant-btn-${color}`]: !!color,
			[`is-disabled`]: disabled,
		},
	];
});
</script>