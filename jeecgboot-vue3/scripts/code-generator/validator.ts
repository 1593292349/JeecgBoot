import type {
	Validator,
} from './type';

export const validator:Record<string, Validator> = {
	path(value){
		if(!value?.trim()){
			return '路径不能为空';
		}
		if(value.startsWith('/') || value.endsWith('/')){
			return '路径不能以 / 开头或结尾';
		}
		if(!/^[\w/]+$/.test(value)){
			return '路径只能包含字母、数字、下划线和 /';
		}
		return true;
	},
	name(value){
		if(!value?.trim()){
			return '模块中文名不能为空';
		}
		return true;
	},
	table(value){
		if(!value?.trim()){
			return '表名不能为空';
		}
		if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)){
			return '表名格式不正确';
		}
		return true;
	},
};
