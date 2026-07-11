// 放在文件最顶部
// 全局模拟axios模块，拦截所有真实网络请求
import { createHttpError, createHttpErrorTest } from '@/__tests__/utils/httpTestUtils';

import { describe, vi, beforeEach } from 'vitest';
import type { requestType, responseType } from '#/http';
import { httpClient } from '@/request-core/http-client';
import { RequestEnum } from '@/enums/httpEnum';
import { configMap } from '@/__tests__/settings';
import { httpEmitter } from '@/__tests__/utils/httpUtils';

// 空对象泛型占位：无自定义请求头、无额外配置、无初始参数
type EmptyObj = Record<string, never>;

const http = httpEmitter([
  {
    error: createHttpError(401),
  },
  {
    error: createHttpError(403),
  },
  {
    error: createHttpError(404),
  },
  {
    error: createHttpError(500),
  },
]);

// 初始化请求工厂，传入测试环境基础接口地址
const { RequestFactoryWrapper } = httpClient({
  apiUrl: configMap.c1.apiUrl,
  http,
});

/**
 * 每个测试用例执行前钩子：环境重置，用例之间状态隔离
 */
beforeEach(() => {
  // 清空所有mock函数的调用记录、参数、返回值
  vi.clearAllMocks();
  // 清空本地存储，避免上一个用例残留token污染当前用例
  localStorage.clear();
});

/**
 * 封装GET /user接口
 * 泛型约束：请求参数类型、响应返回类型
 * collectData：配置接口请求地址、请求方式、参数映射规则
 */
const request = RequestFactoryWrapper<requestType<EmptyObj, EmptyObj, EmptyObj>, responseType<any>>(
  { id: 1 }
).collectData(({ params }) => {
  return {
    url: '/user',
    method: RequestEnum.DELETE,
    params,
  };
});

// 测试分组：GET请求相关测试用例
describe('DELETE请求错误测试', () => {
  // ====================== HTTP 500 服务端异常场景 ======================
  // test('HTTP 500 服务器异常，请求库捕获并封装错误信息', async () => {
  //   mockAxiosInstance.request.mockClear();
  //
  //   // 模拟：axios请求抛出异常，HTTP状态码500（服务端崩溃类网络异常）
  //   mockAxiosInstance.request.mockRejectedValue({
  //     isAxiosError: true,
  //     response: {
  //       status: 500,
  //       statusText: 'Internal Server Error',
  //       data: { message: '服务器内部错误' },
  //     },
  //   });
  //
  //   let res;
  //   try {
  //     res = await request().response();
  //   } catch (err) {
  //     res = err;
  //   }
  //   // 核心断言
  //   expect(res.data).toBeNull();
  //   expect(res.error).not.toBeNull();
  // });
  createHttpErrorTest(() => request().response(), '测试DELETE 401错误请求', 401);
  createHttpErrorTest(() => request().response(), '测试DELETE 403错误请求', 403);
  createHttpErrorTest(() => request().response(), '测试DELETE 404错误请求', 404);
  createHttpErrorTest(() => request().response(), '测试DELETE 500错误请求', 500);
});
