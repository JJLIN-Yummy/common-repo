export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};
export type Nullable<T> = T | null;
export type Recordable<T = any> = Record<string, T>;
export type ReadonlyRecordable<T = any> = {
  readonly [key: string]: T;
};
export type Indexable<T = any> = {
  [key: string]: T;
};
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
export type TimeoutHandle = ReturnType<typeof setTimeout>;
export type IntervalHandle = ReturnType<typeof setInterval>;
export interface ChangeEvent extends Event {
  target: HTMLInputElement;
}
export interface WheelEvent {
  path?: EventTarget[];
}
export interface ImportMetaEnv extends IViteEnv {
  __: unknown;
}
export interface IViteEnv {
  VITE_PORT?: number;
  VITE_USE_MOCK?: boolean;
  VITE_PUBLIC_PATH?: string;
  VITE_GLOB_APP_TITLE?: string;
  VITE_GLOB_APP_SHORT_NAME?: string;
  VITE_DROP_CONSOLE?: boolean;
  VITE_GLOB_PROD_MOCK?: boolean;
  VITE_GLOB_IMG_URL?: string;
  VITE_PROXY?: [string, string][];
  VITE_BUILD_COMPRESS?: 'gzip' | 'brotli' | 'none';
  VITE_BUILD_COMPRESS_DELETE_ORIGIN_FILE?: boolean;
  VITE_CHART_PREVIEW_URL?: string;
}
