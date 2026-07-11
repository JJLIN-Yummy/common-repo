// 放在文件最顶部

import { joinSearchSegments } from '@common/tools';

import { describe } from 'vitest';
import type { requestType, responseType } from '#/http';
import { httpClient } from '@/request-core/http-client';
import { RequestEnum } from '@/enums/httpEnum';
import { configMap } from '@/__tests__/settings';
import { createCacheTest } from '@/__tests__/utils/httpTestUtils';
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

const request = RequestFactoryWrapper<
  requestType<EmptyObj, { id?: string }, EmptyObj>,
  responseType<any>
>({ id: 1 })
  .cache()
  .collectData(({ query }) => {
    return {
      url: '/user' + joinSearchSegments(query),
      method: RequestEnum.GET,
    };
  });

describe('请求取消测试', () => {
  // ====================== 1. 正向：正常请求成功 ======================
  createCacheTest(
    http,
    () => request({ query: {} }).response(),
    () => request({ query: {} }).cleanCache()
  );
});
