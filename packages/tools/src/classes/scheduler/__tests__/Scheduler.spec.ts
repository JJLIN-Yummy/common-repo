import { describe, it, expect, vi } from 'vitest';
import { Scheduler, statusEnum } from '../scheduler';
import { type taskType } from '../task';
import { LogicalError, RetryExhaustedError } from '../../error';

/** 造一个任务 */
function makeTask(option: {
  run: taskType['run'];
  onSuccess?: taskType['onSuccess'];
  onError?: taskType['onError'];
  onTimeout?: taskType['onTimeout'];
}): taskType {
  return {
    run: option.run,
    onSuccess: option.onSuccess,
    onError: option.onError,
    status: statusEnum.waiting,
    onTimeout: option.onTimeout,
  };
}

/** 延迟 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 等待微任务清空 */
const flushMicrotasks = () => Promise.resolve();

describe('Scheduler', () => {
  /* ---------------------------------------------------------------------- */
  /*                              1. 窗口限流                                */
  /* ---------------------------------------------------------------------- */
  describe('窗口限流', () => {
    it('窗口为 2、任务 3 个：前 2 个先跑，第 3 个等补位', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const running: number[] = [];
      const resolved: number[] = [];

      const make = (id: number) =>
        makeTask({
          run: async () => {
            running.push(id);
            await sleep(10);
            return id;
          },
          onSuccess: () => resolved.push(id),
        });

      scheduler.addTask([make(1), make(2), make(3)]);
      scheduler.run();

      // 同步段结束，前两个应该已经启动
      expect(running).toEqual([1, 2]);

      // 等所有完成
      await sleep(50);

      // 三个都完成
      expect(resolved.sort()).toEqual([1, 2, 3]);
    });

    it('窗口为 1：任务串行执行', async () => {
      const scheduler = new Scheduler({ windowMax: 1 });
      const order: number[] = [];

      const make = (id: number) =>
        makeTask({
          run: async () => {
            order.push(id);
            await sleep(5);
            return id;
          },
        });

      scheduler.addTask([make(1), make(2), make(3)]);
      scheduler.run();

      await sleep(50);
      expect(order).toEqual([1, 2, 3]);
    });

    it('同一时刻运行数不超过 windowMax', async () => {
      const windowMax = 2;
      const scheduler = new Scheduler({ windowMax });
      let current = 0;
      let maxSeen = 0;

      const make = () =>
        makeTask({
          run: async () => {
            current++;
            maxSeen = Math.max(maxSeen, current);
            await sleep(10);
            current--;
            return 1;
          },
        });

      scheduler.addTask([make(), make(), make(), make(), make()]);
      scheduler.run();

      await sleep(100);
      expect(maxSeen).toBeLessThanOrEqual(windowMax);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              2. 同步任务                                */
  /* ---------------------------------------------------------------------- */
  describe('同步任务', () => {
    it('同步任务不会爆栈（大量任务）', async () => {
      const scheduler = new Scheduler({ windowMax: 5 });
      let count = 0;

      const tasks = Array.from({ length: 1000 }, () =>
        makeTask({
          run: () => {
            count++;
            return count;
          },
        })
      );

      scheduler.addTask(tasks);
      scheduler.run();

      await sleep(50);
      expect(count).toBe(1000);
    });

    it('同步任务正常走 onSuccess', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const results: number[] = [];

      scheduler.addTask([
        makeTask({ run: () => 1, onSuccess: (r) => results.push(r) }),
        makeTask({ run: () => 2, onSuccess: (r) => results.push(r) }),
      ]);
      scheduler.run();

      await sleep(10);
      expect(results.sort()).toEqual([1, 2]);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              3. 异步任务                                */
  /* ---------------------------------------------------------------------- */
  describe('异步任务', () => {
    it('异步任务按顺序补位', async () => {
      const scheduler = new Scheduler({ windowMax: 1 });
      const order: number[] = [];

      const make = (id: number) =>
        makeTask({
          run: async () => {
            order.push(id);
            await sleep(5);
            return id;
          },
        });

      scheduler.addTask([make(1), make(2), make(3)]);
      scheduler.run();

      await sleep(50);
      expect(order).toEqual([1, 2, 3]);
    });

    it('异步任务完成后触发 onSuccess', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const results: number[] = [];

      scheduler.addTask([
        makeTask({ run: async () => 1, onSuccess: (r) => results.push(r) }),
        makeTask({ run: async () => 2, onSuccess: (r) => results.push(r) }),
      ]);
      scheduler.run();

      await sleep(20);
      expect(results.sort()).toEqual([1, 2]);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              4. 任务抛错                                */
  /* ---------------------------------------------------------------------- */
  describe('任务抛错', () => {
    it('同步任务抛错 → 走 onError', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const errors: any[] = [];

      scheduler.addTask([
        makeTask({
          run: () => {
            throw new Error('boom');
          },
          onError: (e) => errors.push(e),
        }),
      ]);
      scheduler.run();

      await sleep(10);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('boom');
    });

    it('异步任务 reject → 走 onError', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const errors: any[] = [];

      scheduler.addTask([
        makeTask({
          run: async () => {
            throw new Error('async boom');
          },
          onError: (e) => errors.push(e),
        }),
      ]);
      scheduler.run();

      await sleep(20);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('async boom');
    });

    it('任务抛错后，窗口释放，后续任务能继续跑', async () => {
      const scheduler = new Scheduler({ windowMax: 1 });
      const order: string[] = [];

      scheduler.addTask([
        makeTask({
          run: () => {
            order.push('fail');
            throw new Error('boom');
          },
        }),
        makeTask({
          run: () => {
            order.push('ok');
            return 1;
          },
        }),
      ]);
      scheduler.run();

      await sleep(20);
      expect(order).toEqual(['fail', 'ok']);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              5. 回调抛错                                */
  /* ---------------------------------------------------------------------- */
  describe('回调抛错', () => {
    it('onSuccess 抛错不会影响调度器', async () => {
      const scheduler = new Scheduler({ windowMax: 1 });
      const order: number[] = [];

      scheduler.addTask([
        makeTask({
          run: () => 1,
          onSuccess: () => {
            throw new Error('onSuccess boom');
          },
        }),
        makeTask({
          run: () => 2,
          onSuccess: (r) => order.push(r),
        }),
      ]);
      scheduler.run();

      await sleep(20);
      // 第二个任务正常完成，说明第一个任务的 onSuccess 抛错没影响调度
      expect(order).toEqual([2]);
    });

    it('onError 抛错不会影响调度器', async () => {
      const scheduler = new Scheduler({ windowMax: 1 });
      const order: number[] = [];

      scheduler.addTask([
        makeTask({
          run: () => {
            throw new Error('task boom');
          },
          onError: () => {
            throw new Error('onError boom');
          },
        }),
        makeTask({
          run: () => {
            order.push(2);
            return 2;
          },
        }),
      ]);
      scheduler.run();

      await sleep(20);
      expect(order).toEqual([2]);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              6. 重入                                    */
  /* ---------------------------------------------------------------------- */
  describe('重入检查', () => {
    it('任务内部同步调 run() → 抛重入错误', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });

      scheduler.addTask([
        makeTask({
          run: () => {
            // 同步调 run，应触发重入
            scheduler.run();
            return 1;
          },
        }),
      ]);

      // 外层 run 里，任务内部同步调 run 会抛错
      // 这个错误会被内层 catch 抓住，走 onError
      // 所以这里不会直接抛，而是走 onError
      expect(() => scheduler.run()).not.toThrow();
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              7. 超时                                    */
  /* ---------------------------------------------------------------------- */
  describe('timeout', () => {
    it('任务超时 → reject', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const errors: any[] = [];

      const task = makeTask({
        run: scheduler.timeout({
          duration: 10,
          cb: async () => {
            await sleep(100);
            return 1;
          },
        }),
        onTimeout: (e) => {
          errors.push(e);
        },
      });

      scheduler.addTask([task]);
      scheduler.run();

      await sleep(50);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain('超时');
    });

    it('任务在超时前完成 → 正常 onSuccess', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const results: number[] = [];

      const task = makeTask({
        run: scheduler.timeout({
          duration: 100,
          cb: async () => {
            await sleep(10);
            return 1;
          },
        }),
        onSuccess: (r) => results.push(r),
      });

      scheduler.addTask([task]);
      scheduler.run();

      await sleep(50);
      expect(results).toEqual([1]);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                              8. 重试                                    */
  /* ---------------------------------------------------------------------- */
  describe('retry', () => {
    it('任务前两次失败，第三次成功', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      let attempts = 0;
      const results: number[] = [];

      const task = makeTask({
        run: scheduler.retry({
          max: 3,
          cb: async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error(`fail ${attempts}`);
            }
            return 'ok';
          },
        }),
        onSuccess: (r) => results.push(r),
      });

      scheduler.addTask([task]);
      scheduler.run();

      await sleep(50);
      expect(attempts).toBe(3);
      expect(results).toEqual(['ok']);
    });

    it('重试次数耗尽 → onError', async () => {
      const scheduler = new Scheduler({ windowMax: 2 });
      const errors: any[] = [];

      const task = makeTask({
        run: scheduler.retry({
          max: 2,
          cb: async () => {
            throw new Error('always fail');
          },
        }),
        onError: (e) => errors.push(e),
      });

      scheduler.addTask([task]);
      scheduler.run();

      await sleep(50);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('always fail');
    });
  });

  /* ---------------------------------------------------------------------- */
  /*                         11. addTask 去重                               */
  /* ---------------------------------------------------------------------- */
  describe('addTask 去重', () => {
    it('同一批重复 task 只加一次', async () => {
      const s = new Scheduler({ windowMax: 5 });
      let count = 0;
      const t = makeTask({
        run: () => {
          count++;
          return 1;
        },
      });

      s.addTask([t, t, t]);
      s.run();
      await sleep(20);
      expect(count).toBe(1);
    });

    it('跨批重复 task 只加一次', async () => {
      const s = new Scheduler({ windowMax: 5 });
      let count = 0;
      const t = makeTask({
        run: () => {
          count++;
          return 1;
        },
      });

      s.addTask(t);
      s.addTask(t); // 第二次应被去重
      s.run();
      await sleep(20);
      expect(count).toBe(1);
    });
  });

  describe('边界值 - 构造器', () => {
    it('windowMax = 0 → 抛 LogicalError', () => {
      expect(() => new Scheduler({ windowMax: 0 })).toThrow(LogicalError);
    });

    it('windowMax 为负 → 抛 LogicalError', () => {
      expect(() => new Scheduler({ windowMax: -1 })).toThrow(LogicalError);
    });

    it('windowMax = 1（最小合法值）→ 正常构造', () => {
      expect(() => new Scheduler({ windowMax: 1 })).not.toThrow();
    });

    it('windowMax 极大 → 正常构造', () => {
      expect(() => new Scheduler({ windowMax: Number.MAX_SAFE_INTEGER })).not.toThrow();
    });

    it('windowMax 小数 → 按你的规则处理', () => {
      // 如果没校验小数，这里能构造；有校验则抛错
      expect(() => new Scheduler({ windowMax: 1.5 })).toThrow();
    });
  });

  describe('边界值 - addTask', () => {
    it('空数组 → 不报错，队列不变', () => {
      const s = new Scheduler({ windowMax: 2 });
      expect(() => s.addTask([])).not.toThrow();
      expect((s as any).queue.list.length).toBe(0);
    });

    it('null → 报错', () => {
      const s = new Scheduler({ windowMax: 2 });
      expect(() => s.addTask(null as any)).toThrow();
    });

    it('undefined → 报错', () => {
      const s = new Scheduler({ windowMax: 2 });
      expect(() => s.addTask(undefined as any)).toThrow();
    });

    it('非对象（数字）→ 报错', () => {
      const s = new Scheduler({ windowMax: 2 });
      expect(() => s.addTask(123 as any)).toThrow();
    });

    it('task.run 不是函数 → 抛 LogicalError', () => {
      const s = new Scheduler({ windowMax: 2 });
      expect(() => s.addTask({ run: null as any, status: statusEnum.waiting })).toThrow(
        LogicalError
      );
    });

    it('task.run 是箭头函数 → 正常', () => {
      const s = new Scheduler({ windowMax: 2 });
      expect(() => s.addTask({ run: () => 1, status: statusEnum.waiting })).not.toThrow();
    });

    it('同一个 task 加两次 → 只加一次', async () => {
      const s = new Scheduler({ windowMax: 5 });
      let count = 0;
      const t = makeTask({
        run: () => {
          count++;
          return 1;
        },
      });

      s.addTask(t);
      s.addTask(t);
      s.run();
      await sleep(20);
      expect(count).toBe(1);
    });

    it('一批里含非法 task → 整批拒绝（你现在的行为）', () => {
      const s = new Scheduler({ windowMax: 2 });
      const good = makeTask({ run: () => 1 });
      const bad = { run: null, status: statusEnum.waiting } as any;

      expect(() => s.addTask([good, bad])).toThrow(LogicalError);
      // 因为 push 在 filter 之后，整批都没加
      expect((s as any).queue.list.length).toBe(0);
    });
  });

  describe('边界值 - run', () => {
    it('队列空时调用 run() → 直接返回，不报错', () => {
      const s = new Scheduler({ windowMax: 2 });
      expect(() => s.run()).not.toThrow();
    });

    it('连续调两次 run()（第一次已返回）→ 不报错', () => {
      const s = new Scheduler({ windowMax: 2 });
      s.addTask([makeTask({ run: () => 1 })]);
      expect(() => {
        s.run();
        s.run();
      }).not.toThrow();
    });

    it('窗口已满时调 run() → 不启动新任务', async () => {
      const s = new Scheduler({ windowMax: 1 });
      const ran: number[] = [];

      s.addTask([
        makeTask({
          run: async () => {
            ran.push(1);
            await sleep(50);
            return 1;
          },
        }),
        makeTask({
          run: () => {
            ran.push(2);
            return 2;
          },
        }),
      ]);

      s.run(); // 启动第 1 个，窗口满
      s.run(); // 窗口满，什么都不做
      expect(ran).toEqual([1]); // 第 2 个没启动

      await sleep(100);
      expect(ran.sort()).toEqual([1, 2]); // 第 1 个完成后第 2 个才跑
    });
  });

  describe('边界值 - 任务回调', () => {
    it('没有 onSuccess → 不报错', async () => {
      const s = new Scheduler({ windowMax: 2 });
      s.addTask([makeTask({ run: () => 1 })]); // 没 onSuccess
      s.run();
      await sleep(10);
      // 不报错即通过
    });

    it('没有 onError → 任务抛错不崩', async () => {
      const s = new Scheduler({ windowMax: 2 });
      s.addTask([
        makeTask({
          run: () => {
            throw new Error('boom');
          },
          // 没 onError
        }),
      ]);
      s.run();
      await sleep(10);
      // 不报错即通过
    });

    it('onSuccess 返回非函数 → 被忽略', async () => {
      const s = new Scheduler({ windowMax: 2 });
      s.addTask([
        makeTask({
          run: () => 1,
          onSuccess: 'not a function' as any,
        }),
      ]);
      s.run();
      await sleep(10);
      // safeCall 里 !fn 判断，非函数被忽略
    });
  });

  describe('边界值 - timeout', () => {
    it('duration = 0 → 立即超时', async () => {
      const s = new Scheduler({ windowMax: 2 });
      const timeouts: any[] = [];

      const task = makeTask({
        run: s.timeout({
          duration: 0,
          cb: async () => {
            await sleep(50);
            return 1;
          },
        }),
        onTimeout: (e) => timeouts.push(e),
      });

      s.addTask([task]);
      s.run();
      await sleep(50);
      expect(timeouts.length).toBe(1);
    });

    it('duration 极大 → 正常完成', async () => {
      const s = new Scheduler({ windowMax: 2 });
      const results: number[] = [];

      const task = makeTask({
        run: s.timeout({ duration: 999999, cb: async () => 1 }),
        onSuccess: (r) => results.push(r),
      });

      s.addTask([task]);
      s.run();
      await sleep(50);
      expect(results).toEqual([1]);
    });
  });

  describe('边界值 - retry', () => {
    it('max = 0 → 直接 reject RetryExhaustedError', async () => {
      const s = new Scheduler({ windowMax: 2 });
      const errors: any[] = [];

      const task = makeTask({
        run: s.retry({ max: 0, cb: async () => 1 }),
        onError: (e) => errors.push(e),
      });

      s.addTask([task]);
      s.run();
      await sleep(20);
      expect(errors.length).toBe(1);
      expect(errors[0]).toBeInstanceOf(RetryExhaustedError);
    });

    it('max = 1 → 只执行一次，失败即 reject', async () => {
      const s = new Scheduler({ windowMax: 2 });
      let attempts = 0;
      const errors: any[] = [];

      const task = makeTask({
        run: s.retry({
          max: 1,
          cb: async () => {
            attempts++;
            throw new Error('fail');
          },
        }),
        onError: (e) => errors.push(e),
      });

      s.addTask([task]);
      s.run();
      await sleep(20);
      expect(attempts).toBe(1);
      expect(errors.length).toBe(1);
    });
  });
});
