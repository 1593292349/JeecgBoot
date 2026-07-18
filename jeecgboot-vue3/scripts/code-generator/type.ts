type Validator = (value: string) => true | string | Promise<true | string>;
type NewModuleCommandArgs = {
	//路径（如 prevention/patrol/plan）
	viewPath?: string;
	//模块中文名（如 巡检计划）
	moduleName?: string;
	//表名（如 safety_patrol_plan）
	tableName?: string;
	//存在导入
	importExcelApi?: boolean;
	//存在导出
	exportXlsApi?: boolean;
	//存在表格行选择
	rowSelection?: boolean;
	//存在单独的详情接口
	detailApi?: boolean;
	//存在明细表
	subTable?: boolean;
	//交互式选功能
	interactive?: boolean;
	//已有目录时的操作
	mode?: 'overwrite' | 'clear' | 'cancel';
	//跳过所有确认
	yes?: boolean;
};
type NewModuleConfig = Required<Omit<NewModuleCommandArgs, 'interactive' | 'mode' | 'yes'>> & {
	//表名驼峰（如 safetyPatrolPlan）
	camelTableName: string;
	//权限标识前缀（如 prevention.patrol.plan）
	authPrefix: string;
	//组件 name 属性（如 safety-prevention-patrol-plan）
	nameAttr: string;
	//API 路径前缀（如 /prevention/patrol/plan/safetyPatrolPlan）
	apiPrefix: string;
	//目标目录
	targetDir: string;
};

export {
	Validator,
	NewModuleCommandArgs,
	NewModuleConfig,
};
