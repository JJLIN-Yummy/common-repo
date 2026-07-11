// 放在文件最顶部

import { joinPathSegments } from '@common/tools';

import { describe, vi, beforeEach } from 'vitest';
import type { requestType, responseType } from '#/http';
import { httpClient } from '@/request-core/http-client';
import { RequestEnum } from '@/enums/httpEnum';
import { configMap } from '@/__tests__/settings';
import { createBusinessTest } from '@/__tests__/utils/httpTestUtils';
import { httpEmitter } from '@/__tests__/utils/httpUtils';
import { responseEnum } from '@/__tests__/responseEnum';

type EmptyObj = Record<string, never>;

const http = httpEmitter([
  {
    success: responseEnum.user,
  },
  {
    success: responseEnum.user,
  },
  {
    success: responseEnum.user,
  },
  {
    success: responseEnum.user,
  },
]);

const { RequestFactoryWrapper } = httpClient({
  apiUrl: configMap.c1.apiUrl,
  http,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

const request = RequestFactoryWrapper<
  requestType<{ id?: number }, EmptyObj, EmptyObj>,
  responseType<any>
>({ id: 1 }).collectData(({ params }) => {
  return {
    url: '/user' + joinPathSegments(params),
    method: RequestEnum.DELETE,
  };
});

describe('DELETE请求测试', () => {
  // ====================== 1. 正向：正常请求成功 ======================
  createBusinessTest(http, () => request({ params: {} }).response(), '无参DELETE请求', {
    method: RequestEnum.DELETE,
  });

  // ====================== 2. 带请求参数场景 ======================
  createBusinessTest(http, () => request({ params: { id: 1 } }).response(), '有参DELETE请求', {
    method: RequestEnum.DELETE,
    params: true,
  });

  // ====================== 3. 业务异常：业务码失败 ======================
  // test('后端业务返回错误，error被正常封装，data为null', async () => {
  //   mockAxiosInstance.request.mockResolvedValue({
  //     status: 200,
  //     statusText: 'OK',
  //     headers: {},
  //     config: {},
  //     data: {
  //       code: 40001,
  //       data: null,
  //       message: '用户不存在',
  //     },
  //   });
  //
  //   const res = await request().response();
  //   expect(res.data).toBeNull();
  //   expect(res.error).not.toBeNull();
  //   expect(res.error?.message).includes('用户不存在');
  // });
});
