import type {
	NewModuleConfig,
} from '../type';

export default function(config:NewModuleConfig):string{
	return `import { h } from 'vue';
import { Tag } from 'ant-design-vue';
import { BasicColumn, FormSchema } from '/@/components/Table';
import { DescItem } from '/@/components/Description';

//region 列表数据
export const columns: BasicColumn[] = [
	{
		title: '名称',
		align: 'center',
		dataIndex: 'name',
	},
	{
		title: '字典',
		align: 'center',
		dataIndex: 'departId_dictText',
	},
	{
		title: '格式化',
		align: 'center',
		dataIndex: 'format',
		format(text, record, index){
			return '格式化';
		},
	},
	{
		title: '插槽',
		align: 'center',
		dataIndex: 'status',
		slots: { customRender: 'details' },
	},
];
//endregion
//region 查询数据
export const searchFormSchema: FormSchema[] = [
	{
		label: '名称',
		field: 'name',
		component: 'JInput',
	},
];
//endregion
//region 表单数据
export const formSchema: FormSchema[] = [
	{
		label: '',
		field: 'id',
		component: 'Input',
		show: false,
	},
	{
		label: '字符串',
		field: 'string',
		component: 'Input',
		required: true,
	},
	{
		label: '文本域',
		field: 'string',
		component: 'InputTextArea',
		required: true,
	},
	{
		label: '数字',
		field: 'number',
		component: 'InputNumber',
		componentProps: {
			controls: false,
			min: 1,
			max: 100,
			precision: 0,
			style: { width: '100%' },
		},
		required: true,
	},
	{
		label: '选部门',
		field: 'departId',
		component: 'JSelectDept',
		componentProps: {
			checkStrictly:true,
		},
		required: true,
	},
	{
		label: '选人',
		field: 'user',
		component: 'JSelectUserByDepartment',
		componentProps: {
			rowKey: 'id',
			labelKey: 'realname',
		},
		required: true,
	},
	{
		label: '字典单选',
		field: 'dict',
		component: 'JDictSelectTag',
		componentProps: {
			dictCode: "safety_workroom,work_room_name,id",
		},
		dynamicDisabled: true,
	},
	{
		label: '字典多选',
		field: 'dictMultiple',
		component: 'JSelectMultiple',
		componentProps: {
			dictCode: "safety_standards,std_name,id,std_type='gd_std04'",
		},
		required: true,
	},
	{
		label: '日期',
		field: 'date',
		component: 'DatePicker',
		componentProps: {
			format: 'YYYY-MM-DD',
			valueFormat: 'YYYY-MM-DD',
		},
		required: true,
	},
	{
		label: '日期范围',
		field: 'dateRange',
		component: 'RangePicker',
		componentProps: {
			showTime: false,
			format: 'YYYY-MM-DD',
			valueFormat: 'YYYY-MM-DD',
		},
		required: true,
	},
	{
		label: '附件',
		field: 'files',
		component: 'JUpload',
		componentProps: {
			text: '文件上传',
			maxCount: 20,
			download: true,
		},
		required: true,
	},
];
//endregion
//region 详情数据
export const descriptionSchema: DescItem[] = [
	{
		label: '名称',
		field: 'name',
	},
	{
		label: '跨列',
		field: 'span',
		span:2,
	},
	{
		label: '渲染函数',
		field: 'render',
		render(val, data){
			return h(Tag, {
				color:'processing',
			}, () => val);
		},
	},
	{
		label: '动态显示',
		field: 'show',
		show(values){
			return values.category === 'accident';
		},
	},
];
//endregion${
	config.subTable
		? `
//region 表单列表数据
export const subTableColumns: BasicColumn[] = [
	{
		title: '名称',
		align: 'center',
		dataIndex: 'name',
	},
	{
		title: '字典',
		align: 'center',
		dataIndex: 'departId_dictText',
	},
	{
		title: '格式化',
		align: 'center',
		dataIndex: 'format',
		format(text, record, index){
			return '格式化';
		},
	},
	{
		title: '插槽',
		align: 'center',
		dataIndex: 'status',
		slots: { customRender: 'details' },
	},
];
//endregion`
		: ''
}
`;
}
