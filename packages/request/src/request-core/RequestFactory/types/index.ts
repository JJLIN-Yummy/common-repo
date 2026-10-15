import type { RequestEnum } from '@/enums/httpEnum';

// todo: 类型以后改
export type RequestCoreConfigType = {
  signal?: AbortSignal;
  [key: string]: any;
};
export type RequestCoreOptionsType = {
  // 是否返回原生响应头
  isReturnNativeResponse?: boolean;
  // 是否携带token
  withToken?: boolean;
  isMergeUrl?: boolean;
};

export interface RequestCore {
  request(config: RequestCoreConfigType, options?: RequestCoreOptionsType): Promise<object>;
  apiUrl: string;
}

export type requestOption<P, D> = {
  url: string;
  method: keyof typeof RequestEnum;
  data?: D;
  params?: P;
  headers?: { [key in string]: any };
};

export interface ResponseData {
  IsSuccess?: boolean;
  Message?: string;
  Value?: object;
}
