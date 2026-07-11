import type { LocaleMessage } from '@/locales/type';

import { useLoadingType } from '@/utils/useLoading';
import type {
  ComponentRenderProxy,
  VNode,
  VNodeChild,
  ComponentPublicInstance,
  FunctionalComponent,
  PropType as VuePropType,
} from 'vue';

declare global {
  const __APP_INFO__: {
    pkg: {
      name: string;
      version: string;
      dependencies: Recordable<string>;
      devDependencies: Recordable<string>;
    };
    lastBuildTime: string;
  };

  var showLoading: ReturnType<useLoadingType>['showLoading'];
  var hideLoading: ReturnType<useLoadingType>['hideLoading'];
  interface GlobalThis {
    showLoading: ReturnType<useLoadingType>['showLoading'];
    hideLoading: ReturnType<useLoadingType>['hideLoading'];
  }
  // declare interface Window {
  //   // Global vue app instance
  //   __APP__: App<Element>;
  // }

  // vue
  declare type PropType<T> = VuePropType<T>;
  declare type VueNode = VNodeChild | JSX.Element;

  export type Writable<T> = {
    -readonly [P in keyof T]: T[P];
  };

  declare interface InResult<T = any> {
    code: number;
    message: string;
    result: T;
  }

  declare type Nullable<T> = T | null;
  declare type EmptyObj = Record<string, never>;
  declare type NonNullable<T> = T extends null | undefined ? never : T;
  declare type Recordable<T = any> = Record<string, T>;
  declare type ReadonlyRecordable<T = any> = {
    readonly [key: string]: T;
  };
  declare type Indexable<T = any> = {
    [key: string]: T;
  };
  declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
  declare type TimeoutHandle = ReturnType<typeof setTimeout>;
  declare type IntervalHandle = ReturnType<typeof setInterval>;

  // types/utils.d.ts 全局工具类型
  declare type Expand<T> = T extends object
    ? T extends (...args: infer A) => infer R
      ? (...args: Expand<A>) => Expand<R>
      : { [K in keyof T]: Expand<T[K]> }
    : T;

  declare interface ChangeEvent extends Event {
    target: HTMLInputElement;
  }

  declare interface WheelEvent {
    path?: EventTarget[];
  }

  interface ImportMetaEnv extends ViteEnv {
    __: unknown;
  }

  declare interface ViteEnv {
    VITE_PORT: number;
    VITE_USE_MOCK: boolean;
    VITE_LOGGER_MOCK: boolean;
    VITE_PUBLIC_PATH: string;
    VITE_GLOB_APP_TITLE: string;
    VITE_GLOB_APP_SHORT_NAME: string;
    VITE_DROP_CONSOLE: boolean;
    VITE_GLOB_PROD_MOCK: boolean;
    VITE_GLOB_IMG_URL: string;
    VITE_PROXY: [string, string][];
    VITE_BUILD_COMPRESS: 'gzip' | 'brotli' | 'none';
    VITE_BUILD_COMPRESS_DELETE_ORIGIN_FILE: boolean;
  }

  declare function parseInt(s: string | number, radix?: number): number;

  declare function parseFloat(string: string | number): number;

  namespace JSX {
    // tslint:disable no-empty-interface
    type Element = VNode;
    // tslint:disable no-empty-interface
    type ElementClass = ComponentRenderProxy;

    interface ElementAttributesProperty {
      $props: any;
    }

    interface IntrinsicElements {
      [elem: string]: any;
    }

    interface IntrinsicAttributes {
      [elem: string]: any;
    }
  }
}

// 扩展 vue-i18n 类型，实现 t() 函数的类型校验和自动补全
declare module 'vue-i18n' {
  // 绑定自定义消息类型到 vue-i18n
  export interface DefineLocaleMessage extends LocaleMessage {}
}

declare module 'vue' {
  export type JSXComponent<Props = any> =
    | { new (): ComponentPublicInstance<Props> }
    | FunctionalComponent<Props>;

  interface ComponentCustomProperties {
    $t: (key: I18nKey, args?: Record<string, any>) => string;
  }
}
