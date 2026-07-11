import {
  MyObject,
  isFunction,
  promiseTransformer,
  RequestPromiseProxy,
  throwTypeError,
  isObjectContains,
} from '@common/tools';
import type { RequestCore, requestOption } from '@/request-core/RequestFactory/types';

import { ResultEnum } from '@/enums/httpEnum';

import type { promiseThenDataType as promiseDataType, responseType } from '#/http';
import type { IRequestFactoryInstanceManager } from '@/request-core/RequestFactoryInstanceManager/RequestFactoryInstanceManager';

import { AxiosCanceler } from '@/request-bus/axios/axiosCancel';

const PENDING = 'pending';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FULFILLED = 'fulfilled';
const REJECT = 'reject';

export type fetchId = number | string;
type stateType = typeof PENDING | typeof FULFILLED | typeof REJECT;

const ignoreErrorState = ['ERR_CANCELED']; //如果錯誤是這些狀態就不setState
const CANCEL_STATE = 0b0001;
const REREQUES_TSTATE = 0b0010;
const CACHE_STATE = 0b0100;
const SET_ID = 0b1000;
// const JOIN_QUEUE = 0b10000;
const CREATE_PLUGIN = 0b100000;
export interface queue {
  [key: string]: any;
}

export type pluginItemType = {
  beforeFetch?: () => { once: boolean } | undefined;
  afterFetch?: () => { once: boolean } | undefined;
  fetchSuccess?: () => { once: boolean } | undefined;
  fetchError?: () => { once: boolean } | undefined;
};

export interface IRequestFactory<R extends responseType> {
  response: (option?: { id?: number | string }) => Promise<promiseDataType<R>>;
  createPlugin: (option: pluginItemType) => IRequestFactory<R>;
  cache: (option: { duration?: number }, flag: boolean) => IRequestFactory<R>;
  cancel: (flag: boolean) => IRequestFactory<R>;
  reRequest: (maxCount: number) => IRequestFactory<R>;
  cleanCache: (option?: {
    method?: string;
    url?: string;
    params?: Recordable<any>;
    data: Recordable<any>;
  }) => IRequestFactory<R>;

  [key: string]: any;
}

type IsRequireData<
  P extends Record<string, any>,
  Q extends Record<string, any>,
  D extends Record<string, any>,
> = P extends EmptyObj
  ? Q extends EmptyObj
    ? D extends EmptyObj
      ? false // 全部默认值 → 参数可选
      : true // D 传入类型 → 参数必填
    : true // Q 传入类型 → 参数必填
  : true; // P 传入类型 → 参数必填

type paramsType<
  P extends Record<string, any> = EmptyObj,
  Q extends Record<string, any> = EmptyObj,
  D extends Record<string, any> = EmptyObj,
> = (P extends EmptyObj ? { params?: P } : { params: P }) &
  (D extends EmptyObj ? { data?: D } : { data: D }) &
  (Q extends EmptyObj ? { query?: Q } : { query: Q });
// {
//   params?: P,
//   query?: Q,
//   data?: D
// }

export interface RequestOption<R extends responseType> {
  id: number | string;
  http: RequestCore;
  manager: IRequestFactoryInstanceManager<R>;
}
export interface RequestHandlers {
  before: Array<() => void>;
  after: Array<() => void>;
  error: Array<() => void>;
}

export type baseConfigFuncType<
  P extends Record<string, any> = EmptyObj,
  Q extends Record<string, any> = EmptyObj,
  D extends Record<string, any> = EmptyObj,
> = (
  option: paramsType<
    P extends EmptyObj ? EmptyObj : P,
    Q extends EmptyObj ? EmptyObj : Q,
    D extends EmptyObj ? EmptyObj : D
  >
) => requestOption<P, D>;

export type configType = {
  fetchId?: fetchId;
  method?: string;
  url?: string;
  data?: Record<string, any>;
  params?: Record<string, any>;
  [key: string]: any;
};

export default class RequestFactory<
  P extends Record<string, any> = EmptyObj,
  Q extends Record<string, any> = EmptyObj,
  D extends Record<string, any> = EmptyObj,
  R extends responseType = responseType,
