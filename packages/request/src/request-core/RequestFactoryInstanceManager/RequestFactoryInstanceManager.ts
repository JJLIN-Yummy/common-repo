import { type IRequestFactory } from '@/request-core/RequestFactory/RequestFactory';
import { type responseType } from '#/http.d';
import {
  apiCacheMap,
  deepClone,
  type ICache,
  isFunction,
  type ITaskManager,
  TaskManager,
  throwTypeError,
} from '@common/tools';
import { type IApiCacheMap, isArray } from '@common/tools';
import { concurRequests, type concurRequestsType } from '@/request-core/utils/concurRequests';
import { isRequestCancelError } from '@/__tests__/utils/is';

export interface IRequestFactoryInstanceManager<R extends responseType> {
  add: (iid: number | string, instance: IRequestFactory<R>) => void;
  remove: (id: number | string) => void;
  runRequest: (
    iid: number | string,
    key: string,
    option: { requestFunc: () => Promise<any> }
  ) => Promise<any>;
  runRequestTask: (
    iid: number | string,
    key: string,
    option: {
      requestFuncList: Array<() => Promise<any>>;
      duration: number;
      resolve: (params: any) => void;
      reject: (params: any) => void;
      isCache: boolean;
    }
  ) => Promise<any>;
  getStorageList: (id: number | string) => ICache | undefined;
  removeStorageList: (id: number | string) => void;
  getStorage: (id: number | string, key: string) => any;
  setStorage: (id: number | string, key: string, value: any, duration?: number | string) => void;
  removeStorage: (id: number | string, key: string) => void;
}

export type managerOptionType = {
  apiStorage: IApiCacheMap;
  maxCon?: number;
};

// enum taskType {
//   CACHE = 'cache',
// }

//========因为本人经验有限，目前不知道怎么设计任务数据结构，姑且随便写============
//比如请求完成之后删除缓存，取消某个请求等等
const deleteCacheMap: { [key: number]: Array<number> } = {
  // //厂区
  // [NumberEnum.TWO]: [NumberEnum.ONE],
  // [NumberEnum.THREE]: [NumberEnum.ONE],
  // [NumberEnum.FOUR]: [NumberEnum.ONE],
  // //制程
  // [NumberEnum.SIX]: [NumberEnum.FIVE],
  // [NumberEnum.SEVEN]: [NumberEnum.FIVE],
  // [NumberEnum.EIGHT]: [NumberEnum.FIVE],
  ////模号
  // [NumberEnum.TEN]:[NumberEnum.NINE],
  // [NumberEnum.ELEVEN]:[NumberEnum.NINE],
  // [NumberEnum.TWELVE]:[NumberEnum.NINE],
  //  //设备机台号
  //  [NumberEnum.SIXTEEN]:[NumberEnum.THIRTEEN],
  //  [NumberEnum.FIFTEEN]:[NumberEnum.THIRTEEN],
  //  [NumberEnum.FOURTEEN]:[NumberEnum.THIRTEEN],
  //  //型号
  //  [NumberEnum.EIGHTEEN]:[NumberEnum.SEVENTEEN],
  //  [NumberEnum.NINETEEN]:[NumberEnum.SEVENTEEN],
  //  [NumberEnum.TWENTY]:[NumberEnum.SEVENTEEN],
  //  //点检属性
  //  [NumberEnum.TWENTY_TWO]:[NumberEnum.TWENTY_ONE],
  //  [NumberEnum.TWENTY_THREE]:[NumberEnum.SEVENTEEN],
  //  [NumberEnum.TWENTY_FOUR]:[NumberEnum.SEVENTEEN],
  //角色
  // [NumberEnum.FORTY]: [NumberEnum.THIRTY_NINE],
};

interface IRequestEmitMap {
  getTask: (id: number | string) => IRequestEmitTaskManager | undefined;
  getTaskList: (id: number | string, key: string) => Array<(...args: any[]) => any>;
  setTask: (id: number | string, taskManager: IRequestEmitTaskManager) => void;
  setTaskList: (id: number | string, key: string, tasks: Array<taskItemType>) => void;
  deleteTask: (id: number | string) => boolean;
  deleteTaskList: (id: number | string, key: string, ...args) => boolean;
}

//Inherit the TaskManager class
/**
 * id=>TaskManger(TaskManger.results:{done:boolean}) done就是该次请求是否完成（done类似于状态码2XX含义）
 */
