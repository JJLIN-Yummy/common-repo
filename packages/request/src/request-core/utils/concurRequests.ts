import { uuidv4 } from '@common/tools';

type queueType = {
  list: Map<
    string,
    { resolve: (value: any) => void; reject: (value: any) => void; task: () => Promise<any> }
  >;
  is_running: boolean;
  running_counter: number;
  max: number;
};

// let running_counter = 0;
// let id = 0;

export type concurRequestsType = (max: number) => {
  emitter: (task: () => Promise<any>) => Promise<any>;
};

export const concurRequests: concurRequestsType = (max = 3) => {
  // const curId = ++id;
  const queue: queueType = {
    list: new Map(),
    is_running: false,
    running_counter: 0,
    max,
  };

  return {
    emitter(task) {
      return new Promise((resolve, reject) => {
        const key = uuidv4() + Date.now();
        queue.list.set(key, { resolve, reject, task });
        run(queue);
      });
    },
  };
};

function run(queue: queueType) {
  const max = queue.max; //阈值

  if (queue.list.size <= 0 || max <= 0 || (queue.is_running && queue.running_counter >= max)) {
    return;
  }

  const tasks = Array.from(queue.list).slice(0, max - queue.running_counter);
  queue.is_running = true;

  tasks.forEach((task) => {
    queue.running_counter = Math.min(max, queue.running_counter + 1); //实际运行的个数
    // queue.running_counter = queue.running_counter+1

    task[1]
      .task()
      .then((res) => {
        task[1].resolve(res);
      })
      .catch((e) => {
        task[1].reject(e);
      })
      .finally(() => {
        queue.running_counter = Math.max(0, queue.running_counter - 1); //运行结束之后，-1
        // queue.running_counter =queue.running_counter-1; //运行结束之后，-1

        if (queue.running_counter === 0 && queue.list.size <= 0) {
          //請求結束
          queue.is_running = false;
          return;
        }
        run(queue);
      });

    queue.list.delete(task[0]); //移出队列
  });
}
