import type { Awaitable } from '/@/custom/type';

type CacheInfo = {
  transform: 'marginTop' | 'marginLeft';
  size: 'width' | 'height';
  direction: 'row' | 'column';
};
type Type = 'fix' | 'sizeArray' | 'dynamic';
type Data = Array<unknown> | DataFn;
type DataFn = (scope: Scope) => Awaitable<Array<unknown>>;
type Scope = {
  //包含开始
  start: number;
  //不包含结束
  end: number;
};
type DataList = {
  getData: (scope: Scope) => unknown[];
  readonly size: number;
};
interface ItemScope<T = unknown> {
  item: T;
  index: number;
}
interface Info {
  offset: number;
  itemSize: number;
}

export type { CacheInfo, Type, Data, DataFn, Scope, DataList, ItemScope, Info };
