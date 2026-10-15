# 请求库

- 虽然前端具有诸多成熟的请求库，但在实际项目开发中发现，它们很难完全契合实际的开发需求。
- 这是一个可组合的请求工厂，支持**链式配置、缓存、取消、重试、插件**。纯 TypeScript 实现。

## 特性

- **链式API**：`collectData().cache().reRequest().response()`
- **缓存**: 按请求key缓存结果，可配置缓存时长，缓存结果是深拷贝（除了二进制数据）
- **取消**：支持手动取消、按本次请求的Id取消
- **重试**：失败自动重试，可配置最大次数
- **请求幂等**：同一key并发请求只发一次
- **插件**：有完整生命周期的钩子

## 快速开始

### 1. 创建客户端

通过**httpClient**按照请求地址的根目录来创建客户端，也可以添加路径前缀（urlPrefix）。改函数会返回一个请求工厂的wrapper函数。

```ts
type httpClientType = (config: {
  http?: RequestCore;
  apiUrl: string;
  urlPrefix?: string;
  globalPlugins?: pluginItemType[];
}) => {
  RequestFactoryWrapper: <T extends requestType, R extends responseType>(option: {
    id: number | string;
  }) => RequestFactory<T['params'], T['query'], T['data'], R>;
};

const { RequestFactoryWrapper } = httpClient({
  apiUrl: 'https://api.example.com',
  urlPrefix: '/v1',
});
```

### 2. 创建某个请求的工厂

**RequestFactoryWrapper**可以按照api路径快速创建一个请求示例。

- 可传入泛型：T是请求参数类型，R是响应类型
- 每个实例必须提供唯一的id

```ts
type RequestFactoryWrapper = <T extends requestType, R extends responseType>(option: {
  id: number | string;
}) => RequestFactory<T['params'], T['query'], T['data'], R>;

const userFactory = RequestFactoryWrapper<{
  params: { id: number };
  query: {};
  data: {};
}>({ id: 'user-info' }).collectData((params) => ({
  url: '/user',
  method: 'GET',
  params,
}));
```

### 3.发起请求

在实例使用**collectData**方法之后可以得到一个请求参数收集函数，再调用**response**函数之后就能发出请求，
返回一个promise。

```ts
const p = userFactory({ params: { id: 1 } })
  .response()
  .then((res) => {
    // 响应数据
    console.log(res);
  });
```

## 核心概念

整个请求库架构有三层

- 请求实现层：像通过xhr/fetch提供基本的请求功能
- 请求核心层：实现请求的缓存、重试、幂等、权限等等功能
- 请求业务层：为请求绑定业务功能，接入公司接口文档，向外提供业务接口

说明：

1. **请求核心层**对**请求实现层**暴露接口，**请求实现层**需实现该接口后注入到**请求核心层**(DIP)
2. 通过DIP，可以解耦**请求核心层**和**请求实现层**
3. **请求业务层**就可以根据**请求核心层**来定制业务接口

### 链式API

方便随意组合功能和拓展新功能

```ts
factory // 收集配置
  .cache({ duration: 60000 }) // 启用缓存
  .reRequest(3) // 启用重试
  .cancel(true) //请求取消
  .collectData(({ params, query, data }) => {
    return {
      url: '/user',
      headers: {},
    };
  })
  .response();
```

### 请求Key

每次请求根据 method + url + data + params 生成一个 key，用于：

- 缓存：按 key 存结果。
- 去重：同一 key 并发请求只发一次。

### API

**httpClient(config)**
创建一个请求客户端。

```ts
//类型
type httpClientType = (config: {
  http?: RequestCore;
  apiUrl: string;
  urlPrefix?: string;
  globalPlugins?: pluginItemType[];
}) => {
  RequestFactoryWrapper: <T extends requestType, R extends responseType>(option: {
    id: number | string;
  }) => RequestFactory<T['params'], T['query'], T['data'], R>;
};

const { RequestFactoryWrapper } = httpClient({
  apiUrl: 'https://api.example.com',
  urlPrefix: '/v1',
  globalPlugins: [{ beforeFetch: () => console.log('全局请求前') }],
});
```

