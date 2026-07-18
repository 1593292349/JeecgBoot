interface TaskRunner<F extends (...args: Array<unknown>) => unknown> {
  run: F;
  pending(): boolean;
  flush(): ReturnType<F>;
  cancel(): void;
}
interface DebounceOption {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}
interface ThrottleOption {
  leading?: boolean;
  trailing?: boolean;
}
interface PadOption {
  char?: string;
  start?: boolean;
}
type Awaitable<T> = T | Promise<T>;
type FieldGetter<D, R = string> = (data: D) => R;
type PropOrGetter<D, R = string> = string | FieldGetter<D, R>;
type BeforeProcessor<D, R = void | boolean> = (data: D) => Awaitable<R>;
type Axis = 'x' | 'y';
type RelativePosition = 'start' | 'center' | 'end';
interface TreeNodeWrap<T> {
  node: T;
  parent: TreeNodeWrap<T> | undefined;
}
interface TreeNodeCallbackState {
  skip?: boolean;
  stop?: boolean;
  remove?: boolean;
}
interface TreeNodeCallback<T> {
  (nodeWrap: TreeNodeWrap<T>): TreeNodeCallbackState | boolean | void;
}
type BaseType = null | undefined | boolean | number | string | ((...args: unknown[]) => unknown) | bigint | symbol;
interface DateLocale {
  weeks?: [string, string, string, string, string, string, string];
  weeksShort?: [string, string, string, string, string, string, string];
  months?: [string, string, string, string, string, string, string, string, string, string, string, string];
  monthsShort?: [string, string, string, string, string, string, string, string, string, string, string, string];
  quarters?: [string, string, string, string];
  am?: string;
  pm?: string;
}
type TimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
interface DateFormatCache {
  [key: string]: Array<DateFormatToken>;
}
interface DateFormatToken {
  type: FormatToken | 'text';
  value?: string;
}
type TimeTokenFormatter = {
  [token in FormatToken]: (date: Date, dateLocale: Required<DateLocale>, timezoneOffset?: number) => string | number;
};
type FormatToken =
  //年
  | 'yy'
  | 'yyyy'
  //季度, 2位-简写
  | 'Q'
  | 'QQ'
  //月, 3位-简写, 4位-全写
  | 'M'
  | 'MM'
  | 'MMM'
  | 'MMMM'
  //日
  | 'd'
  | 'dd'
  //一年中第几天
  | 'D'
  | 'DD'
  //星期, 0-6(0表示星期天)
  | 'e'
  //星期, E 1-7(7表示星期天), EE-简写, EEE-全写
  | 'E'
  | 'EE'
  | 'EEE'
  //小时, 0-23
  | 'H'
  | 'HH'
  //小时, 1-12
  | 'h'
  | 'hh'
  //小时, 0-11
  | 'K'
  | 'KK'
  //小时, 1-24
  | 'k'
  | 'kk'
  //分钟
  | 'm'
  | 'mm'
  //秒
  | 's'
  | 'ss'
  //毫秒
  | 'S'
  | 'SS'
  | 'SSS'
  //上午, 下午
  | 'a'
  //时区
  | 'Z'
  | 'ZZ';
interface DateFormatOption {
  dateLocale?: DateLocale;
  timezoneOffset?: number;
}
interface DateParseCache {
  [key: string]: {
    regex: RegExp;
  };
}
interface DateParseOption {
  dateLocale?: DateLocale;
  timezoneOffset?: number;
}
type ChooseFileOption = {
  multiple?: boolean;
  accept?: string;
};
interface NumberFormatOption {
  separator?: string;
  count?: number;
  unit?: (num: number) => [number, string];
}

export type {
  TaskRunner,
  DebounceOption,
  ThrottleOption,
  PadOption,
  Awaitable,
  FieldGetter,
  PropOrGetter,
  BeforeProcessor,
  Axis,
  RelativePosition,
  TreeNodeWrap,
  TreeNodeCallbackState,
  TreeNodeCallback,
  BaseType,
  DateLocale,
  TimeUnit,
  DateFormatCache,
  DateFormatToken,
  TimeTokenFormatter,
  FormatToken,
  DateFormatOption,
  DateParseCache,
  DateParseOption,
  ChooseFileOption,
  NumberFormatOption,
};
