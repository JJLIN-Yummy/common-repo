import type { Axios } from 'axios';
import { type AxiosInstance } from 'axios';
import { type MockedFunction, test, expect } from 'vitest';
import type { RequestEnum } from '@/enums/httpEnum';
import type { RequestCore } from '@/request-core/RequestFactory/types';
import type { RequestCoreTestType } from '@/__tests__/utils/httpUtils';

export type MockAxiosInstance = AxiosInstance & {
  request: MockedFunction<typeof Axios.prototype.request>;
};
/**
 * 生成 HTTP 异常（4xx/5xx）
 */
export function createHttpError(status: number, message = '服务器异常') {
  const statusTextMap: Record<number, string> = {
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return {
    isAxiosError: true,
    response: {
      status,
      statusText: statusTextMap[status] || 'Error',
      data: { message },
    },
  };
}

/**
 * 生成业务异常（HTTP 200，业务码错误）
 */
export function createBusinessError(code: number, message = '业务异常') {
  return {
    status: code,
    statusText: 'OK',
    headers: {},
    config: {},
    data: {
      code,
      data: null,
      message,
    },
  };
}

/**
 * HTTP 异常通用测试
 */
export function createHttpErrorTest(
  requestFn: () => Promise<{ data: unknown; error: unknown }>,
  testName: string,
  status: number
) {
  return test(testName, async () => {
    let res;
    try {
      res = await requestFn();
    } catch (err) {
      res = err;
    }

    expect(res.data).toBeNull();
    expect(res.error).toBeDefined();
    expect(res.error.response.status).toBe(status);
  });
}

/**
 * 业务异常通用测试
 */
export function createBusinessErrorTest(
  mockAxiosInstance: () => MockAxiosInstance,
  requestFn: () => Promise<{ data: unknown; error: unknown }>,
  testName: string,
  code: number
) {
  return test(testName, async () => {
    mockAxiosInstance().request.mockResolvedValue(createBusinessError(code));
    const res = await requestFn();

    expect(res.data).toBeNull();
    expect(res.error).toBeDefined();
    expect((res.error as any).code).toBe(code);
  });
}

/**
 * 业务
 */
export function createBusinessTest(
  http: RequestCoreTestType,
  requestFn: () => Promise<{ data: unknown; error: unknown }>,
  testName: string,
  option: {
    method: keyof typeof RequestEnum;
    data?: boolean;
    query?: boolean;
    params?: boolean;
  }
) {
  return test(testName, async () => {
    const res = await requestFn();

    // 拿到 axios.request 实际调用的配置
    const [requestConfig] = http.requestSpy.mock.calls[0];

    if (option.query) {
      expect(requestConfig.params).not.toBeNull();
    } else {
      expect([null, undefined, {}]).toContainEqual(requestConfig.params);
    }

    if (option.data) {
      expect(requestConfig.data).not.toBeNull();
    } else {
      expect([null, undefined, {}]).toContainEqual(requestConfig.data);
    }

    // 断言3：请求方式、地址校验
    expect(requestConfig.method).toBe(option.method);

    expect(res.data).toBeDefined();
    expect(res.error).toBeNull();
    expect((res.data as any).data.code).toBe(200);
  });
}

/**
 * 缓存通用测试
 */
export function createCacheTest(
  // mockAxiosInstance: () => MockAxiosInstance,
  http: RequestCore,
  requestFn: (...args: any[]) => Promise<{ data: unknown; error: unknown }>,
  cleanCache: () => any
) {
  test('两次相同请求', async () => {
    // mockAxiosInstance().request.mockResolvedValue(responseEnum.user);
    const res1 = await requestFn();
    const res2 = await requestFn();

    // 断言1：两次返回数据完全一致（同一个缓存引用）
    expect(res1.data).toStrictEqual(res2.data);
    // 断言2：axios 只调用了1次，第二次走缓存没发请求
    expect(http.request).toHaveBeenCalledTimes(1);
  });

  test('两次不同请求', async () => {
    // mockAxiosInstance().request.mockResolvedValue(responseEnum.user);
    cleanCache();
    await requestFn();
    cleanCache();
    await requestFn();

    // 断言1：axios 只调用了1次，第二次走缓存没发请求
    expect(http.request).toHaveBeenCalledTimes(3);
  });
}

/**
 * 请求取消测试：取消掉前一次的请求
 */
export function createCancelTest(
  requestFn: (...args: any[]) => Promise<{ data: unknown; error: unknown }>
) {
  test('重复发起相同请求，上一个请求会被自动取消', async () => {
    let res1;
    requestFn().catch((err) => {
      res1 = err;
    });

    const res2 = await requestFn();

    expect(res1.error).toBeDefined();
    expect(res1.data).toBeNull();

    expect(res2.data).toBeDefined();
    expect(res2.error).toBeNull();
  }, 10000);
}

export function createReReqTest(
  http: RequestCore,
  requestFn: (...args: any[]) => Promise<{ data: unknown; error: unknown }>,
  count: number[]
) {
  test('请求失败自动重试次数', async () => {
    await requestFn();

    expect(http.request).toHaveBeenCalledTimes(count[0]);
  });

  test('多个借口请求失败自动重试', async () => {
    await requestFn();
    await requestFn();
    expect(http.request).toHaveBeenCalledTimes(count[1]);
  });
}