| 参数          | 类型             | 必填 | 说明                            |
| ------------- | ---------------- | ---- | ------------------------------- |
| http          | RequestCore      | ×    | 如果不填，默认使用axios发起请求 |
| apiUrl        | string           | √    | API基础地址                     |
| urlPrefix     | string           | √    | URL前缀，默认 ''                |
| globalPlugins | pluginItemType[] | √    | 全局插件，默认[]                |

**RequestFactoryWrapper<T, R>**

创建一个 RequestFactory 实例。

```ts
const factory = RequestFactoryWrapper<{
  params: { id: number };
  query: {};
  data: {};
}>({ id: 'user-info' });
```

| 参数  | 类型         | 说明             |
| ----- | ------------ | ---------------- |
| 泛型T | requestType  | 请求参数类型     |
| 泛型R | responseType | 响应类型         |
| id    | string       | 请求实例的唯一id |

**collectData(baseConfig, options?)**

```ts
//类型

type requestOption<P, D> = {
  url: string;
  method: keyof typeof RequestEnum;
  data?: D;
  params?: P;
  headers?: { [key in string]: any };
};

type baseConfigFuncType<
  P extends Record<string, any> = EmptyObj,
  Q extends Record<string, any> = EmptyObj,
  D extends Record<string, any> = EmptyObj,
> = (
  option: paramsType<
    P extends EmptyObj ? EmptyObj : P,
    Q extends EmptyObj ? EmptyObj : Q,
    D extends EmptyObj ? EmptyObj : D
  >
) => requestOption<P, D>;

type RequestCoreOptionsType = {
  // 是否返回原生响应头
  isReturnNativeResponse?: boolean;
  // 是否携带token
  withToken?: boolean;
  //是否合并Url，直接使用传入的url
  isMergeUrl?: boolean;
};

type baseConfig = baseConfigFuncType<P, Q, D>;

type options = RequestCoreOptionsType;

factory.collectData(
  (params) => (
    {
      url: '/api/user',
      method: 'GET',
      params,
    },
    {
      isReturnNativeResponse: true,
    }
  )
);
```

**response(option?)**

通过调用**response**真正发起请求，返回Promise。

```ts
const res1 = await factory.response();
// 或带 id
const res2 = await factory.response({ id: 'xxx' });
```

**cache({ duration }, flag?)**

启用/禁用缓存。

```ts
factory.cache({ duration: 60000 }); // 启用，缓存 60 秒
factory.cache({ duration: 60000 }, false); // 禁用
```

- duration：缓存时长（ms），默认 60000。
- flag：true 启用，false 禁用。

**cancel(flag?)**

启用/禁用取消

```ts
factory.cancel(true); // 启用
factory.cancel(false); // 禁用
```

- 启用后，每次 emit 前会调 cancelFunc，移除 pending 请求。
- 按 id 取消：response({ id: 'xxx' })。

**reRequest(maxCount?)**

```ts
factory.reRequest(3); // 最多重试 3 次
```

- maxCount：最大重试次数，默认 5。
- 失败后自动重试，直到达到 maxCount。

**cleanCache(option?)**

清除缓存。

```ts
factory.cleanCache(); // 清全部
factory.cleanCache({ url: '/api/user' }); // 按条件清
```

- 不传则清空该实例id下所有缓存。

**setId**

```ts
factory.setId('new-id');
```

**createPlugin(option)**

创建插件。

```ts
//类型
type pluginItemType = {
  beforeFetch?: () => { once: boolean } | undefined;
  afterFetch?: () => { once: boolean } | undefined;
  fetchSuccess?: () => { once: boolean } | undefined;
  fetchError?: () => { once: boolean } | undefined;
};

factory.createPlugin({
  beforeFetch: () => {
    console.log('请求前');
    return { once: true }; // 只执行一次
  },
  afterFetch: () => {
    console.log('请求后');
  },
});
```

| 钩子         | 时机     |
| ------------ | -------- |
| beforeFetch  | 请求前   |
| afterFetch   | 请求后   |
| fetchSuccess | 请求成功 |
| fetchError   | 请求失败 |

- once：返回 { once: true } 表示只执行一次，执行后自动移除。

**RequestFactory.createGlobalPlugin(options)**

创建全局插件，所有实例共享。

```ts
RequestFactory.createGlobalPlugin([{ beforeFetch: () => console.log('全局请求前') }]);
```

## 常用功能

为了方便说明，现在先创建一个请求实例

