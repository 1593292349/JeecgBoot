import type { MaybeRefOrGetter, ComponentInternalInstance } from 'vue';
import type {
  DebounceOption,
  ThrottleOption,
  TaskRunner,
  Awaitable,
  FieldGetter,
  PropOrGetter,
  TreeNodeCallback,
  TreeNodeWrap,
  BaseType,
  ChooseFileOption,
  NumberFormatOption,
} from './type';
import { isRef, render as vueRender, onBeforeUnmount, onActivated, onDeactivated } from 'vue';
import { getFileAccessHttpUrl } from '/@/utils/common/compUtils';

//region toCssLength
/**
 * 转换为长度字符串, 没有单位时默认为px
 * @param length 长度
 * @return 带单位的长度值
 */
function toCssLength(length: number | string | null | undefined): string | undefined {
  if (typeof length === 'number') {
    if (Number.isFinite(length)) {
      return length + 'px';
    } else {
      return undefined;
    }
  } else if (typeof length === 'string') {
    const convert = Number(length);
    if (Number.isFinite(convert)) {
      return convert + 'px';
    } else {
      return length;
    }
  } else {
    return undefined;
  }
}
//endregion
//region debounce
/**
 * 创建防抖函数(wait为null或0时, 只支持trailing, maxWait失效, 且为节流函数)
 * @param func		需要防抖的函数
 * @param [wait]	延时毫秒
 * @param [options]	选项
 * @return 防抖函数
 */
function debounce<T extends (...args: Array<unknown>) => unknown>(func: T, wait?: number | null, options?: DebounceOption): TaskRunner<T> {
  //region 执行参数
  let lastArgs: Array<unknown> | undefined;
  let lastThis: unknown;
  let result: unknown;
  let timerId: number | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  //endregion
  const useRAF: boolean = wait == null;
  const waitNum: number = wait || 0;
  const leading: boolean = waitNum !== 0 && (options && options.leading) === true;
  const trailing: boolean = (options && options.trailing) !== false;
  const maxWait = options && 'maxWait' in options ? Math.max(waitNum, options.maxWait || 0) : undefined;
  //region startTimer设置定时器
  function startTimer(pendingFunc: () => void, waitNum: number) {
    if (useRAF) {
      return requestAnimationFrame(pendingFunc);
    }
    return self.setTimeout(pendingFunc, waitNum);
  }
  //endregion
  //region cancelTimer关闭定时器
  function cancelTimer(id: number): void {
    if (useRAF) {
      return self.cancelAnimationFrame(id);
    } else {
      return self.clearTimeout(id);
    }
  }
  //endregion
  //region shouldInvoke是否应该执行
  function shouldInvoke(time: number): false | 'ready' | 'max' {
    const sinceLastInvoke = time - lastInvokeTime;
    if ((lastCallTime === undefined || time - lastCallTime >= waitNum) && sinceLastInvoke >= waitNum) {
      return 'ready';
    } else if (maxWait !== undefined && sinceLastInvoke >= maxWait) {
      return 'max';
    }
    return false;
  }
  //endregion
  //region remainingWait剩余需要等待的时间
  function remainingWait(time: number) {
    const timeWaiting = waitNum - (time - lastCallTime!);
    return maxWait !== undefined ? Math.min(timeWaiting, maxWait - (time - lastInvokeTime)) : timeWaiting;
  }
  //endregion
  //region timerExpired判断执行或者延时执行
  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    } else {
      timerId = startTimer(timerExpired, remainingWait(time));
    }
  }
  //endregion
  //region leadingEdge开头调用
  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timerId = startTimer(timerExpired, waitNum);
    return leading ? invokeFunc(time) : result;
  }
  //endregion
  //region trailingEdge结尾调用
  function trailingEdge(time: number) {
    timerId = undefined;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    } else {
      lastArgs = lastThis = undefined;
    }
    return result;
  }
  //endregion
  //region invokeFunc执行方法
  function invokeFunc(time: number) {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args!);
    return result;
  }
  //endregion
  const debounced = function (this: unknown, ...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    lastArgs = args;
    //eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this;
    lastCallTime = time;
    if (isInvoking === 'ready') {
      if (timerId === undefined) {
        return leadingEdge(time);
      }
    } else if (isInvoking === 'max') {
      return invokeFunc(time);
    } else if (timerId === undefined) {
      timerId = startTimer(timerExpired, waitNum);
    }
    return result;
  } as T;
  //region 添加额外的方法cancel, flush, pending
  return {
    run: debounced,
    pending(): boolean {
      return timerId !== undefined;
    },
    flush(): ReturnType<T> {
      const lastResult = result;
      result = undefined;
      if (timerId !== undefined) {
        cancelTimer(timerId);
        return trailingEdge(Date.now()) as ReturnType<T>;
      } else {
        return lastResult as ReturnType<T>;
      }
    },
    cancel(): void {
      if (timerId !== undefined) {
        cancelTimer(timerId);
      }
      result = undefined;
      lastInvokeTime = 0;
      lastArgs = lastThis = timerId = lastCallTime = undefined;
    },
  };
  //endregion
}
//endregion
//region throttle
/**
 * 创建节流函数(wait为null或0时, 只支持trailing)
 * @param func		需要节流的函数
 * @param [wait]	间隔时间
 * @param [options]	选项
 * @return 节流函数
 */
