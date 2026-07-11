/**
 * 数据处理类，可以根据项目自行配置
 */
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { RequestOptions, Result } from './types';
import type { ResponseField } from '@/enums/httpEnum';
import type { RequestErrorType } from '@/enums/codeEnum';

export interface CreateAxiosOptions extends AxiosRequestConfig {
  authenticationScheme?: string;
  transform?: AxiosTransform;
  requestOptions?: RequestOptions;
}

export abstract class AxiosTransform {
  /**
   * @description: 请求之前处理配置
   * @description: Process configuration before request
   */
  beforeRequestHook?: (config: AxiosRequestConfig, options: RequestOptions) => AxiosRequestConfig;

  /**
   * @description: 请求成功处理
   */
  transformRequestData?: (res: AxiosResponse<Result>, options: RequestOptions) => any;

  /**
   * @description: 请求失败处理
   */
  requestCatch?: (e: Error) => any;

  /**
   * @description: 请求之前的拦截器
   */
  requestInterceptors?: (
    config: AxiosRequestConfig,
    options: CreateAxiosOptions
  ) => AxiosRequestConfig;

  /**
   * @description: 请求之后的拦截器
   */
  responseInterceptors?: (res: AxiosResponse<any>) => AxiosResponse<any>;

  /**
   * @description: 请求之前的拦截器错误处理
   */
  requestInterceptorsCatch?: (error: Error) => void;

  /**
   * @description: 请求之后的拦截器错误处理
   */
  responseInterceptorsCatch?: (error: AxiosError) => Promise<any>;
}

/** 后端统一返回结构 */
export interface BackendResponse<T = unknown> {
  [ResponseField.ISSUCCESS]: boolean;
  [ResponseField.MESSAGE]: string;
  [ResponseField.VALUE]: T;
}

/** 统一错误封装结构 RequestErrorInfo */
export interface RequestErrorInfo {
  type: RequestErrorType;
  message: string;
  code?: number | string;
  raw: AxiosError | Error;
  config?: AxiosRequestConfig;
  response?: AxiosResponse;
  /** 后端403/业务错误附带的详情数据 */
  detail?: unknown;
}
