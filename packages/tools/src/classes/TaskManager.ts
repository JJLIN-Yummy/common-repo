import { isNull, MyObject } from '@/MyObject';
import { isArray, isEmptyArray } from '@/MyArray';

type TaskItemType = {
  list: Array<() => any>;
  is_running: boolean;
  is_waiting: boolean;
  is_completed: boolean;
  [key: string]: any;
};

export interface ITaskManager<T = unknown> {
  runTask: (types: string | Array<string>) => void;
  addTask: (newTasks: taskListType<T>) => ITaskManager<T>;
  cleanTask: (types: string | Array<string>, isDelete?: boolean) => void;
  getTask: (
    types: string | Array<string>
  ) => Array<(...args: any[]) => any> | taskListType<T> | Array<T>;
  addResult: (type: string, result: any, ...args: any[]) => void;
  getResult: (types: string | Array<string>) => any;
}

export const TASK_TYPE_ALL = 'all';
export type taskListType<T = unknown> = { [key: string]: Array<((...args: any[]) => any) | T> };
export interface Task<T = (...args: any[]) => any> {
  [key: string]: Array<T> | TaskItemType;
}

export class TaskManager<T> implements ITaskManager<T> {
  public tasks: Task<T> = {
    //以后或许会有优先级 等等。。。。。
    common: [],
  }; //要执行的任务
  public results: { [key: string]: any } = {
    common: [],
  };

  constructor() {}

  /**
   *
   * @param types 要运行的类型
   * @returns
   */
  public runTask(types: string | Array<string> = TASK_TYPE_ALL): void {
    if (isNull(this.tasks)) return;
    let taskType: string[] = [];
    if (typeof types === 'string') {
      if (types === TASK_TYPE_ALL) {
        taskType = MyObject.keys(this.tasks);
      }
    } else {
      taskType.push(...types);
    }
    // const taskType = types === TASK_TYPE_ALL ? MyObject.keys(this.tasks) : types; //获取任务的类型

    for (let i = 0; i < taskType.length; i++) {
      //循环每个任务 并且添加到任务队列
      const type = taskType[i]; //当前的任务类型
      const tasks = this.tasks[type]; //当前的任务

      try {
        if (isEmptyArray(tasks)) continue; //如果当前的任务为空，就continue

        //如果不为空，把任务一个一个取出来执行

        tasks.forEach((task: (...args: any[]) => any) => {
          // console.log(tasks.length, tasks, type);

          this.addResult(type, task());
        });
      } catch (e) {}
    }
  }

  public isEmptyTask() {
    if (isNull(this.tasks)) return;
    const taskType = MyObject.keys(this.tasks); //获取任务的类型
    if (isEmptyArray(taskType)) return true; //如果没有任务类型，返回true

    //循环每个任务类型的任务
    let isEmpty = true;
    outer: for (let i = 0; i < taskType.length; i++) {
      const type = taskType[i]; //当前任务类型
      if (!isEmptyArray(this.tasks[type])) {
        isEmpty = false;
        break outer;
      } //如果不是空队列 就break
    }
    return isEmpty;
  }

  public addTask(newTasks: taskListType<T>): ITaskManager<T> {
    const taskType = MyObject.keys(newTasks); //获取任务的类型
    for (let i = 0; i < taskType.length; i++) {
      //循环每个任务 并且添加到任务队列

      const type = taskType[i]; //当前的任务类型
      const tasks = newTasks[type]; //当前的任务
      // if (!this.tasks[type]) {
      //   this.tasks[type] = [];
      // }
      if (isEmptyArray(tasks)) continue; //如果当前的任务为空，就continue
      if (!this.tasks[type]) {
        this.tasks[type] = [];
      }

      this.tasks[type].push(...tasks);
    }

    return this;
  }

  public getTask(types: string | Array<string>) {
    if (isArray(types)) {
      const taskList = {};
      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        if (this.tasks[type]) {
          taskList[type] = this.tasks[type];
        }
      }
      return taskList;
    }

    return this.tasks[types];
  }

  public shiftTask(type: string) {
    const task = this.tasks[type];
    if (task && Array.isArray(task) && task.length > 0) {
      task.shift();
    }
  }

  /**
   * 清除指定任务(只清除任务数组的元素)
   * @param types 任务类型
   * @returns
   */
  public cleanTask(types, isDelete = false) {
    if (isNull(this.tasks)) return;
    // const taskType = types === TASK_TYPE_ALL ? MyObject.keys(this.tasks) : types; //获取任务的类型

    const clearFunc = isDelete ? (obj, key) => delete obj[key] : (obj, key) => (obj[key] = []);

    clearFunc(this.tasks, types);
  }

  /**
   *
   * @param type the type of task
   * @param result the result of task
   */
  public addResult(type: string, result: any, ...args: any[]): void;
  public addResult(type: string, result: any): void {
    this.results[type].push(result);
  }
  /**
   *
   * @param types 结果的类型
   * @returns
   */
  public getResult(types: string | Array<string> = TASK_TYPE_ALL) {
    if (isArray(types)) {
      const resultList = {};
      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        if (this.results[type]) {
          resultList[type] = this.results[type];
        }
      }
      return resultList;
    }

    return this.results[types];
  }

  //重置任务
  public resetTask() {
    this.tasks = {
      common: [],
    };
    this.results = {
      common: [],
    };
  }
}
