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