type IRequestEmitTaskManager = ITaskManager;
type taskItemType = { [key: string]: any };
class RequestEmitTaskManager extends TaskManager<taskItemType> implements IRequestEmitTaskManager {
  /**
   *
   * @param type
   * @param result
   * @param option
   * @param option.done  请求是否正常完成
   * @param option.error 请求是否发生错误，如果发生错误该队列请求全部停止发送
   */
  addResult(
    type: string,
    result: any,
    option?: {
      done?: boolean;
      waiting?: boolean;
      error?: boolean;
      resolve: Array<(params: any) => void>;
      reject: Array<(params: any) => void>;
      [key: string]: any;
    },
    isReplace = true
  ): void {
    if (!this.results[type] || isArray(this.results[type])) {
      //initial
      this.results[type] = {};
    }

    if (isReplace) {
      this.results[type] = this.generateResult(result, option ?? { resolve: [] });
    } else {
      if (option?.resolve && isArray(option.resolve)) {
        if (this.results[type]?.resolve && isArray(this.results[type].resolve)) {
          option.resolve.unshift(...this.results[type].resolve);
        }
      }
      if (option?.reject && isArray(option.reject)) {
        if (this.results[type]?.reject && isArray(this.results[type].reject)) {
          option.reject.unshift(...this.results[type].reject);
        }
      }

      Object.assign(this.results[type], this.generateResult(result, option ?? { resolve: [] }));
    }
  }

  generateResult(
    result: any,
    option?: { done?: boolean; error?: boolean; resolve: Array<(data: any) => void> }
  ) {
    return { ...option, result };
  }
}

class RequestEmitMap implements IRequestEmitMap {
  public taskMap: Map<number | string, IRequestEmitTaskManager> = new Map();

  constructor() {}

  // execute(id: number | string, key: string) { }

  getTask(id: number | string): IRequestEmitTaskManager | undefined {
    return this.taskMap.get(id);
  }

  getTaskList(id: number | string, key: string): Array<(...args: any[]) => any> {
    const tasksManager = this.getTask(id);
    if (tasksManager) {
      return (tasksManager.getTask(key) as []) ?? [];
    }
    return [];
  }

  setTask(id: number | string, taskManager: IRequestEmitTaskManager): void {
    if (this.getTask(id)) return;
    this.taskMap.set(id, taskManager);
  }

  setTaskList(id: number | string, key: string, tasks: Array<taskItemType>): void {
    const tasksManager = this.getTask(id) ?? new RequestEmitTaskManager();
    tasksManager.addTask({ [key]: tasks });
    this.taskMap.set(id, tasksManager);
  }

  /**
   * Empty the list of requests of a certain type by id
   * @param id
   * @returns
   */
  deleteTask(id: number | string): boolean {
    return this.taskMap.delete(id);
  }

  /**
   * Empty the list of requests of a certain type by id and key
   * @param id
   * @param key
   * @returns
   */
  deleteTaskList(id: number | string, key: string, isDelete = false): boolean {
    const taskList = this.taskMap.get(id);
    if (taskList) {
      taskList.cleanTask(key, isDelete);
    }
    return true;
  }
}

/**
 * 解释：
 * 1. instanceMap
 *  数据结构：id=>RequestFactory
 *  定义：每个RequestFactory都有一个唯一的Id
 * 2. apiStorage
 *  数据结构：Id=>[key=>data]
 *  定义：id代表RequestFactory的id,key是根据每次请求的option生成的，data是每次请求的值
 * 3. requestEmitMap
 *  数据结构：id=>[{key:请求函数}]
 *  定义：id代表RequestFactory的id，key是根据每次请求的option生成的，请求函数该一类请求（id和key都相同）的函数
 *  补充：因为一个id对应一个API，但是一个API的option有多钟，所以key就是多钟，每一个key对应多个一样的请求函数
 *
 *
 * 缓存详解：
 *  requestEmitMap为每一类请求维护了亮个队列，一个是任务队列({key:请求的function})，
 * 另一个是结果队列(resultQueue:{
 *      result:any,
 *      {
 *          done:boolean,
 *          waiting:boolean,
 *          error:boolean,
 *          resolve:Array<Promise的resolve>,
 *          reject:Array<Promise的reject>}
 * })。
 * 1.对于同一类的并发（会有多个）的请求，先收集该请求的resolve,reject保存在结果队列里面
 * 2.如果done=true,cache!=null|undefined,就遍历resolve直接返回缓存。
 * 3.如果done=true,cache=null|undefined，就需要将done设为false,然后将当前任务放进任务队列taskQueue，如果此时waiting=false，就去发送请求。
 * 如果waiting=true,就等待结果，然后遍历resolve返回。
 * 4.如果done=false,waiting=false将该次请求任务放进任务队列,然后发送请求。
 * 5.如果done=false,waiting=true，直接将请求任务放进队列即可。
 * 6.两个相同类型的请求，先后发出，若第一个被取消，应该走reject
 */
