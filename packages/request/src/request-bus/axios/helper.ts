import { isObject, isString } from '@common/tools';
import type { RequestErrorType } from '@/enums/codeEnum';
import type { RequestErrorInfo } from '@/request-bus/axios/axiosTransform';
import type { AxiosError } from 'axios';

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

export function joinTimestamp<T extends boolean>(
  join: boolean,
  restful: T
): T extends true ? string : object;

export function joinTimestamp(join: boolean, restful = false): string | object | undefined {
  if (!join) {
    return restful ? '' : {};
  }
  return;
  // const now = new Date().getTime();
  // if (restful) {
  //   return `?_t=${now}`;
  // }
  // return { _t: now };
}

/**
 * @description: Format request parameter time
 */
export function formatRequestDate(params: any) {
  if (Object.prototype.toString.call(params) !== '[object Object]') {
    return;
  }

  for (const key in params) {
    if (params[key] && params[key]._isAMomentObject) {
      params[key] = params[key].format(DATE_TIME_FORMAT);
    }
    if (isString(key)) {
      const value = params[key];
      if (value) {
        try {
          params[key] = isString(value) ? value.trim() : value;
        } catch (error) {
          throw new Error(error as any);
        }
      }
    }
    if (isObject(params[key])) {
      formatRequestDate(params[key]);
    }
  }
}

export function rejectWrap(
  type: RequestErrorType,
  message: string,
  raw: Error,
  code?: number | string,
  detail?: unknown
): Promise<RequestErrorInfo> {
  return Promise.reject<RequestErrorInfo>({
    type,
    message,
    code,
    raw,
    detail,
    config: (raw as AxiosError).config,
    response: (raw as AxiosError).response,
  });
}
