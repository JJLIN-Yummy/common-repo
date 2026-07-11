// 放在文件最顶部

import { describe, vi, beforeEach } from 'vitest';
import type { requestType, responseType } from '#/http';
import { httpClient } from '@/request-core/http-client';
import { RequestEnum } from '@/enums/httpEnum';
import { configMap } from '@/__tests__/settings';
import { createCancelTest } from '@/__tests__/utils/httpTestUtils';
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
  .cancel()
  .collectData(() => {
    return {
      url: '/user',
      method: RequestEnum.GET,
    };
  });

describe('GET请求取消测试', () => {
  // ====================== 1. 正向：正常请求成功 ======================
  createCancelTest(() => request({ query: {} }).response());
});
