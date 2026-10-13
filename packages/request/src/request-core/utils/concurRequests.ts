import { isAsyncFunction, uuidv4 } from '@common/tools';

const taskStatus = {
  running: 'running',
  paused: 'paused',
  waiting: 'waiting',
  finished: 'finished',
} as const;

type taskStatusType = (typeof taskStatus)[keyof typeof taskStatus];

type resumeResolveType = {
  id: string;
  r: (value?: any) => any;
  status?: taskStatusType;
};

type resumeRejectType = {
  id: string;
  r: (value?: any) => any;
  status?: taskStatusType;
};

type taskType = {
  id?: string;
  status: taskStatusType;
  resolve: (value: any) => void;
  reject: (value: any) => void;
  task: () => Promise<any>;
  resumeResolve?: resumeResolveType[];
  resumeReject?: resumeRejectType[];
  prevTaskId?: string;
  taskId: string;
};

type queueType = {
  list: Map<string, taskType>;
  is_running: boolean;
  running_counter: number;
  max: number;
  activeTaskId?: string;
  finished_counter: number;
};

// let running_counter = 0;
// let id = 0;

export type emitterType = (task: (() => Promise<any>) | (() => any), id?: string) => Promise<any>;

export type concurRequestsType = (max: number) => {
  emitter: emitterType;
};

export const concurRequests: concurRequestsType = (max = 3) => {
  // const curId = ++id;
  const queue: queueType = {
    list: new Map(),
    is_running: false,
    running_counter: 0,
    max,
    activeTaskId: void 0,
    finished_counter: 0,
  };

  return {
    emitter(task, id) {
      return new Promise((resolve1, reject1) => {
        const prevTaskId = queue.activeTaskId;

        const key = id || uuidv4();
        // queue.activeTaskId = key;
        // console.log('我注册了', key, prevTaskId, queue.running_counter >= max);

        if (!isAsyncFunction(task)) {
          const t = task;
          task = () => {
            return new Promise((resolve, reject) => {
              try {
                resolve(t());
              } catch (e) {
                reject(e);
              }
            });
          };
        }

        // if (
        //   prevTaskId &&
        //   queue.running_counter >= max
        //   // queue.list.get(prevTaskId)!.status === taskStatus.running
        // ) {
        //   //说明是嵌套执行,停止-等待
        //   new Promise((resolve2, reject2) => {
        //     queue.list.set(key, {
        //       id,
        //       status: taskStatus.waiting,
        //       resolve: resolve2,
        //       reject: reject2,
        //       task,
        //       taskId: key,
        //       prevTaskId,
        //     });
        //     //设置父任务的信号量
        //     const prevTask = queue.list.get(prevTaskId);
        //     if (prevTask) {
        //       if (!prevTask.resumeResolve) {
        //         prevTask.resumeResolve = [];
        //       }
        //       if (!prevTask.resumeReject) {
        //         prevTask.resumeReject = [];
        //       }
        //
        //       prevTask.resumeResolve.push({
        //         id: key,
        //         r: resolve1,
        //       });
        //       prevTask.resumeReject.push({ id: key, r: reject1 });
        //       prevTask.status = taskStatus.paused; //父任务设置暂停状态
        //       //把父任务移到队尾
        //       moveToTail(prevTaskId, queue);
        //       queue.running_counter--;
        //     }
        //
        //     run(queue);
        //   });
        //   return;
        // }
        // console.log('顺序');
        queue.list.set(key, {
          id,
          status: taskStatus.waiting,
          resolve: resolve1,
          reject: reject1,
          task,
          taskId: key,
          prevTaskId,
        });
        run(queue);
      });
    },
  };
};

