import { getCurrentInstance, h } from 'vue';
import { createVueInstance } from '/@/custom/function';
import JSelectUserByDepartmentModal from '/@/components/Form/src/jeecg/components/modal/JSelectUserByDepartmentModal.vue';
import { useModal } from '/@/components/Modal';

interface ShowSelectUserByDepartmentModalOptions {
	title?: string;
	maxSelectCount?: number;
	selectedUser?: any[];
	rowKey?: string;
	labelKey?: string;
	params?: Record<string, any>;
	isRadioSelection?: boolean;
}

export default function () {
	const parent = getCurrentInstance();

	function showSelectUserByDepartmentModal(
		options: ShowSelectUserByDepartmentModalOptions = {},
	): Promise<any[] | false> {
		const [register, { openModal }] = useModal();
		return createVueInstance<any[] | false>(({ destroy, resolve }) => {
			setTimeout(() => openModal(true, { isUpdate: false }), 100);
			return h(JSelectUserByDepartmentModal, {
				modalTitle: options.title || '选择用户',
				maxSelectCount: options.maxSelectCount,
				selectedUser: options.selectedUser || [],
				rowKey: options.rowKey || 'id',
				labelKey: options.labelKey || 'realname',
				params: options.params || {},
				isRadioSelection: options.isRadioSelection || false,
				onRegister: register,
				onChange(selectedUsers: any[]) {
					resolve(selectedUsers);
				},
				onClose() {
					resolve(false);
					destroy();
				},
			});
		}, { parent: parent || undefined });
	}

	return { showSelectUserByDepartmentModal };
}
