import type {
	NewModuleConfig,
} from '../type';

export default function(config:NewModuleConfig):string{
	return `${
		config.subTable
			? `type SubTableData = {
	id:string;
	remark:string;
};`
			: ''
	}

export type {${
	config.subTable
		? `
	SubTableData,`
		: ''
}
};
`;
}