function throttle<T extends (...args: Array<unknown>) => unknown>(func: T, wait?: number, options?: ThrottleOption): TaskRunner<T> {
  return debounce(
    func,
    wait,
    Object.assign(
      {
        leading: true,
        trailing: true,
      },
      options,
      {
        maxWait: wait,
      }
    )
  );
}
//endregion
//region lazyTask
function lazyTask(task: () => void, useRAF = true): () => void {
  let timerId: number | undefined;
  function run() {
    timerId = undefined;
    task();
  }
  return function () {
    if (timerId === undefined) {
      if (useRAF) {
        timerId = requestAnimationFrame(run);
      } else {
        timerId = self.setTimeout(run);
      }
    }
  };
}
//endregion
//region operateDom
const _cacheFns = new Set<() => void>();
const _starterFn = lazyTask(() => {
  for (const fn of _cacheFns) {
    fn();
  }
  _cacheFns.clear();
});
/**
 * 执行操作dom的方法(会收集所有的操作到下一个动画帧执行)
 * @param callback	操作dom的方法
 */
function operateDom(callback: () => void): TaskRunner<() => void> {
  return {
    run() {
      _cacheFns.delete(callback);
      _cacheFns.add(callback);
      _starterFn();
    },
    pending() {
      return _cacheFns.has(callback);
    },
    flush() {
      if (_cacheFns.has(callback)) {
        _cacheFns.delete(callback);
        callback();
      }
    },
    cancel() {
      _cacheFns.delete(callback);
    },
  };
}
//endregion
//region delayReadyToPromise
function delayReadyToPromise<T = void>() {
  let _promise: Promise<T> | undefined;
  let _resolve: ((data: T) => void) | undefined;
  return {
    get(): Promise<T> {
      if (!_promise) {
        _promise = new Promise<T>((resolve) => {
          _resolve = resolve;
        });
      }
      return _promise;
    },
    set(data: T): boolean {
      if (_resolve) {
        _resolve(data);
        _resolve = undefined;
      } else if (!_promise) {
        _promise = Promise.resolve(data);
      } else {
        return false;
      }
      return true;
    },
  };
}
//endregion
//region noop
function noop() {}
//endregion
//region beforeProcessor
function beforeProcessor(status: Awaitable<void | boolean>): Promise<void> {
  return Promise.resolve(status).then((success) => {
    if (success === false) {
      throw '前置处理器阻止';
    }
  });
}
//endregion
//region createGetter
function defaultPropConvert(prop: string) {
  return (data: unknown) => {
    //@ts-ignore
    return data[prop];
  };
}
function createGetter<D, R>(
  propOrGetter: PropOrGetter<D, R>,
  propConvert: (prop: string) => FieldGetter<D, R> = defaultPropConvert
): FieldGetter<D, R> {
  if (typeof propOrGetter === 'string') {
    return propConvert(propOrGetter);
  }
  return propOrGetter;
}
//endregion
//region bindEvent
const listenerOptionSupports = {
  supportOption: false,
  capture: false,
  once: false,
  passive: false,
  signal: false,
};
try {
  const options = {
    get capture() {
      listenerOptionSupports.supportOption = listenerOptionSupports.capture = true;
      return false;
    },
    get once() {
      listenerOptionSupports.supportOption = listenerOptionSupports.once = true;
      return false;
    },
    get passive() {
      listenerOptionSupports.supportOption = listenerOptionSupports.passive = true;
      return false;
    },
    get signal() {
      listenerOptionSupports.supportOption = listenerOptionSupports.signal = true;
      return undefined;
    },
  };
  const testFn = () => {};
  window.addEventListener('test', testFn, options);
  window.removeEventListener('test', testFn, options);
} catch {
  listenerOptionSupports.supportOption = false;
}
function _getListenerOption(options?: boolean | AddEventListenerOptions): boolean | AddEventListenerOptions | undefined {
  if (options != null && typeof options !== 'boolean') {
    if (!listenerOptionSupports.supportOption) {
      return options.capture;
    }
  }
  return options;
}
type EventBinding<K extends keyof WindowEventMap> = {
  type: K;
  listener: (this: Window, ev: WindowEventMap[K]) => unknown;
};
/**
 * 绑定一个全局事件, 返回注册函数和注销函数
 * @param type		事件名
 * @param listener	回调函数
 * @param options	选项
 */
