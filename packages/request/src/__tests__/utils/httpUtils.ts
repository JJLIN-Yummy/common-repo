import type {
  RequestCore,
  RequestCoreConfigType,
  RequestCoreOptionsType,
} from '@/request-core/RequestFactory/types';
import type { createHttpError } from '@/__tests__/utils/httpTestUtils';
import type { Recordable } from '../../../../../build/types';
import { vi } from 'vitest';

//@ts-expect-error 类型修复
export type RequestCoreTestType = RequestCore & { requestSpy: ReturnType<vi.fn> };
export const httpEmitter: (
  templates: Array<{
    success?: {
      status: number;
      statusText: string;
      headers: Recordable<any>;
      config: Recordable<any>;
      data: any;
    };
    error?: ReturnType<typeof createHttpError>;
  }>
) => RequestCoreTestType = (templates) => {
  let index = 0;

  const requestSpy = vi.fn((config: RequestCoreConfigType, _options?: RequestCoreOptionsType) => {
    const p = new Promise<object>((resolve, reject) => {
      if (templates.length <= 0 || index >= templates.length) {
        reject({ msg: "'未知错误1'" });
        return;
      }
      if (!config) {
        reject({ msg: "'未知错误2'" });
        return;
      }

      const template = templates[index++];
      let timer: ReturnType<typeof setTimeout> | undefined;

      if (template.success) {
        timer = setTimeout(() => {
          resolve(template.success ?? {});
        }, 500);
      } else if (template.error) {
        reject(template.error);
      } else {
        reject({ msg: "'必须传入有效属性'" });
        return;
      }
      if (config.signal) {
        config.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);

            reject({ raw: new DOMException('The operation was aborted.', 'AbortError') });
          },
          { once: true }
        ); // once 只监听一次，自动移除
      }

      // reject('未知错误2');
    });
    return p;
  });

  return {
    request: requestSpy,
    requestSpy,
    apiUrl: 'http://127.0.0.1:3000',
  };
};
