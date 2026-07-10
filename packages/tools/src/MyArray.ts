import { throwTypeError } from '@/error';

export function isArray(value: unknown): value is Array<any> {
  return Array.isArray(value);
}

export function isEmptyArray(value: unknown): value is [] {
  if (!isArray(value)) {
    throw throwTypeError('value', value);
  }
  return value.length === 0;
}

export function coverArray<T>(arr: T[], newArr: T[]) {
  arr.splice(0, arr.length, ...newArr);
}
