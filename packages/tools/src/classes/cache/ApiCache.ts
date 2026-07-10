//key=>data
import type { traverseType } from '@/classes/cache/BaseCache';
import { BaseCache } from '@/classes/cache/BaseCache';
import { MyObject } from '@/MyObject';
import type { ICache } from '@/classes/cache/interface/ICache';

export class ApiCache extends BaseCache {}

const apiCache = new ApiCache(); //單例模式
MyObject.freeze(apiCache);
export default apiCache;

//ApiId=>[key=>data]
export interface IApiCacheMap {
  get: (id: number | string, key: string) => any;
  set: (id: number | string, key: string, value: any, duration?: number | string) => void;
  getList: (id: number | string) => ICache | undefined;
  setList: (id: number | string, value: ICache) => unknown;
  deleteList: (key: number | string) => boolean;
  delete: (id: number | string, key: string) => boolean;
}
export class ApiCacheMap implements IApiCacheMap {
  public apiCacheMap: Map<number | string, ICache>;
  constructor() {
    this.apiCacheMap = new Map();
  }

  getList(id: number | string) {
    return this.apiCacheMap.get(id);
  }

  setList(id: number | string, value: ICache) {
    return this.apiCacheMap.set(id, value);
  }

  deleteList(key: number) {
    return this.apiCacheMap.delete(key);
  }

  get(id: number | string, key: string) {
    const list = this.getList(id);
    return list ? list.get(key) : list;
  }
  set(id: number | string, key: string, value: any, duration?: number) {
    const map = this.getList(id);
    if (map) {
      map.set(key, value, duration);
    } else {
      const cache = new ApiCache();
      cache.set(key, value, duration);
      this.apiCacheMap.set(id, cache);
    }
  }
  delete(id: number | string, key: string) {
    const map = this.getList(id);
    if (map) {
      return map.delete(key);
    }
    return true;
  }

  traverse(): Array<traverseType> {
    const arr: Array<traverseType> = [];
    for (const item of this.apiCacheMap) {
      arr.push({
        key: item[0],
        value: item[1],
      });
    }
    return arr;
  }
}

export const apiCacheMap = new ApiCacheMap(); //單例模式
MyObject.freeze(apiCacheMap);

/* 緩存刪除策略
    1. 某些請求呼叫成功後，一些請求需要刪除緩存。例如：廠區修改或者刪除之後，查詢GET請求需要刪除緩存
    2. 某些請求緩存過期之後，需要刪除緩存。
    3. 為了防止某些緩存佔用內存過大，需要定期清除緩存。
*/