function run(queue: queueType) {
  const max = queue.max; //阈值

  // console.log('次数', queue.running_counter);
  if (queue.list.size <= 0 || max <= 0 || (queue.is_running && queue.running_counter >= max)) {
    return;
  }
  // console.log(queue.is_running, queue.running_counter, queue.finished_counter, queue.list);

  //清除已经执行完毕的任务
  // clearFinishedTasks(queue);

  //第一部先清空已经finished的任务里面的resumeResolve和resumeReject，并且删除
  // execResumeResolveAndResumeRejectByFinished(queue);

  const tasks = Array.from(queue.list);
  // console.log(tasks);

  const waitingTasks = tasks.filter(([_id, task]) => {
    return task.status === taskStatus.waiting;
  });

  const pausedTasks = tasks.filter(([_id, task]) => {
    return task.status === taskStatus.paused;
  });

  const waitingOrPausedTasks = [...waitingTasks, ...pausedTasks];

  queue.is_running = true;

  waitingOrPausedTasks.slice(0, max - queue.running_counter).forEach((task) => {
    queue.activeTaskId = task[0];

    if (task[1].status !== taskStatus.waiting) {
      moveToTail(task[0], queue);
      return;
    }

    // console.log('正常执行', task[1].id);
    queue.running_counter = Math.min(max, queue.running_counter + 1); //实际运行的个数

    let results: any;
    let isFulfilled = false;
    task[1].status = taskStatus.running;
    task[1]
      .task()
      .then((res) => {
        results = res;
        isFulfilled = true;
      })
      .catch((e) => {
        results = e;
        isFulfilled = false;
      })
      .finally(() => {
        // console.log('执行完毕', task[1].taskId, queue.list);
        // queue.finished_counter++;
        task[1].status = taskStatus.finished;
        queue.running_counter = Math.max(0, queue.running_counter - 1); //运行结束之后，-1
        // queue.running_counter =queue.running_counter-1; //运行结束之后，-1

        if (queue.running_counter === 0 && queue.list.size <= 0) {
          // if (queue.finished_counter > 0) {
          //   run(queue);
          // }
          //請求結束
          queue.is_running = false;
          return;
        }

        //
        if (task[1].prevTaskId) {
          //通知父任务自己已经结束
          const prevTask = queue.list.get(task[1].prevTaskId);
          if (prevTask) {
            // const newResumeResolve: resumeResolveType[] = [];
            // const newResumeReject: resumeRejectType[] = [];
            if (isFulfilled && prevTask.resumeResolve) {
              //resolve 结果
              const resumeResolveIndex = prevTask.resumeResolve.findIndex((item) => {
                return item.id === task[1].taskId;
              });
              const resumeResolve = prevTask.resumeResolve[resumeResolveIndex];

              if (resumeResolve) {
                const r = resumeResolve.r;
                resumeResolve.status = taskStatus.finished;
                // resumeResolve.r = () => r(results);
                r(results);
                prevTask.resumeResolve.splice(resumeResolveIndex, 1); //删除父任务的暂停信号
              }
              //移除相同id的resumeReject
              if (prevTask.resumeReject) {
                const shouldDeleteResumeRejectIndex = prevTask.resumeReject.findIndex((item) => {
                  return item.id === task[1].taskId;
                });
                if (shouldDeleteResumeRejectIndex >= 0) {
                  prevTask.resumeReject.splice(shouldDeleteResumeRejectIndex, 1);
                }
              }
            }
            if (!isFulfilled && prevTask.resumeReject) {
              const resumeRejectIndex = prevTask.resumeReject.findIndex((item) => {
                return item.id === task[1].taskId;
              });
              const resumeReject = prevTask.resumeReject[resumeRejectIndex];
              if (resumeReject) {
                const r = resumeReject.r;
                resumeReject.status = taskStatus.finished;
                // resumeReject.r = () => r(results);
                r(results);
                prevTask.resumeReject.splice(resumeRejectIndex, 1);
              }
              //移除相同id的resumeResolve
              if (prevTask.resumeResolve) {
                const shouldDeleteResumeResolveIndex = prevTask.resumeResolve.findIndex((item) => {
                  return item.id === task[1].taskId;
                });
                if (shouldDeleteResumeResolveIndex >= 0) {
                  prevTask.resumeResolve.splice(shouldDeleteResumeResolveIndex, 1);
                }
              }
            }
          }
        }

        // if (task[1].status === taskStatus.finished) {
        //   //如果 该任务已经运行完毕，任务出队
        //   queue.list.delete(task[0]);
        // }

        // console.log(task[1]);

        //如果resumeResolve或者resumeReject都是空就移除队列
        if (canDeleteTask(task[1].taskId, queue)) {
          queue.list.delete(task[0]); //移出队列
        }

        queue.activeTaskId = task[1].prevTaskId;

        if (isFulfilled) {
          task[1].resolve(results);
        } else {
          task[1].reject(results);
        }

        run(queue);
      });
  });
}

