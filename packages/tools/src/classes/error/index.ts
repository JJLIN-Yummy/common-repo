/* -------------------------------------------------------------------------- */
/*                              错误码枚举                                      */
/* -------------------------------------------------------------------------- */

export enum ErrorCode {
  // —— 时间相关 ——
  TIMEOUT = 'TIMEOUT',

  // —— 取消相关 ——
  CANCELLED = 'CANCELLED',
  ABORTED = 'ABORTED',

  // —— 重试相关 ——
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',

  // —— 并发/调度相关 ——
  REENTRANT = 'REENTRANT',
  CONCURRENCY_LIMIT = 'CONCURRENCY_LIMIT',

  // —— 校验/参数 ——
  VALIDATION = 'VALIDATION',

  // —— 权限 ——
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // —— 网络 ——
  NETWORK = 'NETWORK',

  // ——空数据——
  EMPTY = 'EMPTY',

  // ——逻辑——
  LOGICAL = 'LOGICAL',

  // —— 未知 ——
  UNKNOWN = 'UNKNOWN',
}

/* -------------------------------------------------------------------------- */
/*                              错误消息枚举                                    */
/* -------------------------------------------------------------------------- */

export enum ErrorMessage {
  // —— 时间相关 ——
  TIMEOUT = '操作超时',

  // —— 取消相关 ——
  CANCELLED = '操作已取消',
  ABORTED = '操作被中断',

  // —— 重试相关 ——
  RETRY_EXHAUSTED = '重试次数耗尽',

  // —— 并发/调度相关 ——
  REENTRANT = '不可重入',
  CONCURRENCY_LIMIT = '并发数超限',

  // —— 校验/参数 ——
  VALIDATION = '参数校验失败',

  // —— 权限 ——
  UNAUTHORIZED = '未授权',
  FORBIDDEN = '无权限',

  // —— 网络 ——
  NETWORK = '网络错误',

  // ——空数据——
  EMPTY = '空数据',

  // ——逻辑——
  LOGICAL = '逻辑错误',

  // —— 未知 ——
  UNKNOWN = '未知错误',
}

/* -------------------------------------------------------------------------- */
/*                                  基类                                       */
/* -------------------------------------------------------------------------- */

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/* -------------------------------------------------------------------------- */
/*                              通用错误子类                                    */
/* -------------------------------------------------------------------------- */

/** 超时 */
export class TimeoutError extends AppError {
  readonly duration?: number;

  constructor(option?: { message?: string; duration?: number; cause?: unknown }) {
    super(ErrorCode.TIMEOUT, option?.message ?? ErrorMessage.TIMEOUT, option?.cause);
    this.name = 'TimeoutError';
    this.duration = option?.duration;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 取消 */
export class CancelledError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.CANCELLED, option?.message ?? ErrorMessage.CANCELLED, option?.cause);
    this.name = 'CancelledError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 中断 */
export class AbortedError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.ABORTED, option?.message ?? ErrorMessage.ABORTED, option?.cause);
    this.name = 'AbortedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 重试耗尽 */
export class RetryExhaustedError extends AppError {
  readonly attempts: number;

  constructor(attempts: number, option?: { message?: string; cause?: unknown }) {
    super(
      ErrorCode.RETRY_EXHAUSTED,
      option?.message ?? ErrorMessage.RETRY_EXHAUSTED,
      option?.cause
    );
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 重入 */
export class ReentrantError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.REENTRANT, option?.message ?? ErrorMessage.REENTRANT, option?.cause);
    this.name = 'ReentrantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 并发超限 */
export class ConcurrencyLimitError extends AppError {
  readonly limit: number;

  constructor(limit: number, option?: { message?: string; cause?: unknown }) {
    super(
      ErrorCode.CONCURRENCY_LIMIT,
      option?.message ?? ErrorMessage.CONCURRENCY_LIMIT,
      option?.cause
    );
    this.name = 'ConcurrencyLimitError';
    this.limit = limit;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 参数校验失败 */
export class ValidationError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.VALIDATION, option?.message ?? ErrorMessage.VALIDATION, option?.cause);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 未授权 */
export class UnauthorizedError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.UNAUTHORIZED, option?.message ?? ErrorMessage.UNAUTHORIZED, option?.cause);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 无权限 */
export class ForbiddenError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.FORBIDDEN, option?.message ?? ErrorMessage.FORBIDDEN, option?.cause);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 网络错误 */
export class NetworkError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.NETWORK, option?.message ?? ErrorMessage.NETWORK, option?.cause);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 空数据 */
export class EmptyError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.EMPTY, option?.message ?? ErrorMessage.EMPTY, option?.cause);
    this.name = 'EmptyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 逻辑错误 */
export class LogicalError extends AppError {
  constructor(option?: { message?: string; cause?: unknown }) {
    super(ErrorCode.LOGICAL, option?.message ?? ErrorMessage.LOGICAL, option?.cause);
    this.name = 'LogicalError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  工具函数                                    */
/* -------------------------------------------------------------------------- */

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

export function hasCode(e: unknown, code: ErrorCode): boolean {
  return isAppError(e) && e.code === code;
}

/** 把任意错误转成 AppError */
export function toAppError(e: unknown, fallbackMessage = ErrorMessage.UNKNOWN): AppError {
  if (isAppError(e)) return e;
  if (e instanceof Error) return new AppError(ErrorCode.UNKNOWN, e.message, e);
  return new AppError(ErrorCode.UNKNOWN, fallbackMessage, e);
}
