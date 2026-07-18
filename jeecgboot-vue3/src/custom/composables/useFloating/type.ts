interface Param {
  emitInput?: (val: boolean) => void;
  value?: () => boolean | null;
  disabled?: () => boolean | undefined;
  onVisibleChange?: (visible: boolean, isFirst: boolean) => void;
}

export type { Param };
