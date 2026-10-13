import { type taskType } from './task';
import { isFunction, isPromise } from '../../MyObject';
import { isArray } from '../../MyArray';
import {
  ErrorMessage,
  LogicalError,
  ReentrantError,
  RetryExhaustedError,
  TimeoutError,
} from '../error';
import { isObject } from '../../is_';

export const statusEnum = {
  waiting: 'waiting',
  running: 'running',
  finished: 'finished',
} as const;
export type statusType = typeof statusEnum;
export type statusValueType = statusType[keyof statusType];

export type optionType = {
  windowMax: number;
};
export type queueType = {
  list: taskType[];
  isRunningCounter: number;
  isRunning: boolean;
};

export class Scheduler {
  private queue: queueType = {
    list: [],
    isRunningCounter: 0,
    isRunning: false,
  };
  constructor(private option: optionType) {
    if (this.option.windowMax <= 0) {
      throw new LogicalError({ message: 'windowMax必须大于0' });
    }
  }

  addTask(taskOrTasks: taskType | taskType[]) {
    const tasks: taskType[] = [];
    if (!isArray(taskOrTasks)) {
      tasks.push(taskOrTasks);
    } else {
      tasks.push(...taskOrTasks);
    }
    const queueSet = new Set(tasks);

    const existing = new Set(this.queue.list);
    const unique = Array.from(queueSet).filter((task) => {
      if (isArray(task)) throw new LogicalError({ message: '不能传入非法任务' });
      if (!isObject(task)) throw new LogicalError({ message: '不能传入非法任务' });
      if (!task) throw new LogicalError({ message: '不能传入空任务' });
      if (!isFunction(task.run)) throw new LogicalError();
      if (existing.has(task)) return false;
      existing.add(task);
      return true;
    });
    this.queue.list.push(...unique);
  }

  timeout(option: { cb: taskType['run']; duration: number }) {
    const { cb, duration } = option;

    return async () => {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          const e = new TimeoutError({ message: ErrorMessage.TIMEOUT, duration });
          reject(e);
          clearTimeout(t);
        }, duration);

        try {
          const returnValue = cb();
          if (isPromise(returnValue)) {
            returnValue
              .then((res) => {
                resolve(res);
              })
              .catch((err) => {
                reject(err);
              })
              .finally(() => {
                clearTimeout(t);
              });
          } else {
            resolve(returnValue);
            clearTimeout(t);
          }
        } catch (e) {
          reject(e);
          clearTimeout(t);
        }
      });
    };
  }

  retry(option: { cb: taskType['run']; max: number }) {
    const { cb, max } = option;

    return async () => {
      return new Promise((resolve, reject) => {
        retryWrapper(cb, max)
          .then((res) => {
            resolve(res);
          })
          .catch((err) => {
            reject(err);
          });
      });
    };
  }

  run() {
    if (this.queue.list.length <= 0) {
      return;
    }

    if (this.queue.isRunning) {
      throw new ReentrantError({ message: ErrorMessage.REENTRANT });
    }
    if (
      // this.queue.status === statusEnum.running ||
      this.option.windowMax <= this.queue.isRunningCounter
    )
      return;
    this.queue.isRunning = true;
    //找出状态是waiting的任务
    const waitingTasks = this.queue.list
      .filter((task) => {
        return task.status === statusEnum.waiting;
      })
      .slice(0, this.option.windowMax - this.queue.isRunningCounter);
    try {
      waitingTasks.forEach((task) => {
        // this.queue.status = statusEnum.running;
        this.queue.isRunningCounter++;
        task.status = statusEnum.running;
        try {
          const returnValue = task.run();
          if (isPromise(returnValue)) {
            returnValue
              .then((res) => {
                this.safeCall(task.onSuccess, res);
              })
              .catch((err) => {
                if (err instanceof TimeoutError) {
                  this.safeCall(task.onTimeout, err);
                } else {
                  this.safeCall(task.onError, err);
                }
              })
              .finally(() => {
                finishedHook({ queue: this.queue, task, run: this.run.bind(this) });
              });
          } else {
            this.safeCall(task.onSuccess, returnValue);
            finishedHook({ queue: this.queue, task, run: this.run.bind(this) });
          }
        } catch (err) {
          if (err instanceof TimeoutError) {
            this.safeCall(task.onTimeout, err);
          } else {
            this.safeCall(task.onError, err);
          }
          finishedHook({ queue: this.queue, task, run: this.run.bind(this) });
        }
      });
    } finally {
      this.queue.isRunning = false;
    }
  }

  /**
   * 安全调用任务回调：回调抛错只记日志，不影响调度器
   */
  private safeCall(fn: ((arg: any) => void) | undefined, arg: any) {
    if (!fn) return;
    try {
      fn(arg);
    } catch (e) {
      console.error('[Scheduler] 任务回调抛错', e);
    }
  }
}

const retryWrapper = (cb: taskType['run'], max: number) => {
  return new Promise((resolve, reject) => {
    if (max <= 0) {
      reject(new RetryExhaustedError(max));
      return;
    }
    max--;
    try {
      const returnValue = cb();
      if (isPromise(returnValue)) {
        returnValue
          .then((res) => {
            resolve(res);
          })
          .catch((err) => {
            if (max <= 0) {
              reject(err);
              return;
            }
            retryWrapper(cb, max)
              .then((res) => {
                resolve(res);
              })
              .catch((err) => {
                reject(err);
              });
          });
      } else {
        resolve(returnValue);
      }
    } catch (err) {
      if (max <= 0) {
        reject(err);
        return;
      }
      retryWrapper(cb, max)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    }
  });
};

const finishedHook = (option: { queue: queueType; task: taskType; run: () => void }) => {
  const { queue, task, run } = option;
  queue.isRunningCounter--;
  task.status = statusEnum.finished;
  //弹栈
  const deleteIndex = queue.list.findIndex((item) => {
    return task === item;
  });
  if (deleteIndex > -1) {
    queue.list.splice(deleteIndex, 1);
  }
  //如果还有任务 递归执行
  if (queue.list.length > 0) {
    Promise.resolve(1).then(() => run());
  }
  // else {
  //   queue.status = statusEnum.waiting;
  // }
};