function bindEvent<K extends keyof WindowEventMap>(
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions
): [(win?: Window) => void, (win?: Window) => void];
/**
 * 绑定多个全局事件, 返回注册函数和注销函数
 * @param objs		多个事件名及对应的回调函数
 * @param options	选项
 */
function bindEvent<T extends Array<keyof WindowEventMap>>(
  objs: {
    [I in keyof T]: EventBinding<T[I]>;
  },
  options?: boolean | AddEventListenerOptions
): [(win?: Window) => void, (win?: Window) => void];
function bindEvent<
  K extends keyof WindowEventMap,
  L extends (this: Window, ev: WindowEventMap[K]) => unknown,
  O extends boolean | AddEventListenerOptions,
>(
  typeOrArr:
    | K
    | {
        type: K;
        listener: L;
      }[],
  listenerOrOptions?: L | O,
  options?: O
): [(win?: Window) => void, (win?: Window) => void] {
  if (Array.isArray(typeOrArr)) {
    const opt = _getListenerOption(listenerOrOptions as O);
    return [
      (win = window) => {
        for (const { type, listener } of typeOrArr) {
          win.addEventListener(type, listener, opt);
        }
      },
      (win = window) => {
        for (const { type, listener } of typeOrArr) {
          win.removeEventListener(type, listener, opt);
        }
      },
    ];
  }
  const opt = _getListenerOption(options);
  return [
    (win = window) => {
      win.addEventListener(typeOrArr, listenerOrOptions as L, opt);
    },
    (win = window) => {
      win.removeEventListener(typeOrArr, listenerOrOptions as L, opt);
    },
  ];
}
//endregion
//region createMouseEvent
function createMouseEvent(type: string, params?: MouseEventInit): MouseEvent {
  try {
    return new MouseEvent(type, params);
  } catch {
    const event = document.createEvent('MouseEvent');
    params = params || {};
    event.initMouseEvent(
      type,
      params.bubbles || false,
      params.cancelable || false,
      window,
      0,
      params.screenX || 0,
      params.screenY || 0,
      params.clientX || 0,
      params.clientY || 0,
      params.ctrlKey || false,
      params.altKey || false,
      params.shiftKey || false,
      params.metaKey || false,
      params.button || 0,
      params.relatedTarget || null
    );
    return event;
  }
}
//endregion
//region 限制数值范围
function numberBetween(value: number, min: number, max: number): number {
  if (max < value) {
    value = max;
  }
  if (min > value) {
    value = min;
  }
  return value;
}
//endregion
//region 检测平台
const userAgent = navigator.userAgent.toLowerCase();
const platform = {
  ie: userAgent.indexOf('trident') >= 0,
} as const;
//endregion
//region toValue
function toValue<T>(val: MaybeRefOrGetter<T>): T {
  if (typeof val === 'function') {
    return (val as () => T)();
  }
  if (isRef(val)) {
    return val.value;
  }
  return val;
}
//endregion
//region stateSwitcher
function stateSwitcher(on: () => void, off: () => void): [() => void, () => void] {
  let count = 0;
  return [
    function () {
      !count && on();
      ++count;
    },
    function () {
      --count;
      !count && off();
    },
  ];
}
//endregion
//region loopTree
/**
 * 遍历树结构
 * 遍历树结构, 可提前退出, 可检索祖先节点
 * @param tree 				需要遍历的树
 * @param callback			每个节点的回调函数, 返回值可以指示, 删除节点, 跳过节点, 终止遍历
 * @param [childrenAttr='children']	节点的子节点数组属性
 * @return 被修改后的树
 */
