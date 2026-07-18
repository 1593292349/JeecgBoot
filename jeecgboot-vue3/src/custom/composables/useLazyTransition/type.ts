interface Param {
  showCondition: () => boolean;
  onVisibleChange?: (visible: boolean, isFirst: boolean) => void;
}

export type { Param };
