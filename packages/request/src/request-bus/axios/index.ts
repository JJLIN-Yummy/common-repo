// axios配置  可自行根据项目进行更改，只需更改该文件即可，其他文件可以不动
import { VAxios } from './Axios';
import type { AxiosTransform, BackendResponse } from './axiosTransform';
import axios, { type AxiosResponse } from 'axios';
import { joinTimestamp, formatRequestDate, rejectWrap } from './helper';
import { RequestEnum, ContentTypeEnum, ResponseField } from '@/enums/httpEnum';
import { type RequestOptions, type Result, type CreateAxiosOptions } from './types';
import { useGlobSetting } from '@/setting';
import { deepMerge, isString } from '@common/tools';
import { RequestErrorType } from '@/enums/codeEnum';

const globSetting = useGlobSetting();
const urlPrefix = globSetting.urlPrefix || '';
// const baseUrl = globSetting.baseUrl || '';

//响应的map
// if(!window.responseMap){
//   window.responseMap = new WeakMap() //缓存，不想重复发送相同请求
//
// }
// //响应的路径
// if(!window.responseObj){
//   window.responseObj = {} //记录路径
// }

/**
 * @description: 数据处理，方便区分多种处理方式
 */
const transform: AxiosTransform = {
  /**
   * @description: 处理请求数据
   */
  transformRequestData: (res: AxiosResponse<Result>, options: RequestOptions) => {
    // console.log('响应数据转换器', res);
    const {
      // isShowMessage = true,
      // isShowErrorMessage,
      // isShowSuccessMessage,
      // successMessageText,
      // errorMessageText,
      isTransformResponse,
      isReturnNativeResponse,
    } = options;
    // 是否返回原生响应头 比如：需要获取响应头时使用该属性
    // console.log('处理响应',options)
    if (isReturnNativeResponse) {
      return res;
    }
    // 不进行任何处理，直接返回
    // 用于页面代码可能需要直接获取code，data，message这些信息时开启
    if (!isTransformResponse) {
      return res.data;
    }
    return res.data;
  },

  // 请求之前处理config
  beforeRequestHook: (config, options) => {
    // console.log('请求之前处理钩子');

    const {
      apiUrl,
      joinPrefix,
      joinParamsToUrl,
      formatDate,
      joinTime = true,
      urlPrefix,
      isMergeUrl = true,
    } = options;

    // const isUrlStr = isUrl(config.url as string);

    //
    joinPrefix;
    urlPrefix;
    if (isMergeUrl) {
      config.url = `${apiUrl}${urlPrefix}${config.url}`;
    }

    // if (!isUrlStr && joinPrefix && isMergeUrl) {
    //   config.url = `${urlPrefix}${config.url}`;
    // }

    // if (!isUrlStr && apiUrl && isString(apiUrl) && isMergeUrl) {
    //   config.url = `${apiUrl}${config.url}`;
    // }
    const params = config.params || {};
    const data = config.data || false;
    if (config.method?.toUpperCase() === RequestEnum.GET) {
      if (!isString(params)) {
        // 给 get 请求加上时间戳参数，避免从缓存中拿数据。
        config.params = Object.assign(params || {}, joinTimestamp(joinTime, false));
      } else {
        // 兼容restful风格
        config.url = config.url + params + `${joinTimestamp(joinTime, true)}`;
        config.params = undefined;
      }
    } else {
      if (!isString(params)) {
        formatDate && formatRequestDate(params);
        if (Reflect.has(config, 'data') && config.data && Object.keys(config.data).length > 0) {
          config.data = data;
          config.params = params;
        } else {
          config.data = params;
          config.params = undefined;
        }
        if (joinParamsToUrl) {
          config.url += new URLSearchParams(
            Object.assign({}, config.params, config.data)
          ).toString();
        }
      } else {
        // 兼容restful风格
        config.url = config.url + params;
        config.params = undefined;
      }
    }
    return config;
  },

  /**
   * @description: 请求拦截器处理
   */
  requestInterceptors: (config, options) => {
    // console.log('请求拦截器');
    // 请求之前处理config //todo:到时候加上token
    const token = globSetting.token;
    // @ts-expect-error 类型修复
    if (token && config?.requestOptions?.withToken !== false) {
      // jwt token
      // @ts-expect-error 类型修复
      config.headers.Authorization = options.authenticationScheme
        ? `${options.authenticationScheme} ${token}`
        : token;
    }
    return config;
  },

  /**
   * 返回Promise.reject会走requestCatch,其他全都视为成功
   * @description: 响应错误处理
   */
  responseInterceptorsCatch: (err) => {
    // console.log('响应错误拦截器', err);
    // console.log('===', error);
    // const $dialog = window['$dialog'];
    // const $message = window['$message'];
    // const { response, code, message } = error || {};
    // 第1步：判断是否主动取消请求

    // 已经封装好的统一错误，直接抛出
    if ('type' in err) {
      return Promise.reject(err);
    }

    // 1. 主动取消请求
    if (axios.isCancel(err)) {
      return rejectWrap(RequestErrorType.CANCEL, '当前请求已取消', err);
    }

    // 2. 无响应：网络类错误（跨域、断网、超时、连接拒绝）
    if (!err.response) {
      if (err.code === 'ECONNABORTED') {
        return rejectWrap(RequestErrorType.TIMEOUT, '请求超时，请稍后重试', err);
      }
      if (!navigator.onLine) {
        return rejectWrap(RequestErrorType.OFFLINE, '当前网络已断开，请检查网络', err);
      }
      return rejectWrap(RequestErrorType.NETWORK, '网络异常，请检查服务与跨域配置', err);
    }

    // 3. 存在响应，处理HTTP状态码
    const { status, data } = err.response;
    const resData = data as BackendResponse;
    const msg = resData?.[ResponseField.MESSAGE] || '';

    switch (status) {
      case 400:
        return rejectWrap(
          RequestErrorType.PARAM_ERR,
          msg || '请求参数错误',
          err,
          status,
          resData?.[ResponseField.VALUE]
        );
      case 401:
        return rejectWrap(
          RequestErrorType.TOKEN_EXPIRE,
          msg || '登录已失效，请重新登录',
          err,
          status
        );
      case 403:
        // 后端403携带Value权限详情，存入detail
        return rejectWrap(
          RequestErrorType.FORBIDDEN,
          msg || '权限不足，禁止访问',
          err,
          status,
          resData?.[ResponseField.VALUE]
        );
      case 404:
        return rejectWrap(RequestErrorType.NOT_FOUND, '接口地址不存在', err, status);
      case 405:
        return rejectWrap(RequestErrorType.METHOD_NOT_ALLOWED, '请求方式不允许', err, status);
      case 500:
        return rejectWrap(
          RequestErrorType.SERVER_INTERNAL_ERR,
          msg || '服务器内部异常',
          err,
          status
        );
      case 502:
      case 503:
        return rejectWrap(RequestErrorType.SERVER_UNAVAILABLE, '服务暂时不可用', err, status);
      case 504:
        return rejectWrap(RequestErrorType.GATEWAY_TIMEOUT, '网关请求超时', err, status);
      default:
        return rejectWrap(RequestErrorType.HTTP_UNKNOWN_ERR, `请求异常[${status}]`, err, status);
    }
  },
  responseInterceptors: (res) => {
    // console.log('响应拦截器', res);
    return res;
  },
  requestCatch: (e) => {
    // console.log('响应错误处理器', e);
    return e;
  },
};

