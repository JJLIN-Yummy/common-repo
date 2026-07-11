/**
 * Axios 取消错误类型
 */
interface AxiosCancelError {
  __CANCEL__: true;
  code?: 'ERR_CANCELED';
  name?: 'CanceledError';
}

/**
 * 浏览器标准 AbortController 取消错误（fetch、ky、umi-request、axios signal方式都走这个）
 */
type StandardAbortError = DOMException & {
  name: 'AbortError';
};

/**
 * 通用判断：是否为请求主动取消错误
 * 兼容场景：
 * 1. axios CancelToken 取消（老方式）
 * 2. axios signal 方式取消（新版AbortController）
 * 3. 原生 fetch / 其他所有基于AbortController的请求库
 */
export function isRequestCancelError(err: unknown): err is AxiosCancelError | StandardAbortError {
  // 场景1：浏览器标准 Abort 取消（fetch、axios signal、绝大多数现代请求库）
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true;
  }

  // 场景2：Axios 专属取消错误（CancelToken 方式，你当前报错类型）
  if (typeof err === 'object' && err !== null) {
    return !!(err as AxiosCancelError).__CANCEL__;
  }

  return false;
}