const canDeleteTask = (taskId: string | undefined, queue: queueType) => {
  if (!taskId) {
    return true;
  }
  const task = queue.list.get(taskId);

  if (!task) {
    return true;
  }

  if (task.status !== taskStatus.finished) return false;

  if (!task.resumeReject || !task.resumeResolve) return true;
  if (!task.resumeReject.length || !task.resumeResolve.length) return true;
  return false;
};

/**
const execResumeResolveAndResumeRejectByFinished = (queue: queueType) => {
  const tasks = Array.from(queue.list);
  const finishedTasks = tasks.filter(([_id, task]) => {
    return task.status === taskStatus.finished;
  });

  // console.log(1111, finishedTasks.length, tasks.length);
  if (finishedTasks.length === 0) {
    return;
  }

  const newResumeResolve: resumeResolveType[] = [];
  const newResumeReject: resumeRejectType[] = [];

  finishedTasks.forEach(([id, task]) => {
    const { resumeResolve, resumeReject } = task;
    if (!resumeResolve || !resumeReject) return;

    resumeResolve?.forEach((option) => {
      const { r, status, id } = option;
      if (status === taskStatus.finished) {
        r();
        //删掉对应的resumeReject
        if (resumeReject && !isEmptyArray(resumeReject)) {
          const resumeRejectDeleteIndex = resumeReject.findIndex(({ id: rejectId }) => {
            return id === rejectId;
          });
          resumeRejectDeleteIndex !== -1 && resumeReject.splice(resumeRejectDeleteIndex, 1);
        }
        return;
      }
      newResumeResolve.push(option);
    });
    resumeReject?.forEach((option) => {
      const { r, status, id } = option;
      if (status === taskStatus.finished) {
        r();
        //删掉对应的resumeResolve
        if (resumeResolve && !isEmptyArray(resumeResolve)) {
          const resumeResolveDeleteIndex = resumeResolve.findIndex(({ id: resolveId }) => {
            return id === resolveId;
          });
          resumeResolveDeleteIndex !== -1 && resumeResolve.splice(resumeResolveDeleteIndex, 1);
        }
        return;
      }
      newResumeReject.push(option);
    });

    resumeResolve && resumeResolve.splice(0, resumeResolve.length, ...newResumeResolve);
    resumeReject && resumeReject.splice(0, resumeReject.length, ...newResumeReject);

    if (resumeResolve.length === 0 || resumeReject.length === 0) {
      queue.list.delete(id);
    }
  });
};
*/

/**
 * 清理哪那些已经finished并且没有resumeResolve和resumeReject的任务
 */
// const clearFinishedTasks = (queue: queueType) => {
//   Array.from(queue.list).filter(([id]) => {
//     if (canDeleteTask(id, queue)) {
//       queue.list.delete(id);
//     }
//   });
// };

const moveToTail = (id: string, queue: queueType) => {
  const task = queue.list.get(id);
  if (!task) return;
  queue.list.delete(id);
  queue.list.set(id, task);
};