export class RequestFactoryInstanceManager implements IRequestFactoryInstanceManager<responseType> {
  public instanceMap: Map<number | string, IRequestFactory<responseType>>;
  public apiStorage: IApiCacheMap;
  public requestEmitMap: IRequestEmitMap;
  public emitter: ReturnType<concurRequestsType>['emitter'];

  constructor(option: managerOptionType) {
    this.instanceMap = new Map(); //id=>RequestFactory
    this.apiStorage = option.apiStorage; //Id=>[key=>data]
    this.requestEmitMap = new RequestEmitMap(); //请求的任务队列id=>[{key:请求函数}]
    this.emitter = concurRequests(option?.maxCon ?? 15).emitter;
  }

  //===================实例========================
  add(id: number | string, instance: IRequestFactory<responseType>) {
    if (!this.instanceMap.get(id)) {
      this.instanceMap.set(id, instance);
    }
  }
  remove(id: number | string) {
    return this.instanceMap.delete(id);
  }
  get(id: number | string) {
    return this.instanceMap.get(id);
  }

  //===================缓存队列========================
  getStorageList(id: number | string) {
    return this.apiStorage.getList(id);
  }

  setStorageList(id: number | string, value: ICache) {
    return this.apiStorage.setList(id, value);
  }
  removeStorageList(id: number | string) {
    this.apiStorage.deleteList(id);
  }

  getStorage(id: number | string, key: string) {
    return this.apiStorage.get(id, key);
  }
  setStorage(id: number | string, key: string, value: any, duration?: number | string) {
    return this.apiStorage.set(id, key, value, duration);
  }
  removeStorage(id: number | string, key: string) {
    return this.apiStorage.delete(id, key);
  }

  //===================请求队列========================
  getRequestEmitList(id: number | string) {
    return this.requestEmitMap.getTask(id);
  }

  setRequestEmitList(id: number | string, value: IRequestEmitTaskManager) {
    this.requestEmitMap.setTask(id, value);
  }
  removeRequestEmit(id: number | string) {
    return this.requestEmitMap.deleteTask(id);
  }

  getRequestEmit(id: number | string, key: string): Array<(...args: any[]) => any> {
    return this.requestEmitMap.getTaskList(id, key);
  }
  setRequestEmit(id: number | string, key: string, value: Array<taskItemType>) {
    this.requestEmitMap.setTaskList(id, key, value);
  }
  removeRequestEmitList(id: number | string, key: string, isDelete = false) {
    return this.requestEmitMap.deleteTaskList(id, key, isDelete);
  }
  requestEmitTaskManagerGenerator() {
    return new RequestEmitTaskManager();
  }

  /**
   * 根据id和key执行请求函数,每次执行改函数会获取最新的请求队列。 该函数作用：Just one of them will do(对于同一类的请求只需要请求一次成功即可)
   * @param id 该请求家族的唯一标识
   * @param key 该次请求组的唯一标识
   * @param index 请求的索引
   * @returns Promise
   */
  emitRequestOneByOne(id: number | string, key: string, index: number) {
    const requestList = this.getRequestEmit(id, key);
    //以防万一，check if has cache
    const cache = this.getStorage(id, key);

    if (cache) {
      return Promise.resolve(deepClone(cache));
    }
    if (index * 1 >= requestList.length) {
      return Promise.reject({ message: 'Request Failed' });
    }

    if (requestList && isArray(requestList)) {
      return new Promise((resolve, reject) => {
        // let taskManager = this.requestEmitMap.getTask(id);
        // const result = taskManager?.getResult(key);
        // requestList[index]()
        this.emitter(() => requestList[index]())
          .then((res) => {
            //this.apiStorage.set(id,key,res,result.duration); //The result is put into the cache
            resolve(deepClone(res));
            // resolve(res);
          })
          .catch((e) => {
            let taskManager = this.requestEmitMap.getTask(id);
            //如果错误是 请求取消 直接返回错误
            if (!taskManager) {
              taskManager = this.requestEmitTaskManagerGenerator();
              this.setRequestEmitList(id, taskManager);
            }
            if (isRequestCancelError(e.raw)) {
              // console.log(213123, taskManager.getResult(key));
              const r = taskManager.getResult(key).reject[index];
              if (r) {
                isFunction(r) && r(e);
              }
            }

            if (index * 1 >= requestList.length - 1) {
              //this.apiStorage.set(id,key,e,result.duration); //The result is put into the cache
              reject(e);
              return e;
            }

            this.emitRequestOneByOne(id, key, ++index)
              .then((res) => {
                //this.apiStorage.set(id,key,res,result.duration); //The result is put into the cache
                resolve(res);
              })
              .catch((err) => {
                reject(err);
              });
            return e;
          });
      });
    }

    return Promise.reject({ message: 'Request Failed' });
  }

