import type {
	NewModuleCommandArgs,
	NewModuleConfig,
} from './type';
import {
	Command,
	Option,
} from 'commander';
import {
	confirm,
	input,
	select,
	checkbox,
} from '@inquirer/prompts';
import {
	camelCase,
} from 'lodash-es';
import fs from 'fs-extra';
import path from 'path';
import generateIndexVue from './template/indexVue';
import generateApiTs from './template/apiTs';
import generateDataTs from './template/dataTs';
import generateTypeTs from './template/typeTs';
import generateEditModalVue from './template/editModalVue';
import {validator} from './validator';

const program = new Command();

program
	.name('code-generator')
	.description('前端代码生成器')
	.version('1.0.0');

//region 生成新模块代码
program
	.command('new-module')
	.description('生成新模块代码')
	.option('-v, --viewPath <path>', '视图路径，如 prevention/patrol/plan')
	.option('-n, --moduleName <name>', '模块中文名，如 巡检计划')
	.option('-t, --tableName <name>', '表名，如 safety_patrol_plan')
	.option('--no-importExcelApi', '没有导入功能')
	.option('--no-exportXlsApi', '没有导出功能')
	.option('--rowSelection', '有表格行选择功能')
	.option('--detailApi', '有独立的详情接口')
	.option('--subTable', '有明细表功能')
	.option('--no-interactive', '通过命令行参数挑选功能')
	.addOption(
		new Option('-m, --mode <action>', '已有目录时的操作：overwrite(覆盖) / clear(清空) / cancel(取消)')
			.choices(['overwrite', 'clear', 'cancel'])
	)
	.option('-y, --yes', '跳过所有确认，直接生成')
	.action(async (opts: NewModuleCommandArgs) => {
		// CLI 参数优先，未提供则交互式提问
		const viewPath = opts.viewPath ?? await input({
			message: '请输入生成路径（如 prevention/patrol/plan）:',
			validate: validator.path,
		});
		const moduleName = opts.moduleName ?? await input({
			message: '请输入模块中文名（如 巡检计划）:',
			validate: validator.name,
		});
		const tableName = opts.tableName ?? await input({
			message: '请输入表名（如 safety_patrol_plan）:',
			validate: validator.table,
		});
		const choices: Array<{
			name:string;
			value:string;
			checked?:boolean;
		}> = [
			{ name: '导入', value: 'importExcelApi', checked:true },
			{ name: '导出', value: 'exportXlsApi', checked:true },
			{ name: '表格行选择', value: 'rowSelection' },
			{ name: '独立的详情接口', value: 'detailApi' },
			{ name: '明细表', value: 'subTable' },
		];
		if(opts.interactive){
			const checked = await checkbox({
				message: '选择需要的功能:',
				choices,
				pageSize: 10,
			});
			for(const { value } of choices){
				opts[value] = false;
			}
			for(const key of checked){
				opts[key] = true;
			}
		}
		const fns: string[] = [];
		for(const { name, value } of choices){
			if(opts[value]){
				fns.push(name);
			}
		}
		console.log(`\n功能: ${fns.join(', ')}`);
		const camelTableName = camelCase(tableName);
		const config: NewModuleConfig = {
			viewPath,
			moduleName,
			tableName,
			importExcelApi:opts.importExcelApi || false,
			exportXlsApi:opts.exportXlsApi || false,
			rowSelection:opts.rowSelection || false,
			detailApi:opts.detailApi || false,
			subTable:opts.subTable || false,
			camelTableName,
			authPrefix: viewPath.replace(/\//g, '.'),
			nameAttr: 'safety-' + viewPath.replace(/\//g, '-'),
			apiPrefix: `/${viewPath}/${camelTableName}`,
			targetDir: path.resolve('src/views/safety', viewPath),
		};
		// 显示配置
		console.log('\n📝 生成配置:');
		console.log(`   目标路径: src/views/safety/${config.viewPath}`);
		console.log(`   模块中文名: ${config.moduleName}`);
		console.log(`   表名: ${config.tableName}`);
		console.log(`   API 路径: ${config.apiPrefix}`);
		console.log(`   权限标识: ${config.authPrefix}:${config.tableName}\n`);
		// 目录已存在时选择操作
		const exists = await fs.pathExists(config.targetDir);
		if (exists) {
			const action = opts.mode ?? await select({
				message: '目录已存在，请选择操作：',
				choices: [
					{ name: '覆盖', value: 'overwrite', description: '直接覆盖现有文件' },
					{ name: '清空', value: 'clear', description: '删除目录后重新创建' },
					{ name: '取消', value: 'cancel', description: '取消生成' },
				],
			});
			if (action === 'cancel') {
				console.log('❌ 目录已存在，已取消生成');
				process.exit(0);
			}
			if (action === 'clear') {
				await fs.remove(config.targetDir);
			}
		}
		// 最终确认
		const shouldGenerate = opts.yes ?? await confirm({ message: '确认生成？', default: true });
		if (!shouldGenerate) {
			console.log('❌ 已取消生成');
			return;
		}
		// 创建目录并生成文件
		const componentsDir = path.join(config.targetDir, 'components');
		await fs.ensureDir(componentsDir);
		try {
			await Promise.all([
				fs.writeFile(path.join(config.targetDir, 'index.vue'), generateIndexVue(config)),
				fs.writeFile(path.join(config.targetDir, 'api.ts'), generateApiTs(config)),
				fs.writeFile(path.join(config.targetDir, 'data.ts'), generateDataTs(config)),
				fs.writeFile(path.join(config.targetDir, 'type.ts'), generateTypeTs(config)),
				fs.writeFile(path.join(componentsDir, 'EditModal.vue'), generateEditModalVue(config)),
			]);
		} catch (err: any) {
			console.error('❌ 文件写入失败:', err.message);
			process.exit(1);
		}
		console.log('\n✅ 代码生成完成！');
		console.log(`\n📂 ${config.targetDir}`);
		console.log('   ├── index.vue');
		console.log('   ├── api.ts');
		console.log('   ├── data.ts');
		console.log('   ├── type.ts');
		console.log('   └── components/EditModal.vue');
	});
//endregion

program.parse();