function loopTree<T = unknown>(tree: Array<T>, callback: TreeNodeCallback<T>, childrenAttr = 'children'): Array<T> {
  const standardTree = { [childrenAttr]: tree };
  _loopTree(tree, callback, childrenAttr, standardTree);
  return standardTree[childrenAttr];
}
/**
 * 遍历树结构(内部)
 * @param tree			需要遍历的树
 * @param callback		每个节点的回调函数, 返回值可以指示, 删除节点, 跳过节点, 终止遍历
 * @param childrenAttr	节点的子节点数组属性
 * @param standardTree	树(用于修改)
 * @param [parent]		父节点包装对象
 * @return 是否提前退出遍历
 */
function _loopTree<T>(
  tree: Array<T>,
  callback: TreeNodeCallback<T>,
  childrenAttr: string,
  standardTree: { [k: string]: Array<T> },
  parent?: TreeNodeWrap<T>
): boolean {
  let hasRemove = false;
  let hasStop = false;
  for (let i = 0; i < tree.length; ++i) {
    const node = tree[i];
    const nodeWrap = { node, parent };
    const state = callback(nodeWrap);
    if (state) {
      if (state === true) {
        hasStop = true;
        break;
      } else {
        if (state.remove) {
          //@ts-ignore
          tree[i] = null;
          hasRemove = true;
        }
        if (state.stop) {
          hasStop = true;
          break;
        } else if (state.skip || state.remove) {
          continue;
        }
      }
    }
    const children = node[childrenAttr];
    //@ts-ignore
    if (children && _loopTree(children, callback, childrenAttr, node, nodeWrap)) {
      hasStop = true;
      break;
    }
  }
  if (hasRemove) {
    standardTree[childrenAttr] = tree.filter((n) => n !== null);
  }
  return hasStop;
}
//endregion
//region isBaseType
/**
 * 判断基本类型(可以直接赋值)
 * null, undefined, boolean, number, string, function, bigint, symbol皆属于基本类型, 可以直接赋值
 * @param val	测试值
 * @return		测试结果
 */
function isBaseType(val: unknown): val is BaseType {
  return (
    val == null ||
    typeof val === 'boolean' ||
    typeof val === 'number' ||
    typeof val === 'string' ||
    typeof val === 'function' ||
    typeof val === 'bigint' ||
    typeof val === 'symbol'
  );
}
//endregion
//region copy方法相关
/**
 * copy方法, 数组对位替换
 */
class CopyReplace<E> {
  public value: Array<E>;
  constructor(value: Array<E>) {
    this.value = value;
  }
}
function copyReplace<E>(value: Array<E>) {
  return new CopyReplace<E>(value);
}
/**
 * copy方法, 数组或对象直接覆盖
 */
class CopyCover {
  public value;
  constructor(value: unknown) {
    this.value = value;
  }
}
function copyCover(value: unknown) {
  return new CopyCover(value);
}
class CopyCustom {
  public value: (dest: unknown) => unknown;
  constructor(value: (dest: unknown) => unknown) {
    this.value = value;
  }
}
function copyCustom(value: (dest: unknown) => unknown) {
  return new CopyCustom(value);
}
/**
 * 深度拷贝, 支持: Date, RegExp, Set, Map等类型的拷贝
 * dest,src要么同为数组, 要么同为对象
 * @param dest	目标对象或数组, 会被改变
 * @param src	被拷贝的对象或数组
 */
