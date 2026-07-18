import type {
	NewModuleConfig,
} from '../type';

export default function(config:NewModuleConfig):string{
	return `<template>
	<div>
		<!-- 表格 -->
		<BasicTable ${config.rowSelection || config.exportXlsApi ? `:rowSelection="rowSelection" ` : ''}@register="registerTable">
			<template #tableTitle>
				<a-button
					v-if="hasPermission('${config.authPrefix}:${config.tableName}:add')"
					type="primary"
					preIcon="ant-design:plus-outlined"
					@click="handleCreate"
				>
					新增
				</a-button>${
					config.exportXlsApi
						? `
				<a-button
					v-if="hasPermission('${config.authPrefix}:${config.tableName}:exportXls')"
					type="primary"
					preIcon="ant-design:export-outlined"
					@click="onExportXls"
				>
					导出
				</a-button>`
						: ''
				}${
					config.importExcelApi
						? `
				<j-upload-button
					v-if="hasPermission('${config.authPrefix}:${config.tableName}:importExcel')"
					type="primary"
					preIcon="ant-design:import-outlined"
					:templateUrl="getImportTemplateUrl"
					templateName="${config.moduleName}-导入模板"
					@click="onImportXls"
				>
					导入
				</j-upload-button>`
						: ''
				}
			</template>
			<template #status="{ text, record, index, column }">
				<a-tag color="default">
					{{ text }}
				</a-tag>
				<a-tag color="success">
					{{ text }}
				</a-tag>
				<a-tag color="processing">
					{{ text }}
				</a-tag>
				<a-tag color="warning">
					{{ text }}
				</a-tag>
				<a-tag color="error">
					{{ text }}
				</a-tag>
			</template>
			<template #details="{ text, record, index, column }">
				<a-tooltip>
					<template #title>{{ text }}</template>
					<a-button
						type="link"
						size="small"
					>
						查看
					</a-button>
				</a-tooltip>
			</template>
			<!-- 操作栏 -->
			<template #action="{ record }">
				<TableAction :actions="getTableAction(record)" />
			</template>
		</BasicTable>
		<!-- 弹窗 -->
		<EditModal
			@register="registerEditModal"
			@success="handleSuccess"
		/>
	</div>
</template>

<script lang="ts" name="${config.nameAttr}" setup>
	import { ActionItem, BasicTable, TableAction } from '/@/components/Table';
	import { useModal } from '/@/components/Modal';
	import { useListPage } from '/@/hooks/system/useListPage';
	import { usePermission } from '/@/hooks/web/usePermission';
	import EditModal from './components/EditModal.vue';
	import { columns, searchFormSchema } from './data';
	import {
		deleteOne,${
			config.exportXlsApi
				? `
		getExportUrl,`
				: ''
		}${
			config.importExcelApi
				? `
		getImportTemplateUrl,
		getImportUrl,`
				: ''
		}
		list,${
			config.detailApi
				? `
		queryById,`
				: ''
		}
	} from './api';

	const { hasPermission } = usePermission();
	
	//弹窗
	const [registerEditModal, { openModal: openEditModal }] = useModal();
	//region 表格
	const {
		tableContext,${
			config.exportXlsApi
				? `
		onExportXls,`
				: ''
		}${
			config.importExcelApi
				? `
		onImportXls,`
				: ''
		}
	} = useListPage({
		tableProps: {
			api: list,
			title: '${config.moduleName}',
			columns,
			canResize: true,
			formConfig: {
				labelWidth: 90,
				schemas: searchFormSchema,
				autoSubmitOnEnter: true,
				showAdvancedButton: true,
				fieldMapToNumber: [],
				fieldMapToTime: [],
			},
			actionColumn: {
				width: 210,
				fixed: 'right',
			},
			showIndexColumn: true,
		},${
			config.exportXlsApi
				? `
		exportConfig: {
			name: '${config.moduleName}',
			url: getExportUrl,
		},`
				: ''
		}${
			config.importExcelApi
				? `
		importConfig: {
			url: getImportUrl,
			success: handleSuccess,
		},`
				: ''
		}
	});
	const [
		registerTable,
		{ reload },${
			config.rowSelection || config.exportXlsApi
				? `
		{ rowSelection, selectedRows, selectedRowKeys },`
				: ''
		}
	] = tableContext;
	function handleSuccess(){${
			config.rowSelection || config.exportXlsApi
				? `
		selectedRowKeys.value = [];`
				: ''
		}
		reload();
	}
	//endregion
	//region 新增、编辑、详情、删除
	async function handleCreate() {
		openEditModal(true, {
			mode: 'create',
		});
	}
	async function handleEdit(record: Recordable, mode: 'edit' | 'browse') {
		openEditModal(true, {
			${config.detailApi?`record: await queryById(record.id)`:'record'},
			mode,
		});
	}
	async function handleDelete(record) {
		await deleteOne({ id: record.id }, handleSuccess);
	}
	//endregion
	//region 操作栏
	function getTableAction(record): ActionItem[] {
		return [
			{
				label: '查看',
				onClick: handleEdit.bind(null, record, 'browse'),
			},
			{
				label: '编辑',
				onClick: handleEdit.bind(null, record, 'edit'),
				auth: '${config.authPrefix}:${config.tableName}:edit',
			},
			{
				label: '删除',
				color: 'error',
				popConfirm: {
					title: '确定删除吗?',
					confirm: handleDelete.bind(null, record),
					placement: 'topLeft',
				},
				auth: '${config.authPrefix}:${config.tableName}:delete',
			},
		];
	}
	//endregion
</script>

<style lang="less" scoped>
	//region 样式
	//endregion
</style>
`;
}
