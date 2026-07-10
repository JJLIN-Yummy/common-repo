import { isObject } from './is_';
import { isArray } from '@/MyArray';

export class MyObject extends Object {}

export function isPromise(value: { then?: unknown }) {
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    return typeof value.then === 'function';
  }

  return false;
}

/**
 *
 * @param obj 要判断的对象
 * @returns
 */
export function isNull(obj: unknown) {
  return obj === null || obj === undefined;
}

/**
 * 判斷是否為異步函數
 * @param cb
 * @returns
 */
type AnyFunction = (...args: unknown[]) => unknown;

/**
 * 判斷是否為函數
 * @param cb
 * @returns
 */
export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === 'function';
}

export function isAsyncFunction(cb: unknown): cb is (...args: unknown[]) => Promise<unknown> {
  if (!isFunction(cb)) return false;
  return cb.constructor.name === 'AsyncFunction';
}

/**
 * 深拷貝對象
 * @param source
 * @returns
 */
export function deepClone<T>(source: T, hash = new WeakMap<object, unknown>()): T {
  // 1. 基础类型 / null 直接返回
  if (source === null || typeof source !== 'object') {
    return source;
  }

  // 2. 处理循环引用：如果已经克隆过直接返回缓存
  if (hash.has(source)) {
    return hash.get(source) as T;
  }

  // 3. 二进制文件类：直接复用引用（这类无法深度拷贝）
  if (source instanceof Blob || source instanceof File) {
    return source;
  }

  // 4. Date
  if (source instanceof Date) {
    const cloneDate = new Date(source);
    hash.set(source, cloneDate);
    return cloneDate as T;
  }

  // 5. 正则
  if (source instanceof RegExp) {
    const cloneReg = new RegExp(source.source, source.flags);
    hash.set(source, cloneReg);
    return cloneReg as T;
  }

  // 6. Set
  if (source instanceof Set) {
    const cloneSet = new Set<unknown>();
    hash.set(source, cloneSet);
    source.forEach((val) => cloneSet.add(deepClone(val, hash)));
    return cloneSet as T;
  }

  // 7. Map
  if (source instanceof Map) {
    const cloneMap = new Map<unknown, unknown>();
    hash.set(source, cloneMap);
    source.forEach((val, key) => cloneMap.set(deepClone(key, hash), deepClone(val, hash)));
    return cloneMap as T;
  }

  // 8. 数组
  if (Array.isArray(source)) {
    const cloneArr: unknown[] = [];
    hash.set(source, cloneArr);
    source.forEach((item) => cloneArr.push(deepClone(item, hash)));
    return cloneArr as T;
  }

  // 9. 普通对象
  const cloneObj: Record<string, unknown> = {};
  hash.set(source, cloneObj);
  // 遍历自身可枚举属性
  Reflect.ownKeys(source).forEach((key) => {
    const desc = Object.getOwnPropertyDescriptor(source, key);
    if (desc?.enumerable) {
      cloneObj[key as string] = deepClone((source as Record<string, unknown>)[key as string], hash);
    }
  });

  return cloneObj as T;
}

export const getValueByPath = <T = unknown>(
  source: Record<string, unknown>,
  path: string[]
): T | undefined => {
  return path.reduce<unknown>((res, key) => {
    if (typeof res !== 'object' || res === null) return undefined;
    return (res as Record<string, unknown>)[key];
  }, source) as T | undefined;
};

/**
 * 深度合并对象/数组（支持数组深层合并、对象递归合并、基础类型覆盖）
 * @description
 * 1. 数组：按索引深层合并（长度取最大值，缺省项用另一数组的项补充）
 * 2. 对象：递归合并属性，target 覆盖 src 同属性（深层）
 * 3. 基础类型：target 覆盖 src
 * @param src 源对象/数组（被合并的基础）
 * @param target 目标对象/数组（合并的内容，优先级更高）
 * @returns 合并后的新对象/数组（不修改原数据）
 */
export function deepMerge<T = any>(
  src: Record<string, any> = {},
  target: Record<string, any> = {}
): T {
  // 先拷贝源数据，避免修改原对象/数组
  const result = isArray(src) ? [...src] : isObject(src) ? { ...src } : src;

  // 遍历 target 的所有键/索引
  for (const key in target) {
    // 跳过原型链属性
    if (!Object.prototype.hasOwnProperty.call(target, key)) continue;

    const targetValue = target[key];
    const srcValue = result[key];

    // 情况1：target 当前值是对象/数组，且 src 对应值也是对象/数组 → 递归合并
    if (isObject(targetValue) && isObject(srcValue)) {
      result[key] = deepMerge(srcValue, targetValue);
    }
    // 情况2：target 当前值是数组，src 对应值不是数组 → 直接赋值（覆盖）
    else if (isArray(targetValue) && !isArray(srcValue)) {
      result[key] = [...targetValue]; // 拷贝数组，避免引用
    }
    // 情况3：target 当前值是对象，src 对应值不是对象 → 直接赋值（覆盖）
    else if (isObject(targetValue) && !isObject(srcValue)) {
      result[key] = { ...targetValue }; // 拷贝对象，避免引用
    }
    // 情况4：基础类型/null/undefined → 直接覆盖
    else {
      result[key] = targetValue;
    }
  }

  return result as T;
}

/**
 * 按对象属性顺序拼接路径片段
 * @param params 参数对象 {a:1, b:2}
 * @returns 拼接后路径 /1/2
 */
export function joinPathSegments(params: Record<string, string | number>): string {
  const values = Object.values(params);
  return `/${values.join('/')}`;
}
export function joinSearchSegments(query: Record<string, string>): string {
  if (!query) return '';
  return '?' + new URLSearchParams(query).toString();
}

type PlainObject = Record<string, any>;

/**
 * 判断：大对象 a（缓存里的参数）是否 包含 条件对象 b（要删除的筛选条件）
 * 等价：b 的每一个键值，在 a 中必须存在且深度相等
 * @param a 缓存中的原始参数对象
 * @param b 传入的筛选条件对象
 * @returns a 完整包含 b → true
 */
export function isObjectContains(a: unknown, b: unknown): boolean {
  // 基础类型直接严格相等（兼容 NaN、±0）
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return Object.is(a, b);
  }

  // 数组：必须完全一致，不做子集包含
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return b.every((item, idx) => isObjectContains(a[idx], item));
  }

  // 一个数组一个普通对象，直接不匹配
  if (Array.isArray(a) || Array.isArray(b)) return false;

  const objA = a as PlainObject;
  const objB = b as PlainObject;

  // 遍历【条件对象 b】所有自身属性，每一个都要在 a 中存在且相等
  return Object.entries(objB).every(([key, valB]) => {
    // 只校验自身属性，排除原型链
    if (!Object.prototype.hasOwnProperty.call(objA, key)) {
      return false;
    }
    return isObjectContains(objA[key], valB);
  });
}
