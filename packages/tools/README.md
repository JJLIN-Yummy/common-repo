## 调度器（Scheduler）

一个支持并发窗口、超时、重试的标准任务调度器。纯 TypeScript 实现，无运行时依赖。

### 特性

- **并发窗口限流**：同一时刻最多执行 `windowMax` 个任务
- **超时**：任务超过指定时长自动失败
- **重试**：任务失败自动重试，可配最大次数
- **任务去重**：同一个 task 重复加入只执行一次
- **防重入**：禁止任务内部同步调用 `run()`
- **统一错误体系**：超时、重试耗尽、重入、参数错误可精确区分
- **零依赖**：不依赖任何第三方库

### 快读开始

```ts
const scheduler = new Scheduler({ windowMax: 3 });

scheduler.addTask([
  {
    run: () => fetch('/api/a'),
    onSuccess: (res) => console.log('a 成功', res),
    onError: (err) => console.error('a 失败', err),
  },
  {
    run: async () => {
      const res = await fetch('/api/b');
      return res.json();
    },
    onSuccess: (data) => console.log('b 成功', data),
  },
]);

scheduler.run();
```

### 概念

#### 任务(Task)

```ts
// 任务钩子类型
export type onCancel = {
  onCancel: (e: Error) => any;
};

export type onTimeout = {
  onTimeout: (e: Error) => any;
};

export type onSuccess<T> = {
  onSuccess: (v: T) => any;
};

export type onError = {
  onError: (e: Error) => any;
};

//任务类型
export type taskType<R = any> = {
  run: () => any | Promise<any>;
  status?: statusValueType;
} & Partial<onTimeout> &
  Partial<onCancel> &
  Partial<onSuccess<R>> &
  Partial<onError>;
```

#### 并发窗口

windowMax 是同一时刻最多执行的任务数。

- windowMax = 1 → 串行执行
- windowMax = 3 → 最多 3 个并发

任务完成后，窗口自动释放，从队列取下一个补位。

### API

**new Scheduler({ windowMax })**

创建一个调度器。

```ts
const scheduler = new Scheduler({ windowMax: 3 });
```

| 参数      | 类型   | 说明                                        |
| --------- | ------ | ------------------------------------------- |
| windowMax | number | 并发窗口大小，必须 > 0，否则抛 LogicalError |

**addTask(taskOrTasks)**

```ts
// 加一个
scheduler.addTask({
  run: () => fetch('/a'),
});

// 加多个
scheduler.addTask([{ run: () => fetch('/a') }, { run: () => fetch('/b') }]);
```

- task.run 不是函数 → 抛 LogicalError
- 同一个 task（引用相等）重复加入 → 只保留一次
- 一批里含非法 task → 整批拒绝（抛 LogicalError，一个都不加）

**run()**

```ts
scheduler.run();
```

- 队列空时直接返回，不报错
- 窗口满时直接返回，不排队
- 任务内部同步调用 run() → 抛 ReentrantError

**timeout({ duration, cb })**

包装任务，超时后 reject TimeoutError。

```ts
scheduler.addTask([
  {
    run: scheduler.timeout({
      duration: 5000,
      cb: () => fetch('/slow'),
    }),
    onTimeout: (err) => console.error('超时', err),
  },
]);
```

| 参数     | 类型                      | 说明           |
| -------- | ------------------------- | -------------- |
| duration | number                    | 超时时长（ms） |
| cb       | () => any \| Promise<any> | 原始任务函数   |

**retry({ max, cb })**

包装任务，失败后最多执行 max 次。

```ts
scheduler.addTask([
  {
    run: scheduler.retry({
      max: 3,
      cb: () => fetch('/flaky'),
    }),
    onError: (err) => console.error('重试耗尽', err),
  },
]);
```

| 参数 | 类型                      | 说明                                   |
| ---- | ------------------------- | -------------------------------------- |
| max  | number                    | 最多执行次数（含首次），不是“重试次数” |
| cb   | () => any \| Promise<any> | 原始任务函数                           |

- max = 3 → 最多执行 3 次（首次 + 2 次重试）
- max = 0 → 直接 reject RetryExhaustedError
- 所有尝试都失败 → reject 原始错误

### 完整示例

**并发限流 + 超时 + 重试**

```ts
const scheduler = new Scheduler({ windowMax: 3 });
const tasks = urls.map((url) => ({
  run: scheduler.timeout({
    duration: 5000,
    cb: scheduler.retry({
      max: 3,
      cb: () => fetch(url),
    }),
  }),
  onSuccess: (res) => console.log(`${url} 成功`, res),
  onTimeout: () => console.error(`${url} 超时`),
  onError: (err) => {
    console.error(`${url} 失败`, err);
  },
}));

scheduler.addTask(tasks);
scheduler.run();
```

上面这段：窗口 3，每个请求最多 5 秒超时、最多执行 3 次，任何一个成功/超时/重试耗尽都会走对应回调。

### 限制

- 禁止任务内部嵌套调用 run()
- 不支持嵌套限流（父任务占名额等子任务）：父任务占名额等子任务会死锁。

### 故事

缘由：
“我一开始想做一个 AJAX 请求的并发限流器——应用里请求无规律发出，我只要控制并发数。用的是队列 + 窗口 + 计数。

发现的问题：
后来我发现，如果任务内部还能再提交子任务，窗口小的时候会死锁。比如窗口为 1，父任务占着唯一名额等子任务，子任务排队等名额，谁也动不了。

我试了三种解法：

显式传父 id：最简单直接，但限流器要维护树状结构，使用者必须手动维护父子关系，传错就顺序错乱或死锁，复杂度转嫁给使用者。

任务返回生成器，yield 子任务：调度器能解除死锁，但要求所有任务改写成生成器，侵入性强，和 async/await 不兼容。

同步段提交视为父、微任务段提交视为子：理论上可行，但微任务段提交的任务既可能是子任务，也可能是外部独立任务，无法可靠区分。

我的判断：
三种方案都不满意。我意识到问题的根源不是限流，而是任务之间没有边界。限流器假设任务扁平、无依赖；一旦有依赖，就变成结构化并发。所以我把定位改成标准调度器：任务扁平、禁止嵌套.

兼容性

- 判断错误类型时，我一开始用 instanceof TimeoutError，但发现 monorepo 里 instanceof 会失效——同一个错误类可能被打包多份，运行时有两份类定义，instanceof 认不出。
  所以我改成用 code 字段判断：isAppError(err) && err.code === ErrorCode.TIMEOUT。code 是字符串，跨包、跨版本、序列化后都稳定。”

最终实现：
限流 + 重试 + 超时。边界上，windowMax <= 0 构造时抛 LogicalError；isRunning 防重入，任务内部同步调 run() 抛 ReentrantError；safeCall 兜住回调抛错；统一错误体系。写了 30+ 测试用例，全过。”
