// 放在文件最顶部

import { describe, vi, beforeEach } from 'vitest';
import type { requestType, responseType } from '#/http';
import { httpClient } from '@/request-core/http-client';
import { RequestEnum } from '@/enums/httpEnum';
import { configMap } from '@/__tests__/settings';
import { createHttpError, createReReqTest } from '@/__tests__/utils/httpTestUtils';
import { httpEmitter } from '@/__tests__/utils/httpUtils';
import { responseEnum } from '@/__tests__/responseEnum';

type EmptyObj = Record<string, never>;

const http = httpEmitter([
  {
    error: createHttpError(401),
  },
  {
    error: createHttpError(401),
  },
  {
    success: responseEnum.user,
  },
  {
    error: createHttpError(401),
  },
  {
    error: createHttpError(401),
  },
  {
    success: responseEnum.user,
  },
  {
    error: createHttpError(401),
  },
  {
    error: createHttpError(401),
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

const request = RequestFactoryWrapper<requestType<EmptyObj, EmptyObj, EmptyObj>, responseType<any>>(
  { id: 1 }
)
  .reRequest(5)
  .collectData(() => {
    return {
      url: '/user',
      method: RequestEnum.GET,
    };
  });

describe('GET请求重试测试', () => {
  // ====================== 1. 正向：正常请求成功 ======================
  createReReqTest(http, () => request({ query: {} }).response(), [3, 6]);
});