export function createAxios(opt?: Partial<CreateAxiosOptions>) {
  const axios = new VAxios(
    deepMerge(
      {
        timeout: 300 * 1000,
        authenticationScheme: 'Bearer',
        // 接口前缀
        prefixUrl: urlPrefix,
        headers: { 'Content-Type': ContentTypeEnum.JSON },
        // 数据处理方式
        transform,
        // 配置项，下面的选项都可以在独立的接口请求中覆盖
        requestOptions: {
          // 默认将prefix 添加到url
          joinPrefix: true,
          // 是否返回原生响应头 比如：需要获取响应头时使用该属性
          isReturnNativeResponse: false,
          // 需要对返回数据进行处理
          isTransformResponse: true,
          // post请求的时候添加参数到url
          joinParamsToUrl: false,
          // 格式化提交参数时间
          formatDate: true,
          // 消息提示类型
          errorMessageMode: 'none',
          // 接口地址
          // apiUrl: globSetting.apiUrl,
          // 接口拼接地址
          // urlPrefix: urlPrefix,
          //  是否加入时间戳
          joinTime: true,
          // 忽略重复请求
          ignoreCancelToken: true,
          // 是否携带token
          withToken: true,
        },
        withCredentials: false,
      },
      opt || {}
    )
  );

  return axios;
}

// export const http = createAxios();

// 项目，多个不同 api 地址，直接在这里导出多个
// src/api ts 里面接口，就可以单独使用这个请求，
// import { httpTwo } from '@/utils/http/axios'
// export const httpTwo = createAxios({
//   requestOptions: {
//     apiUrl: 'http://localhost:9001',
//     urlPrefix: 'api',
//   },
// });
