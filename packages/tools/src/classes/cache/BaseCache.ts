import type { ICache, ICacheValue } from '@/classes/cache/interface/ICache';

export const DEFAULT_EXPIRE_DERATION = 60000; //默認過期時長60s
type cacheMapType = Map<any, ICacheValue>;
export type traverseType = { key: number | string; value: any };

export class BaseCache implements ICache {
  private cacheMap: cacheMapType = new Map();

  get(key) {
    const value = this.cacheMap.get(key);
    if (!value) return null;

    if (new Date().getTime() > value?.expire_time) {
      this.delete(key); //若緩存過期，則刪除緩存。
      return null;
    }

    return value?.value;
  }

  set(key, value, duration = DEFAULT_EXPIRE_DERATION): cacheMapType {
    return this.cacheMap.set(key, this.generateCacheValue(value, duration));
  }

  delete(key) {
    return this.cacheMap.delete(key);
  }

  generateCacheValue(value: any, duration: number): ICacheValue {
    return {
      expire_time: new Date().getTime() + duration,
      value,
    };
  }

  traverse(): Array<traverseType> {
    const arr: Array<traverseType> = [];
    for (const item of this.cacheMap) {
      arr.push({
        key: item[0],
        value: item[1],
      });
    }
    return arr;
  }
}