> implements IRequestFactory<R> {
  private static globalPlugins: Array<pluginItemType> = [];

  private id: number | string;
  private http: RequestCore;
  private config: configType = {};
  private options: object = {};
  private baseConfigFunc: baseConfigFuncType<P, Q, D> | undefined = void 0;
  private state: string = PENDING;
  private manager: IRequestFactoryInstanceManager<R>;

  private isSingleton = true;
  private hasPermissionFunc: (() => boolean) | undefined = void 0;
  private cacheFunc: ((request: () => Promise<any>) => Promise<any>) | undefined = void 0;
  private cancelFunc: ((option?: { id?: number | string }) => void) | undefined = void 0;
  private reReqFunc: ((emitter: () => Promise<any>, count: number) => Promise<any>) | undefined =
    void 0;
  private handlers: RequestHandlers = {
    before: [], //请求之前做什么,
    after: [], //请求之后做什么，
    error: [], //报错做什么
  };

  // @ts-expect-error 类型修复
  private components = {
    0b0001: 'cancel',
    0b0010: 'reRequest',
    0b0100: 'cache',
    0b1000: 'setId',
  };

  private componentState = 0b000;
  // @ts-expect-error 类型修复
  private result: any;

  private DEFAULT_CACHE_DURATION = 60 * 1000;

  private plugins: Array<pluginItemType> = [];

  constructor(option: RequestOption<R>) {
    if (!option.http) throw throwTypeError('option.http', option.http, '不能为空');
    this.http = option.http;
    this.manager = option.manager;
    this.id = option.id;
  }

  static createGlobalPlugin(options: pluginItemType[]) {
    RequestFactory.globalPlugins.push(...options);
  }

  //收集数据
  public collectData(
    baseConfig: baseConfigFuncType<P, Q, D>,
    options: object = {}
  ): IsRequireData<P, Q, D> extends true
    ? (reqData: paramsType<P, Q, D>) => IRequestFactory<R>
    : (reqData?: paramsType<P, Q, D>) => IRequestFactory<R> {
    const beforeHandler = this.handlers.before;
    if (!this.baseConfigFunc) {
      if (!isFunction(baseConfig))
        throw new Error('AxiosFactory.collectData傳入的baseConfig必須是函數');

      this.baseConfigFunc = baseConfig; //收集函数
    }

    MyObject.assign(this.options, options); //收集函数
    return (reqData = {}) => {
      // if(!MyObject.isObject(reqData,true) && !isEmptyParams) throw new Error("AxiosFactory.collectData傳入的reqData必須是對象，並且可讀")
      //每次調用清空狀態
      // this.clearState()
      if (!this.baseConfigFunc) {
        throw throwTypeError('this.baseConfigFunc', void 0, '可能未調用collectData方法');
      }

      //@ts-expect-error 类型修复
      this.config = this.baseConfigFunc(reqData); //收集axios配置

      // this.options = options;
      if (beforeHandler.length > 0 && this.isSingleton) {
        beforeHandler.forEach((item) => {
          item();
        });
      }
      //是否单例模式
      return this;

      // new Promise((resolve,reject)=>{
      //   this.emit(resolve);
      // })
    };
  }

  //发送请求
  public emit(option?: { id?: number | string }): Promise<promiseDataType<R>> {
    const config = this.config;
    if (this.cancelFunc) {
      this.cancelFunc({ id: option?.id });
    }
    // const afterHandler = this.handlers.after;
    // const that = this;
    //如果沒有權限
    const key = getPendingUrl({
      apiUrl: this.http.apiUrl,
      url: this.config.url ?? '',
      method: this.config.method,
      params: this.config.params,
      data: this.config.data,
    });

    if (this.hasPermissionFunc && !this.hasPermissionFunc()) {
      return Promise.reject({ code: ResultEnum.UNAUTHORIZED, message: '暫無權限' });
    }
    this.execBeforeFetch();
    let emitter;
    if (this.cacheFunc) {
      //@ts-expect-error 类型修复
      emitter = () => this.cacheFunc(() => this.http.request(config, this.options));
    } else {
      emitter = () =>
        this.manager.runRequest(this.id, key, {
          requestFunc: () => this.http.request(config, this.options),
        });
    }

    const p = (
      emitter().then((res) => {
        return res;
      }) as Promise<R>
    )
      .catch((err) => {
        //如果存在重试函数
        if (this.reReqFunc) {
          return this.reReqFunc(emitter, 1);
        }
        return Promise.reject(err);
      })
      .finally(() => {
        this.execAfterFetch();
      });

    // return p;

    const promiseProxy = RequestPromiseProxy<R>(() => p, {
      errorInterceptor: (e) => {
        // this.reReqFunc && this.reReqFunc(config, this.options, 1);
        // console.log('promise代理', e);
        if (this.handlers.error.length > 0) {
          this.handlers.error.forEach((item) => {
            item();
          });
        }

        //如果 是手動取消就不設置狀態
        if (e) {
          if (ignoreErrorState.includes(e.code)) {
            return;
          }
        }
        this.changeState(REJECT, e);

        //{IsSuccess:false,Value:null,message:null}
      },
    });

    return promiseTransformer<R>(() => promiseProxy);

    //请求之后做些什么
    // if(afterHandler.length > 0){
    //   afterHandler.forEach((item)=>{
    //     item();
    //   })
    // }
  }

  //收集响应
  public response(option?: { id?: number | string }): Promise<promiseDataType<R>> {
    // const that = this;
    //1.是否走缓存
    //1.1如果有缓存，返回缓存
    //1.2如果没有缓存 发送请求
    //言外之意就是如果state===fulfilled直接返回结果

    //todo:查看当前状态

    // if(this.cacheFunc){
    //   const result = this.cacheFunc();
    //   if(result){
    //     return new RequestPromiseProxy(Promise.resolve(result));
    //   }

    //   return this.emit();
    // }
    return option && option.id ? this.emit({ id: option.id }) : this.emit();
  }

  //请求取消
  public cancel(flag = true): RequestFactory<P, Q, D, R> {
    // this.isCancel = true;
    const canceler = new AxiosCanceler();
    let lastConfig: configType = {};
    this.componentState = this.componentState | CANCEL_STATE;

    const c = (option?: { id?: number | string }) => {
      if (lastConfig) {
        MyObject.assign(lastConfig, { fetchId: option?.id });
        // @ts-expect-error 类型修复
        canceler.removePending(lastConfig);
      }
      if (this.config) {
        MyObject.assign(this.config, { fetchId: option?.id });
        lastConfig = this.config;
        // @ts-expect-error 类型修复
        canceler.addPending(this.config);
      }
    };
    if (flag) {
      this.cancelFunc = c;
    } else {
      this.cancelFunc = void 0;
    }

    return this;
  }
  getCancelToken(cb: (token: () => any) => any) {
    const canceler = new AxiosCanceler();
    const config = this.config;
    // @ts-expect-error 类型修复
    canceler.addPending(config);

    cb(() => {
      // @ts-expect-error 类型修复
      return canceler.removePending(config);
    });
    return this;
  }

  //失败重连
  public reRequest(maxCount = 5): RequestFactory<P, Q, D, R> {
    // this.isReRequest = true;
    this.componentState = this.componentState | REREQUES_TSTATE;
    const f = (emitter: () => Promise<any>, count: number = 1) => {
      this.execBeforeFetch();
      try {
        return emitter()
          .then((res) => {
            return res;
          })
          .catch((e) => {
            // console.log(e);

            if (count === maxCount) {
              // throw new Error('请求次数到达极限');
              return Promise.reject(e);
            }
            return f(emitter, count + 1);
          })
          .finally(() => {
            this.execAfterFetch();
          });
      } catch (e) {
        // console.log(e);

        if (count === maxCount) {
          // throw new Error('请求次数到达极限');
          return Promise.reject(e);
        }
        return f(emitter, count + 1);
      }
    };
    this.reReqFunc = f;
    return this;
  }

  //修改当前请求状态
  public changeState(state: stateType, result: any): void {
    if (this.state !== PENDING) return;
    this.state = state;
    this.result = result;
    // this.resultCache[getPendingUrl(this.config)] = result; //原生的結果加入缓存
    //清空请求的handler
    // this.handlers.before = [];
    // this.handlers.after = [];
  }

  //清除当前请求状态
  public clearState(): void {
    if (this.state === PENDING) return;
    this.state = PENDING;
    this.result = {};
  }

  public cache(
    option: { duration?: number } = { duration: 60000 },
    flag = true
  ): RequestFactory<P, Q, D, R> {
    //缓存未完成
    this.componentState = this.componentState | CACHE_STATE;

    if (flag) {
      const c = (request: () => Promise<any>) => {
        const key = getPendingUrl({ ...this.config, apiUrl: this.http.apiUrl });
        // return this.manager.getStorage(this.id,key);
        return new Promise((resolve, reject) => {
          this.manager.runRequestTask(this.id, key, {
            requestFuncList: [request],
            resolve,
            reject,
            duration: option.duration ?? this.DEFAULT_CACHE_DURATION,
            isCache: true,
          });
        });
      };
      this.cacheFunc = c;
    } else {
      this.cacheFunc = void 0;
    }

    return this;
  }

  public cleanCache(option?: {
    method?: string;
    url?: string;
    params?: Recordable<any>;
    data: Recordable<any>;
  }): RequestFactory<P, Q, D, R> {
    const caches = this.manager.getStorageList(this.id);
    if (!caches) return this;
    if (!option) {
      this.manager.removeStorageList(this.id);
      return this;
    }
    try {
      for (const key in caches) {
        //把 字符串 转为对象
        const o = JSON.parse(key);
        if (isObjectContains(o, option)) {
          this.manager.removeStorage(this.id, key);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return this;
  }

  //設置ID
  public setId(id: number | string): RequestFactory<P, Q, D, R> {
    this.id = id;
    this.componentState = this.componentState | SET_ID;
    MyObject.assign(this.options, { id });
    //將自己提交到manager集中管理
    if (this.manager) {
      this.manager?.add(id, this);
    }
    return this;
  }

  public getId() {
    return this.id;
  }

  createPlugin(option: pluginItemType) {
    this.componentState = this.componentState | CREATE_PLUGIN;
    this.plugins.push(option);

    return this;
  }

  execBeforeFetch() {
    const beforeFetches = [...RequestFactory.globalPlugins, ...this.plugins].map((plugin) => {
      return plugin.beforeFetch;
    });
    if (beforeFetches && beforeFetches.length > 0) {
      const shouldRemove: Array<() => any> = [];
      beforeFetches.forEach((beforeFetch) => {
        if (beforeFetch && typeof beforeFetch === 'function') {
          const { once } = beforeFetch() ?? {};
          if (once) {
            shouldRemove.push(beforeFetch);
          }
        }
      });

      //删除某个钩子
      this.plugins.forEach((plugin) => {
        const target = shouldRemove.find((item) => {
          return item === plugin.beforeFetch;
        });
        if (target) {
          plugin.beforeFetch = void 0;
        }
      });
    }
  }

  execAfterFetch() {
    const afterFetches = [...RequestFactory.globalPlugins, ...this.plugins].map((plugin) => {
      return plugin.afterFetch;
    });
    if (afterFetches && afterFetches.length > 0) {
      const shouldRemove: Array<() => any> = [];
      afterFetches.forEach((afterFetch) => {
        if (afterFetch && typeof afterFetch === 'function') {
          const { once } = afterFetch() ?? {};
          if (once) {
            shouldRemove.push(afterFetch);
          }
        }
      });

      //删除某个钩子
      this.plugins.forEach((plugin) => {
        const target = shouldRemove.find((item) => {
          return item === plugin.afterFetch;
        });
        if (target) {
          plugin.afterFetch = void 0;
        }
      });
    }
  }
}

// export const RequestFactoryWrapper = <T extends requestType, R extends responseType>(option: {
//   id: number | string;
// }) => {
//   return new RequestFactory<T['params'], T['query'], T['data'], R>({
//     id: option.id,
//     http,
//     manager: requestManager,
//   });
// };

export const getPendingUrl = (config: {
  apiUrl: string;
  method?: string;
  url?: string;
  data?: Record<string, any>;
  params?: Record<string, any>;
}) => {
  return JSON.stringify({
    method: config.method,
    url: config.url
      ? config.url.includes(config.apiUrl)
        ? config.url
        : config.apiUrl + config.url
      : '',
    data: config.data,
    params: config.params,
  });
};
