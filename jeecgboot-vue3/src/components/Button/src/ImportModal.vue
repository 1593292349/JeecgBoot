<template>
	<BasicModal
		v-bind="$attrs"
		title="导入"
		okText="导入"
		:width="500"
		:minHeight="0"
		:okButtonProps="{ disabled: !curFile }"
		destroyOnClose
		@register="registerModal"
		@ok="handleSubmit">
		<div class="line count">
			<div class="label">请先点击【模板下载】按钮下载导入模板：</div>
			<a-button type="primary" @click="download">模板下载</a-button>
		</div>
		<div class="line count">
			<div class="label">录入信息后，点击【文件上传】按钮：</div>
			<a-upload name="file" :showUploadList="false" :customRequest>
				<a-button type="primary">文件上传</a-button>
			</a-upload>
		</div>
		<div v-if="curFile" key="file" class="line">已选择文件: {{ curFile.file.name }}</div>
		<div class="line count">
			<div class="label">点击【导入】按钮即可进行导入。</div>
		</div>
	</BasicModal>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { useMethods } from '@/hooks/system/useMethods';

const emit = defineEmits<{
	(e: 'success', emit: any): void;
	(e: 'register', emit: unknown): void;
}>();

const { templateUrl = '', templateName = '' } = defineProps<{
	templateUrl: string;
	templateName: string;
}>();

const { handleExportXlsx } = useMethods();
const curFile = shallowRef();
function customRequest(file) {
	curFile.value = file;
	redoModalHeight();
}

//region 弹窗
const [registerModal, { changeOkLoading, closeModal, redoModalHeight }] = useModalInner(async (data) => {
	changeOkLoading(false);
	curFile.value = undefined;
});
//endregion
//region 模板下载
function download() {
	handleExportXlsx(templateName, templateUrl, {});
}
//endregion
//region 导入
async function handleSubmit() {
	try {
		changeOkLoading(true);
		emit('success', curFile.value);
		closeModal();
	} finally {
		changeOkLoading(false);
	}
}
//endregion
</script>

<style lang="less" scoped>
//region 样式
.count {
	counter-increment: index;
}
.line {
	@padding: 15px;
	margin: 20px 30px 0;
	padding-left: @padding;
	display: flex;
	align-items: center;
	> .label {
		position: relative;
		margin-right: 10px;
		width: 300px;
		&:before {
			content: counter(index) '.';
			position: absolute;
			left: -@padding;
		}
	}
}
//endregion
</style>
