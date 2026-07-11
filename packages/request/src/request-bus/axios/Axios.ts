import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { type CreateAxiosOptions, type RequestOptions, type Result } from './types';

import { AxiosCanceler } from './axiosCancel';
import type { RequestCore } from '@/request-core/RequestFactory/types';
import { deepClone, isFunction } from '@common/tools';

export class VAxios implements RequestCore {
  private axiosInstance: AxiosInstance;
  public apiUrl: string;

  constructor(private options: CreateAxiosOptions) {
    this.axiosInstance = axios.create(this.options); //初始化
    this.setupInterceptors(); //设置拦截器
    this.apiUrl = this.options?.requestOptions?.apiUrl ?? '';
  }

  request<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    let conf: AxiosRequestConfig = deepClone(config);
    const transform = this.getTransform();
    // console.log("基础配置",this.options);
    // console.log("运行时配置",config);
    // console.log("补充配置",options)

    const { requestOptions } = this.options;
    const opt: RequestOptions = Object.assign({}, requestOptions, options);

    const { beforeRequestHook, requestCatch, transformRequestData } = transform || {};
    if (beforeRequestHook && isFunction(beforeRequestHook)) {
      conf = beforeRequestHook(conf, opt);
    }
    // @ts-expect-error 类型修复
    conf.requestOptions = opt;

    // console.log(conf)

    // console.log('最终配置',conf)
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .request<any, AxiosResponse<Result>>(conf)
        .then((res) => {
          // 请求是否被取消
          const isCancel = axios.isCancel(res);
          if (transformRequestData && isFunction(transformRequestData) && !isCancel) {
            try {
              const ret = transformRequestData(res, opt);
              resolve(ret);
            } catch (err) {
              reject(err || new Error('request error!'));
            }
            return;
          }
          resolve(res as unknown as Promise<T>);

          // resolve(res);
        })
        .catch((e: Error) => {
          if (requestCatch && isFunction(requestCatch)) {
            reject(requestCatch(e));
            return;
          }
          reject(e);
        });
    });
  }

  private getTransform() {
    const { transform } = this.options;
    return transform;
  }

  /**
   * @description:  创建axios实例
   */
  // @ts-expect-error 类型修复
  private createAxios(config: CreateAxiosOptions): void {
    this.axiosInstance = axios.create(config);
  }

  //拦截器配置
  private setupInterceptors() {
    const transform = this.getTransform();
    if (!transform) {
      return;
    }

    const {
      requestInterceptors,
      requestInterceptorsCatch,
      responseInterceptors,
      responseInterceptorsCatch,
    } = transform;

    const axiosCanceler = new AxiosCanceler();

    // 请求拦截器配置处理
    this.axiosInstance.interceptors.request.use((config) => {
      // const withToken = config?.requestOptions?.withToken ? true : false;
      // console.log("请求拦截器配置",config)

      const {
        headers: { ignoreCancelToken },
      } = config;
      const ignoreCancel =
        ignoreCancelToken !== undefined
          ? ignoreCancelToken
          : this.options.requestOptions?.ignoreCancelToken;

      // @ts-expect-error 类型修复
      !ignoreCancel && axiosCanceler.addPending(config);

      if (requestInterceptors && isFunction(requestInterceptors)) {
        // @ts-expect-error 类型修复
        config = requestInterceptors(config, this.options);
      }

      // //设置token
      // if(config?.requestOptions?.withToken){ //如果需要携带token,
      //   if(config.requestOptions?.withToken === true){
      //     config.headers.Authorization = `Bearer ${JSON.parse(localStorage.getItem(ACCESS_TOKEN) || '{}').value}`;
      //   }else if(this.checkWithTokenUrl(config.url)){
      //     //如果是登录接口，则不携带token
      //     config.headers.Authorization = `Bearer ${JSON.parse(localStorage.getItem(ACCESS_TOKEN) || '{}').value}`;
      //   }
      // }
      // console.log("----请求拦截器---")

      return config;
    }, undefined);

    // 请求拦截器错误捕获
    requestInterceptorsCatch &&
      isFunction(requestInterceptorsCatch) &&
      this.axiosInstance.interceptors.request.use(undefined, requestInterceptorsCatch);

    // 响应结果拦截器处理
    this.axiosInstance.interceptors.response.use((res: AxiosResponse<any>) => {
      //todo:全局取消请求
      // @ts-expect-error 类型修复
      res && axiosCanceler.removePending(res.config);
      if (responseInterceptors && isFunction(responseInterceptors)) {
        res = responseInterceptors(res);
      }

      return res;
    }, undefined);

    // 响应结果拦截器错误捕获
    responseInterceptorsCatch &&
      isFunction(responseInterceptorsCatch) &&
      this.axiosInstance.interceptors.response.use(undefined, responseInterceptorsCatch);
  }
}