function copy(dest: any, src: any): void {
  if (Array.isArray(src)) {
    const len = dest.length;
    //数组新增模式
    for (let i = 0; i < src.length; ++i) {
      _copyInner(dest, src[i], len + i);
    }
  } else if (src.constructor === CopyReplace) {
    //数组替换模式
    const array = src.value;
    for (let i = 0; i < array.length; ++i) {
      _copyInner(dest, array[i], i);
    }
  } else {
    // dest,src都是对象
    for (const key of Object.keys(src)) {
      _copyInner(dest, src[key], key);
    }
  }
}
/**
 * 替换指定键的值
 * @param dest	目标对象或数组, 会被改变
 * @param value	用于替换的值
 * @param key	被替换的键
 */
function _copyInner(dest: any, value: any, key: number | string): void {
  let valConstructor;
  if (isBaseType(value)) {
    dest[key] = value;
  } else if (value instanceof Date) {
    dest[key] = new Date(value);
  } else if (value instanceof RegExp) {
    const regexp = new RegExp(value);
    regexp.lastIndex = value.lastIndex;
    dest[key] = regexp;
  } else if (value instanceof Set || value instanceof Map) {
    // @ts-ignore
    dest[key] = new value.constructor(value);
  } else if ((valConstructor = value.constructor) === CopyCover) {
    dest[key] = value.value;
  } else if (valConstructor === CopyCustom) {
    dest[key] = value.value(dest[key]);
  } else {
    // 被拷贝值为数组或对象
    const oldValue = dest[key];
    if (isBaseType(oldValue) || (Array.isArray(value) || valConstructor === CopyReplace) !== Array.isArray(oldValue)) {
      /**
       * 当以下情况时丢弃原有值:
       * 1.原有值为基本类型
       * 2.原有值和被拷贝值,类型不相同时
       */
      dest[key] = valConstructor === CopyReplace ? [] : new value.constructor();
    }
    return copy(dest[key], value);
  }
}
//endregion
//region extend
/**
 * 深度拷贝
 * 合并多个对象(深度拷贝), 后面覆盖前面, 会改变第一个对象, 支持: Date, RegExp, Set, Map等类型的拷贝
 * @param target	目标对象或数组, 会被改变
 * @param srcs		被拷贝的对象或数组
 * @return			第一个参数
 */
