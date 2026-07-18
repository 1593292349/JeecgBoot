type TriggerType = 'hover' | 'click' | null;
interface Param {
  emitInput?: (val: boolean) => void;
  value?: () => boolean | null;
  trigger: () => TriggerType;
  hideOnClick: () => boolean | 'toggle';
  interactive: () => boolean | undefined;
  disabled: () => boolean | undefined;
  hideCondition?: (isOutside: boolean) => boolean;
}

export type { TriggerType, Param };
