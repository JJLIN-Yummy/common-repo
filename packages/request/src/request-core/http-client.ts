import { createAxios } from '@/request-bus/axios';
import type { requestType, responseType } from '#/http';
import requestManager from '@/request-core/RequestFactoryInstanceManager/RequestFactoryInstanceManager';
import type { pluginItemType } from '@/request-core/RequestFactory/RequestFactory';
import RequestFactory from '@/request-core/RequestFactory/RequestFactory';
import { type RequestCore } from '@/request-core/RequestFactory/types';

export const httpClient = (config: {
  http?: RequestCore;
  apiUrl: string;
  urlPrefix?: string;
  globalPlugins?: pluginItemType[];
}) => {
  let http;
  if (!config.http) {
    http = createAxios({
      requestOptions: {
        apiUrl: config.apiUrl,
        urlPrefix: config.urlPrefix ?? '',
      },
    });
  } else {
    http = config.http;
  }

  RequestFactory.createGlobalPlugin(config.globalPlugins ?? []);

  const RequestFactoryWrapper = <T extends requestType, R extends responseType>(option: {
    id: number | string;
  }) => {
    return new RequestFactory<T['params'], T['query'], T['data'], R>({
      id: option.id,
      http,
      manager: requestManager,
    });
  };

  return {
    RequestFactoryWrapper,
  };
};
