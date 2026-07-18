import type {
	NewModuleConfig,
} from '../type';

export default function(config:NewModuleConfig):string{
	return `<template>
	<BasicModal
		v-bind="$attrs"
		:title="title"
		:width="1000"
		:maxHeight="600"
		:footer="disabled ? null : undefined"
		destroyOnClose
		@visible-change="!$event && (dataReady = false)"
		@register="registerModal"
		@ok="handleSubmit"
	>
		<Description
			v-if="disabled"
			:column="2"
			@register="registerDescription"
		/>
		<BasicForm
			v-else
			:disabled="disabled"
			@register="registerForm"
		/>${
			config.subTable
				? `
		<a-form>
			<BasicTable @register="registerSubTable">
				<template #remark="{ record, index }">
					<template v-if="!disabled">
						<a-form-item v-bind="subValidateInfos[${'`subList[${index}].remark`'}]">
							<a-textarea
								v-model:value="record.remark"
								:rows="1"
								placeholder="备注"
							/>
						</a-form-item>
					</template>
					<template v-else>{{ record.remark }}</template>
				</template>
				<template #action="{ record }">
					<TableAction :actions="getTableAction(record)" />
				</template>
			</BasicTable>
		</a-form>`
				: ''
		}
	</BasicModal>
</template>
<script lang="ts" setup>${
		config.subTable
			? `
	import type { Rule } from '/@/components/Form';
	import type { SubTableData } from '../type';`
			: ''
	}
	import {
		shallowRef,${
			config.subTable
				? `
		reactive,`
				: ''
		}
		computed,${
			config.subTable
				? `
		watch,`
				: ''
		}
		nextTick
	} from 'vue';${
		config.subTable
			? `
	import { Form } from 'ant-design-vue';`
			: ''
	}
	import { BasicModal, useModalInner } from '/@/components/Modal';
	import { BasicForm, useForm } from '/@/components/Form';${
		config.subTable
			? `
	import { ActionItem, BasicTable, TableAction } from '/@/components/Table';`
			: ''
	}
	import { Description, useDescription } from '/@/components/Description';${
		config.subTable
			? `
	import { useListPage } from '/@/hooks/system/useListPage';`
			: ''
	}
	import {
		formSchema,
		descriptionSchema,${
			config.subTable
				? `
		subTableColumns,`
				: ''
		}
	} from '../data';
	import { saveOrUpdate } from '../api';

	const emit = defineEmits<{
		(e: 'success'): void;
		(e: 'register', emit: unknown): void;
	}>();

	const mode = shallowRef<'create' | 'edit' | 'browse'>('create');
	let dataReady = false;
	//region disabled
	const disabled = computed(() => {
		return mode.value === 'browse';
	});
	//endregion
	//region 标题
	const title = computed(() => {
		if (mode.value === 'create') {
			return '新增';
		} else if (mode.value === 'edit') {
			return '编辑';
		}
		return '详情';
	});
	//endregion
	//region 表单配置
	const [registerForm, { resetFields, setFieldsValue, validate, scrollToField }] = useForm({
		//必须同时设置 labelWidth、wrapperCol 否则最终宽度不能保证100%
		labelWidth: 100,
		wrapperCol: {},
		schemas: formSchema,
		showActionButtonGroup: false,
		baseColProps: { span: 12 },
		baseRowStyle: { padding: '20px 20px 0' },
	});
	//endregion
	//region 详情配置
	const [registerDescription, { setDescProps }] = useDescription({
		data:{},
		schema: descriptionSchema,
		labelStyle:{width:'100px'},
		contentStyle:{width:'230px'},
	});
	//endregion${
		config.subTable
			? `
	//region 子表校验
	const subModel = reactive<{
		subList: SubTableData[];
	}>({ subList: [] });
	const subRules = computed(() => {
		const result: Record<string, Rule[]> = ({});
		for (let i = 0; i < subModel.subList.length; ++i) {
			result[${'`subList[${i}].remark`'}] = [{ required: true, message: '请输入' }];
		}
		return result;
	});
	const { validate: subValidate, validateInfos: subValidateInfos } = Form.useForm(subModel, subRules);
	//endregion
	//region 子表配置
	const { tableContext } = useListPage({
		tableProps: {
			dataSource: [],
			columns: subTableColumns,
			canResize: false,
			actionColumn: {
				width: 80,
				fixed: 'right',
			},
			pagination: false,
			useSearchForm: false,
			showTableSetting: false,
			showIndexColumn: true,
		},
	});
	const [registerSubTable, { setTableData, setProps }] = tableContext;
	watch(subModel, () => setTableData(subModel.subList));
	//endregion
	//region 子表操作
	function removeSubRow(id) {
		subModel.subList = subModel.subList.filter(r => r.id !== id);
	}
	//endregion
	//region 操作栏
	function getTableAction(record): ActionItem[] {
		return [
			{
				label: '删除',
				color: 'error',
				onClick: removeSubRow.bind(null, record.id),
			},
		];
	}
	//endregion`
			: ''
	}
	//region 弹窗
	const [registerModal, { changeOkLoading, closeModal }] = useModalInner(async (data) => {
		dataReady = false;
		await resetFields();${
			config.subTable
				? `
		subModel.subList = [];`
				: ''
		}
		mode.value = data.mode;
		await nextTick();${
			config.subTable
				? `
		setProps({
			showActionColumn:!disabled.value,
		});`
				: ''
		}
		changeOkLoading(false);
		if(data?.record){
			const {record} = data;
			if(disabled.value){
				setDescProps({
					data:record,
				});
			}else{
				await setFieldsValue(record);
			}${
				config.subTable
					? `
			if(Array.isArray(record.subList)){
				subModel.subList = record.subList;
			}`
					: ''
			}
		}
		nextTick(() => {
			dataReady = true;
		});
	});
	//endregion
	//region 提交
	async function handleSubmit() {
		if (disabled.value) {
			return;
		}
		try {${
			config.subTable
				? `
			const [values] = await Promise.all([
				validate(),
				subValidate(),
			]);`
				: `
			const values = await validate();`
		}
			changeOkLoading(true);
			await saveOrUpdate(${
				config.subTable
					? `{
				...values,
				subList: subModel.subList.map((item) => ({
					remark: item.remark,
				})),
			}`
					: 'values'
			}, mode.value === 'edit');
			closeModal();
			emit('success');
		} catch (error: any) {
			if (error.errorFields) {
				const firstField = error.errorFields[0];
				if (firstField) {
					scrollToField(firstField.name, { behavior: 'smooth' });
				}
			}
		} finally {
			changeOkLoading(false);
		}
	}
	//endregion
</script>
<style lang="less" scoped>
	//region 样式
	//endregion
</style>
`;
}