- 返回一个收集 业务参数 的函数get_user。
- get_user返回的是请求工厂实例

```ts
const get_user1 = RequestFactoryWrapper<{
  params: {};
  query: { id?: number };
  data: {};
}>({ id: 'get-user1' }).collectData(({ query }) => {
  const queryPath = URLSearchParams(query).toString();
  return {
    url: 'getUser' + '?' + queryPath,
  };
});

const get_user2 = RequestFactoryWrapper<{
  params: {};
  query: { id?: number };
  data: {};
}>({ id: 'get-user2' }).collectData(({ query }) => {
  const queryPath = URLSearchParams(query).toString();
  return {
    url: 'getUser' + '?' + queryPath,
  };
});

const get_user3 = RequestFactoryWrapper<{
  params: {};
  query: { id?: number };
  data: {};
}>({ id: 'get-user3' }).collectData(({ query }) => {
  const queryPath = URLSearchParams(query).toString();
  return {
    url: 'getUser' + '?' + queryPath,
  };
});

const getUserFactory = RequestFactoryWrapper<{
  params: {};
  query: { id?: number };
  data: {};
}>({ id: 'get-user3' });
```

### 请求去重

- 在一次请求过程中：
- 一个key对应多个请求，同一个key的请求进入同一个任务队列
- 每次只会从**队头**取出一个任务来执行
- 如果第一个请求任务成功，那么同队列的请求不需要运行，直接resolve第一个成功的请求任务的响应
- 如果第二个请求任务失败了，就尝试执行第二个请求任务，如果第二个请求任务成功了，同队列的任务不需要执行，全部resolve成功的响应
- 如果队列里面任务全部执行失败，视为本次请求全部失败。

```ts
const [a, b, c] = await Promise.all([
  get_user1().response(),
  get_user1().response(),
  get_user1().response(),
]);
// a === b === c，只发了一次请求
```

### 请求缓存

我们可以为请求设置缓存，并且设置缓存时长(ms)。

```ts
//设置5秒缓存时间
const get_User4 = getUserFactory.cache({ duration: 5000 }).collectData(({ query }) => {
  const queryPath = URLSearchParams(query).toString();
  return {
    url: 'getUser' + '?' + queryPath,
  };
});

(async () => {
  // 第一次发出请求
  await get_User4({ query: { name: '林俊杰' } }).response();
  // 第二次缓存命中，请求直接读取第一次请求的响应缓存
  await get_User4({ query: { name: '林俊杰' } }).response();
})();
```

### 请求重试

我们可以为请求设置重试的次数。
下面例子，设置了5次重试请求的机会，有一次成功视为本次请求成功执行。若5次重试全部失败，视为任务失败。

```ts
const get_User4 = getUserFactory.reRequest(5).collectData(({ query }) => {
  const queryPath = URLSearchParams(query).toString();
  return {
    url: 'getUser' + '?' + queryPath,
  };
});

get_User4().response();
```

### 请求取消

同一个Key下次发出了A请求，再A请求完成之前如果有B请求需要发出，会直接取消掉A的请求转而执行B请求。

```ts
const get_User4 = getUserFactory.cancel().collectData(({ query }) => {
  const queryPath = URLSearchParams(query).toString();
  return {
    url: 'getUser' + '?' + queryPath,
  };
});

get_User4().response(); //这一次会被取消，返回取消错误
get_User4().response(); //这一次会成功发出
```

我们还可以进行更精细的请求取消
这里的id指的是fetchId，意思是本次发出去请求的id

```ts
get_User4().response({ id: 1 }); //这一次会被取消，返回取消错误
get_User4().response({ id: 1 }); //这一次会成功发出

get_User4().response({ id: 2 }); //这一次会成功发出
get_User4().response({ id: 3 }); //这一次会成功发出
```

### 插件

提供了生命周期的四个关键钩子来写自己的插件

```ts
const get_User4 = getUserFactory
  .createPlugin({
    beforeFetch() {
      console.log('请求之前');
    },
    afterFetch() {
      console.log('请求之后');
    },
    fetchSuccess() {
      console.log('请求成功');
    },
    fetchError() {
      console.log('请求失败');
    },
  })
  .collectData(({ query }) => {
    const queryPath = URLSearchParams(query).toString();
    return {
      url: 'getUser' + '?' + queryPath,
    };
  });
```
