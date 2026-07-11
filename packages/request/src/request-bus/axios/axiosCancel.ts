import type { Canceler } from 'axios';
import qs from 'qs';

import { isFunction } from '@common/tools';
import { useGlobSetting } from '@/setting';

// 声明一个 Map 用于存储每个请求的标识 和 取消函数
let pendingMap = new Map<string, Canceler>();
const globSetting = useGlobSetting();
const apiUrl = globSetting.apiUrl || '';

type configType = {
  url: string;
  method: string;
  data?: Record<string, any>;
  params?: Record<string, any>;
  signal?: AbortSignal;
} & { fetchId: string };

export const getPendingUrl = (config: configType) => {
  return [
    config.fetchId,
    config.method,
    config.url?.includes(apiUrl) ? config.url : apiUrl + config.url,
    qs.stringify(config.data),
    qs.stringify(config.params),
  ].join('&');
};

export class AxiosCanceler {
  /**
   * 添加请求
   * @param {Object} config
   */
  addPending(config: configType) {
    this.removePending(config);
    const url = getPendingUrl(config);
    // todo:如果config不记录 cancelToken 看看能不能取消成功
    // config.cancelToken =
    //   config.cancelToken ||
    // new axios.CancelToken((cancel) => {
    //   if (!pendingMap.has(url)) {
    //     // 如果 pending 中不存在当前请求，则添加进去
    //     pendingMap.set(url, cancel);
    //   }
    // });

    const controller = new AbortController();
    config.signal = config.signal || controller.signal;
    if (!pendingMap.has(url)) {
      // 如果 pending 中不存在当前请求，则添加进去
      pendingMap.set(url, controller.abort.bind(controller));
    }
  }

  /**
   * @description: 清空所有pending
   */
  removeAllPending() {
    pendingMap.forEach((cancel) => {
      cancel && isFunction(cancel) && cancel();
    });
    pendingMap.clear();
  }

  /**
   * 移除请求
   * @param {Object} config
   */
  removePending(config: configType) {
    const url = getPendingUrl(config);
    if (pendingMap.has(url)) {
      // 如果在 pending 中存在当前请求标识，需要取消当前请求，并且移除
      const cancel = pendingMap.get(url);
      cancel && cancel();
      pendingMap.delete(url);
    }
  }

  /**
   * @description: 重置
   */
  reset(): void {
    pendingMap = new Map<string, Canceler>();
  }
}
