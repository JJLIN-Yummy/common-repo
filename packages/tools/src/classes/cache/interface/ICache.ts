export interface ICache {
  get: (key: any) => ICacheValue | undefined;
  set: (key: any, value: any, duration?: number) => any;
  delete: (key: any) => any;
}

export interface ICacheValue {
  expire_time: number;
  value: any;
}
