import type { onCancel, onError, onSuccess, onTimeout, priority } from './types';
import { type statusValueType } from './scheduler';

export type taskType<R = any> = {
  run: () => any | Promise<any>;
  status?: statusValueType;
} & Partial<onTimeout> &
  Partial<onCancel> &
  Partial<onSuccess<R>> &
  Partial<onError> &
  Partial<priority>;