function extend(target: any, ...srcs: Array<any>): any {
  for (const src of srcs) {
    if (src) {
      copy(target, src);
    }
  }
  return target;
}
//endregion
//region getSerialExecutor 获取同步执行器
function getSerialExecutor() {
  let promise: Promise<any> = Promise.resolve();
  return function <P extends any[], R>(func: (...args: P) => R, ...args: P): Promise<Awaited<R>> {
    promise = promise.then(() => func(...args));
    return promise;
  };
}
//endregion
//region getLatestExecutor 获取最近结果执行器
function getLatestExecutor<R>(throwError: false): <P extends any[]>(
  func: (...args: P) => R | Promise<R>,
  ...args: P
) => Promise<{
  data: Awaited<R>;
  //是否是最近的执行
  latestExecute: boolean;
  //最近的执行是否已经完成
  complete: boolean;
}>;
function getLatestExecutor<R>(throwError?: true): <P extends any[]>(func: (...args: P) => R | Promise<R>, ...args: P) => Promise<Awaited<R>>;
function getLatestExecutor<R>(throwError = true) {
  let globalPromise: Promise<Awaited<R>>;
  let complete = true;
  return function <P extends any[]>(
    func: (...args: P) => R | Promise<R>,
    ...args: P
  ): Promise<
    | Awaited<R>
    | {
        data: Awaited<R>;
        latestExecute: boolean;
        complete: boolean;
      }
  > {
    const curPromise = Promise.resolve(func(...args));
    globalPromise = curPromise;
    if (!throwError) {
      complete = false;
      curPromise.finally(() => {
        if (curPromise === globalPromise) {
          complete = true;
        }
      });
    }
    return curPromise.then((data) => {
      if (throwError) {
        if (curPromise !== globalPromise) {
          throw new Error('已过时');
        }
        return data;
      } else {
        return {
          data,
          latestExecute: curPromise === globalPromise,
          complete,
        };
      }
    });
  };
}
//endregion
//region getConcurrentExecutor 获取并发执行器
function getConcurrentExecutor(maxConcurrent: number) {
  let curConcurrent = 0;
  const queue: Array<() => void> = [];
  function notify() {
    if (queue.length) {
      queue.shift()!();
    } else {
      --curConcurrent;
    }
  }
  return function <P extends any[], R>(task: (...args: P) => R | Promise<R>, ...args: P): Promise<R> {
    return new Promise<R>((resolve) => {
      if (curConcurrent < maxConcurrent) {
        ++curConcurrent;
        return resolve(task(...args));
      } else {
        queue.push(() => {
          resolve(task(...args));
        });
      }
    }).finally(notify);
  };
}
//endregion
//region nodeRemove
function nodeRemove(node: Node): Node | false {
  if (node.parentNode) {
    return node.parentNode.removeChild(node);
  }
  return false;
}
//endregion
//region chooseFile
function chooseFile({ multiple = true, accept = '' }: ChooseFileOption = {}) {
  const inputElement = document.createElement('input');
  return new Promise<File[] | null>((resolve) => {
    inputElement.type = 'file';
    inputElement.accept = accept;
    inputElement.multiple = multiple;
    inputElement.onchange = () => {
      const { files } = inputElement;
      if (files?.length) {
        const list = new Array(files.length);
        for (let i = 0; i < files.length; ++i) {
          list[i] = files[i];
        }
        resolve(list);
      } else {
        resolve(null);
      }
    };
    inputElement.style.display = 'none';
    const onFocus = () => {
      off();
      self.setTimeout(() => {
        resolve(null);
      }, 500);
    };
    const [on, off] = bindEvent('focus', onFocus, { capture: true });
    on();
    document.body.appendChild(inputElement);
    inputElement.click();
  }).finally(() => {
    nodeRemove(inputElement);
  });
}
//endregion
//region downloadUrl
function downloadUrl(url: string, fileName?: string) {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  fileName && link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
//endregion
//region numberFormat
/**
 * 格式化金额, 把一个实数格式化为整数部分每3位数一个逗号分隔
 * @param value				被格式化的实数
 * @param [decimalDigits]	保留的小数位数
 * @param [option]			选项
 * @return 格式化后的字符串
 */
function numberFormat(value: number | string, decimalDigits?: number, option?: NumberFormatOption): string {
  const { separator = ',', count = 3, unit } = option || {};
  if (typeof value === 'string') {
    value = Number(value);
  }
  if (!Number.isFinite(value)) {
    return value + '';
  }
  let suffix = '';
  if (unit) {
    [value, suffix] = unit(value);
  }
  value = value.toFixed(decimalDigits);
  if (value.indexOf('e') !== -1) {
    return value;
  }
  if (count > 0 && separator) {
    const p = value.indexOf('.');
    value = p === -1 ? _integerFormat(value, separator, count) : _integerFormat(value.slice(0, p), separator, count) + value.slice(p);
  }
  return value + suffix;
}
/**
 * 格式化金额的整数部分
 * @param value		金额的整数部分
 * @param separator	分隔符
 * @param count		分隔数量
 * @return 格式化后的字符串
 */
function _integerFormat(value: string, separator: string, count: number): string {
  let pre = '';
  if (value[0] === '-') {
    pre = '-';
    value = value.slice(1);
  }
  const len = value.length;
  let pos = len % count || count;
  let str = value.slice(0, pos);
  while (pos < len) {
    const next = pos + count;
    str += separator + value.slice(pos, next);
    pos = next;
  }
  return pre + str;
}
//endregion
//region storageFormat
const storageUnit = ['B', 'KB', 'MB', 'GB', 'TB'];
/**
 * 格式化存储数值
 * @param size				比特数
 * @param decimalDigits		小数位数
 * @param [margin='']		数值和单位间的字符串
 * @return 格式化后的字符串
 */
function storageFormat(size: number | string, decimalDigits?: number, margin = ''): string {
  return numberFormat(size, decimalDigits, {
    unit(val: number) {
      let i = 0;
      while (val >= 1024 && i < storageUnit.length - 1) {
        val /= 1024;
        ++i;
      }
      return [val, margin + storageUnit[i]];
    },
  });
}
//endregion
//region waitTime
/**
 * 等待指定毫秒数的Promise
 * @param [time]	毫秒数
 * @return Promise
 */
function waitTime(time?: number): Promise<void> {
  return new Promise<void>(function (resolve) {
    if (time == null) {
      // @ts-ignore
      self.requestAnimationFrame(resolve);
    } else {
      self.setTimeout(resolve, time);
    }
  });
}
//endregion
//region parseAttachment
function parseAttachment(attachment: string): Array<{
	name:string;
	url:string;
}> {
	if (!attachment){
		return [];
	}
	return attachment.split(',')
		.filter((url) => url.trim())
		.map((url) => {
			return {
				name:url.slice(url.lastIndexOf('/') + 1),
				url:getFileAccessHttpUrl(url),
			}
		});
}
//endregion
//region createVueInstance
interface CreateVueInstanceContext<T> {
	destroy: () => void;
	resolve: (value: T) => void;
	reject: (reason?: any) => void;
}

interface CreateVueInstanceOptions {
	parent?: ComponentInternalInstance;
	setup?: () => void;
}

type CreateVueInstanceRender<T> = (context: CreateVueInstanceContext<T>) => any;

/**
 * 创建独立的 Vue 组件实例（Vue3 版本）
 * @param render 渲染函数，接收 context 参数，返回 VNode
 * @param options 配置选项
 * @param options.parent 父组件实例（可选），用于继承 provide/inject 并联动生命周期
 * @param options.setup 在组件 setup() 内部执行的回调（可选）
 * @returns Promise<T> 返回 render 函数中 resolve 的值
 */
function createVueInstance<T = void>(
	render: CreateVueInstanceRender<T>,
	{ parent, setup }: CreateVueInstanceOptions = {},
): Promise<T> {
	// 防止影响 currentInstance
	return Promise.resolve().then(() => {
		return new Promise<T>((resolve, reject) => {
			let destroyed = false;
			const context: CreateVueInstanceContext<T> = {
				destroy() {
					if (!destroyed) {
						destroyed = true;
						vueRender(null, element);
						nodeRemove(element);
					}
				},
				resolve,
				reject,
			};
			const element = document.createElement('div');
			document.body.appendChild(element);
			setup?.();
			const vnode = render(context);
			// 继承父组件的 appContext（全局组件、指令、插件等）
			if (parent) {
				vnode.appContext = parent.appContext;
			}
			vueRender(vnode, element);
			// 联动父组件生命周期
			if (parent) {
				onBeforeUnmount(context.destroy, parent);
				onActivated(() => {
					if (!destroyed) {
						document.body.appendChild(element);
					}
				}, parent);
				onDeactivated(() => {
					if (!destroyed) {
						nodeRemove(element);
					}
				}, parent);
			}
		});
	});
}
//endregion
//region convertSecurity
function convertSecurity(val:string):'core' | 'important' | 'general' | 'non'{
	return val === '3'
		? 'core'
		: val === '2'
			? 'important'
			: val === '1'
				? 'general'
				: 'non';
}
//endregion

export * from './node';
export {
  toCssLength,
  debounce,
  throttle,
  lazyTask,
  operateDom,
  delayReadyToPromise,
  noop,
  beforeProcessor,
  createGetter,
  bindEvent,
  createMouseEvent,
  numberBetween,
  platform,
  toValue,
  stateSwitcher,
  loopTree,
  extend,
  copyReplace,
  copyCover,
  copyCustom,
  getSerialExecutor,
  getLatestExecutor,
  getConcurrentExecutor,
  nodeRemove,
  chooseFile,
  downloadUrl,
  numberFormat,
  storageFormat,
  waitTime,
  parseAttachment,
  createVueInstance,
  convertSecurity,
};
