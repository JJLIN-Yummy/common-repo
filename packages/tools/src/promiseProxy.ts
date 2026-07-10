import { ResultEnum } from '@/enums/httpEnum';
import type { promiseCatchDataType } from '/#/http';

export interface IPromiseProxy<R> {
  catch: (cb: (error: promiseCatchDataType) => Promise<promiseCatchDataType>) => IPromiseProxy<R>;
  then: (cb: (res: any) => any) => IPromiseProxy<R>;
  errorInterceptor: (cb: (e: any) => any) => IPromiseProxy<R>;
  finally: (cb: () => any) => IPromiseProxy<R>;
}

type flags = { allFlag: boolean };

const RequestPromiseProxy = <R>(
  promise: () => Promise<R>,
  { errorInterceptor }: { errorInterceptor: (e: any) => any }
): Promise<R> => {
  const flags: flags = {
    allFlag: true,
  };

  function setFlags({ error }: { error: { code: number | string } }) {
    if (error.code === ResultEnum.ERR_CANCELED) {
      flags.allFlag = false;
      // console.log(error.code, ResultEnum.ERR_CANCELED, flags);
    }
  }

  return promise()
    .then((res) => {
      return res;
    })
    .catch((err) => {
      //处理响应原生错误
      const { response, code } = err ?? {};
      setFlags({ error: err });
      errorInterceptor(err);
      if (code !== 'ERR_CANCELED') {
        if (code) {
          // checkStatus(e.code);
        }
        // window['$message'].error(e[ResponseField.MESSAGE]);
      }
      try {
        // 错误是服务器，后端返回错误json格式
        // JSON.stringify(response.data);
        //todo: 如果是json,统一处理错误弹窗信息
        // console.error('系统错误');
        // window['$message'].error(
        //   response.data?.[ResponseField.MESSAGE] || '系统错误'
        // );
      } catch (e) {
        console.log(e);
      }
      return Promise.reject(err);
    });
};

export { RequestPromiseProxy };
