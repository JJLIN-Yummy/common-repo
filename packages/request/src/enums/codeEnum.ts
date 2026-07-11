export enum codeEnum {
  OK = 200,

  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  TOO_MANY_REQUESTS = 429,

  SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/** Axios 请求全场景错误类型枚举 */
export enum RequestErrorType {
  // ========== 1. 请求未真正发出去（请求拦截阶段/主动取消） ==========
  /** 请求被手动取消（AbortController / CancelToken） */
  CANCEL = 'cancel',
  /** 请求拦截器内部代码异常 */
  REQUEST_INTERCEPT_ERROR = 'request_intercept_error',

  // ========== 2. 网络层错误：请求已发出，没有收到后端任何响应 ==========
  /** 用户断网 */
  OFFLINE = 'offline',
  /** 请求超时 */
  TIMEOUT = 'timeout',
  /** 网络异常：跨域、DNS失败、连接被拒绝、SSL错误等 */
  NETWORK = 'network',

  // ========== 3. HTTP 4XX 客户端错误（后端返回响应） ==========
  /** 400 参数错误 */
  PARAM_ERR = 'param_err',
  /** 401 Token过期/未登录 */
  TOKEN_EXPIRE = 'token_expire',
  /** 403 权限不足 */
  FORBIDDEN = 'forbidden',
  /** 404 接口不存在 */
  NOT_FOUND = 'not_found',
  /** 405 请求方法不允许 */
  METHOD_NOT_ALLOWED = 'method_not_allowed',

  // ========== 4. HTTP 5XX 服务端错误 ==========
  /** 500 服务器内部异常 */
  SERVER_INTERNAL_ERR = 'server_internal_err',
  /** 502/503 网关错误/服务下线 */
  SERVER_UNAVAILABLE = 'server_unavailable',
  /** 504 网关超时 */
  GATEWAY_TIMEOUT = 'gateway_timeout',

  // ========== 5. 业务层错误（HTTP 200，业务码非成功） ==========
  BUSINESS_ERR = 'business_err',

  // ========== 6. 数据解析错误 ==========
  /** 响应JSON解析失败、数据格式异常 */
  RESPONSE_PARSE_ERR = 'response_parse_err',

  // ========== 7. 未知HTTP错误 ==========
  HTTP_UNKNOWN_ERR = 'http_unknown_err',
  /** 兜底未知错误 */
  UNKNOWN = 'unknown',
}
