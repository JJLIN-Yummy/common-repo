import 'vue-router';
declare module 'vue-router' {
  interface RouteMeta {
    sort: number;
  }
}

export {};
