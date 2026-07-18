import type {
	NewModuleConfig,
} from '../type';

export default function(config:NewModuleConfig):string{
	return `import { defHttp } from '/@/utils/http/axios';

enum Api {
	list = '${config.apiPrefix}/list',${
		config.detailApi
			? `
	queryById = '${config.apiPrefix}/queryById',`
			: ''
	}
	save = '${config.apiPrefix}/add',
	edit = '${config.apiPrefix}/edit',
	deleteOne = '${config.apiPrefix}/delete',${
		config.exportXlsApi
			? `
	exportXls = '${config.apiPrefix}/exportXls',`
			: ''
	}${
		config.importExcelApi
			? `
	importExcelTemplate = '${config.apiPrefix}/importExcelTemplate',
	importExcel = '${config.apiPrefix}/importExcel',`
			: ''
	}
}
${
	config.exportXlsApi
		? `
//导出
export const getExportUrl = Api.exportXls;`
		: ''
}${
	config.importExcelApi
		? `
//导入
export const getImportTemplateUrl = Api.importExcelTemplate;
export const getImportUrl = Api.importExcel;`
		: ''
}
//region 列表
export const list = (params) => defHttp.get({ url: Api.list, params });
//endregion${
	config.detailApi
		? `
//region 详情
export const queryById = (id: string) => {
	return defHttp.get({ url: Api.queryById, params:{ id } }).then((data) => {
		return data.records[0];
	});
}
//endregion`
		: ''
}
//region 保存/更新
export const saveOrUpdate = (params, isUpdate) => {
	const url = isUpdate ? Api.edit : Api.save;
	return defHttp.post({ url: url, params });
};
//endregion
//region 删除
export const deleteOne = (params, handleSuccess) => {
	return defHttp
		.delete(
			{
				url: Api.deleteOne,
				params,
			},
			{ joinParamsToUrl: true }
		)
		.then(() => {
			handleSuccess?.();
		});
};
//endregion
`;
}