  runRequestTask(
    id: number | string,
    key: string,
    option: {
      requestFuncList: Array<() => Promise<any>>;
      duration: number;
      resolve: (params: any) => void;
      reject: (params: any) => void;
      isCache: boolean;
    }
  ) {
    let taskManager = this.requestEmitMap.getTask(id);
    if (!taskManager) {
      taskManager = this.requestEmitTaskManagerGenerator();
      this.setRequestEmitList(id, taskManager);
    }

    const { done = false, error = false, waiting = false } = taskManager.getResult(key) ?? {};
    const cache = deepClone(this.getStorage(id, key));

    taskManager.addResult(
      key,
      null,
      {
        isCache: option.isCache,
        resolve: [option.resolve],
        reject: [option.reject],
        duration: option.duration,
      },
      false
    ); //先缓存resolve
    //1.Check if done is true
    if (done && cache) {
      //If the request of this class has been completed, read the cached result directly
      //Empty the request queue
      this.removeRequestEmitList(id, key);
      taskManager.getResult(key).resolve.forEach((r) => {
        r(cache);
      });
      return Promise.resolve(cache);
    } else {
      //Put the current request function into the request waiting queue And set the done status to false
      taskManager.addResult(key, null, { done: false }, false);
      this.setRequestEmit(id, key, [...option.requestFuncList]);
    }
    //2.Check if error is true
    if (error) {
      this.removeRequestEmitList(id, key);
      const result = deepClone(this.getStorage(id, key));

      taskManager.getResult(key).reject.forEach((r) => {
        r(result);
      });
      return Promise.reject('Request Failed');
    }
    if (waiting) {
      return Promise.resolve('waiting...');
    }

    taskManager.addResult(key, null, { done: false, waiting: true }, false);

    // return emitter(()=>this.emitRequestOneByOne(id,key,0))
    return this.emitRequestOneByOne(id, key, 0)
      .then((res) => {
        //将成功的信号放到taskManager
        // this.removeRequestEmitList(id,key);
        const result = taskManager?.getResult(key);
        if (option.isCache) {
          this.apiStorage.set(id, key, res, result.duration);
        }
        res = deepClone(res);

        result.resolve.forEach((r) => {
          r(res);
        });

        taskManager.addResult(key, null, { done: true });
        return res;
      })
      .catch((e) => {
        const result = taskManager?.getResult(key);
        // console.log(e,213123)
        if (option.isCache && e.code !== 'ERR_CANCELED') {
          this.apiStorage.set(id, key, e, result.duration);
          taskManager.addResult(key, null, { error: true });
        }
        result.reject.forEach((r) => {
          r(e);
        });
        taskManager.addResult(key, null, { waiting: false });
        return e;
      })
      .finally(() => {
        this.removeRequestEmitList(id, key, true);
      });
  }

  //不走缓存的请求
  runRequest(
    id: number | string,
    key: string,
    option: { requestFunc: () => Promise<any> }
  ): Promise<any> {
    if (option.requestFunc) {
      return new Promise((resolve, reject) => {
        this.runRequestTask(id, key, {
          requestFuncList: [option.requestFunc],
          resolve,
          reject,
          isCache: false,
          duration: 60000,
        })
          .then(() => {
            // resolve(res);
          })
          .catch(() => {
            // reject(err);
          });
      });

      option.requestFunc().then((res) => {
        this.deleteCache(id);
        return res;
      });
    }
    throw throwTypeError('option.requestFunc', option.requestFunc, '类型错误');
  }

  //某些請求成功之後，需要刪除其他請求的緩存
  deleteCache(id: number | string) {
    for (const key in deleteCacheMap) {
      if (id === Number(key)) {
        const list = deleteCacheMap[key];
        list.forEach((item) => {
          this.removeStorageList(item * 1);
        });
      }
    }
  }
}

const requestManager = new RequestFactoryInstanceManager({
  apiStorage: apiCacheMap,
});
export default requestManager;
