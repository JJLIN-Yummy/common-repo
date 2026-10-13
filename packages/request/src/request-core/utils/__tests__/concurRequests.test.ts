import { beforeEach, describe, expect, test } from 'vitest';
import { concurRequests, type emitterType } from '@/request-core';

describe('测试并发任务处理器', () => {
  let emitter: emitterType;
  beforeEach(() => {
    emitter = concurRequests(5).emitter;
  });

  test('测试 一个串行任务', async () => {
    const result = await emitter(async () => {
      return 1;
    });

    expect(result).toBe(1);
  });

  test('测试 2个串行任务', async () => {
    const result1 = await emitter(async () => {
      return 1;
    });
    expect(result1).toBe(1);

    const result2 = await emitter(async () => {
      return 2;
    });
    expect(result2).toBe(2);
  });

  test('测试 1个嵌套串行任务', async () => {
    const sortArr: number[] = [];
    const result1 = await emitter(async () => {
      sortArr.push(1);
      const result2 = await emitter(async () => {
        sortArr.push(2);
        return 2;
      });
      expect(result2).toBe(2);
      sortArr.push(3);
      return 1;
    });
    sortArr.push(4);
    expect(result1).toBe(1);
    expect(sortArr).toEqual([1, 2, 3, 4]);
  });

  test('测试 2个串行任务+1个嵌套串行任务', async () => {
    const sortArr: number[] = [];
    const result1 = await emitter(async () => {
      sortArr.push(1);
      const result2 = await emitter(async () => {
        sortArr.push(2);
        return 2;
      });
      expect(result2).toBe(2);
      sortArr.push(3);
      return 1;
    });

    const result3 = await emitter(async () => {
      sortArr.push(4);

      return 3;
    });

    sortArr.push(5);
    expect(result1).toBe(1);
    expect(result3).toBe(3);
    expect(sortArr).toEqual([1, 2, 3, 4, 5]);
  });

  test('测试 2个串行任务+2个嵌套串行任务', async () => {
    const sortArr: number[] = [];
    const result1 = await emitter(async () => {
      sortArr.push(1);
      const result2 = await emitter(async () => {
        sortArr.push(2);
        return 2;
      });
      expect(result2).toBe(2);
      sortArr.push(3);
      return 1;
    });

    const result3 = await emitter(async () => {
      sortArr.push(4);
      const result4 = await emitter(async () => {
        sortArr.push(5);
        return 4;
      });
      expect(result4).toBe(4);
      sortArr.push(6);
      return 3;
    });

    sortArr.push(7);
    expect(result1).toBe(1);
    expect(result3).toBe(3);
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('1个3层嵌套任务', async () => {
    const sortArr: number[] = [];

    const result1 = await emitter(async () => {
      sortArr.push(1);
      const result2 = await emitter(async () => {
        sortArr.push(2);
        const result3 = await emitter(async () => {
          sortArr.push(3);
          return 3;
        });
        sortArr.push(4);
        expect(result3).toBe(3);
        return 2;
      });
      sortArr.push(5);
      expect(result2).toBe(2);
      return 1;
    });
    sortArr.push(6);
    expect(result1).toBe(1);
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6]);
  });
  test('1个3层嵌套任务+两个串行任务', async () => {
    const sortArr: number[] = [];

    const result1 = await emitter(async () => {
      sortArr.push(1);
      const result2 = await emitter(async () => {
        sortArr.push(2);
        const result3 = await emitter(async () => {
          sortArr.push(3);
          return 3;
        });
        sortArr.push(4);
        expect(result3).toBe(3);
        return 2;
      });
      sortArr.push(5);
      expect(result2).toBe(2);
      return new Promise((resolve) => {
        setTimeout(() => resolve(1), 500);
      });
    });

    const result4 = await emitter(async () => {
      sortArr.push(6);
      return 4;
    });
    sortArr.push(7);

    expect(result4).toBe(4);
    expect(result1).toBe(1);
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  //============================================================
  test('测试单个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(3);
        resolve(1);
        return 1;
      });
      sortArr.push(2);
    });
    expect(sortArr).toEqual([1, 3, 2]);
  });

  test('测试单个嵌套非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(3);
        emitter(async () => {
          sortArr.push(5);
          return 1;
        });
        sortArr.push(4);
        return 1;
      });
      sortArr.push(2);
      resolve(1);
    });
    expect(sortArr).toEqual([1, 3, 5, 4, 2]);
  });

  test('测试2个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(3);
        return 1;
      });

      emitter(async () => {
        sortArr.push(4);
        return 2;
      });

      sortArr.push(2);
      resolve(2);
    });
    expect(sortArr).toEqual([1, 3, 4, 2]);
  });

  test('测试3个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        return 1;
      });

      emitter(async () => {
        sortArr.push(3);
        return 2;
      });

      emitter(async () => {
        sortArr.push(4);
        return 5;
      });

      sortArr.push(5);
      resolve(2);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5]);
  });

  test('测试4个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        return 1;
      });

      emitter(async () => {
        sortArr.push(3);
        return 2;
      });

      emitter(async () => {
        sortArr.push(4);
        return 3;
      });

      emitter(async () => {
        sortArr.push(5);
        return 4;
      });

      sortArr.push(6);
      resolve(2);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('测试1个非串行任务 + 1个非串行嵌套任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        return 1;
      });

      emitter(async () => {
        sortArr.push(3);
        emitter(async () => {
          sortArr.push(4);
          return 3;
        });
        sortArr.push(5);
        return 2;
      });

      sortArr.push(6);
      resolve(3);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('测试2个非串行嵌套任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        emitter(async () => {
          return 3;
        });
        sortArr.push(3);
        return 2;
      });

      emitter(async () => {
        sortArr.push(4);
        emitter(async () => {
          sortArr.push(5);
          return 3;
        });
        sortArr.push(6);
        return 2;
      });

      sortArr.push(7);
      resolve(3);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('测试1个串行任务和一个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise((resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        emitter(async () => {
          sortArr.push(3);
          emitter(async () => {
            sortArr.push(4);
            return 3;
          });
          sortArr.push(5);
          return 3;
        });
        sortArr.push(6);
        return 2;
      });

      sortArr.push(7);
      resolve(1);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  //=============================================
  test('测试1个串行任务和一个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise(async (resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        return 1;
      });

      await emitter(async () => {
        sortArr.push(3);
        return 1;
      });

      sortArr.push(4);
      resolve(2);
    });
    expect(sortArr).toEqual([1, 2, 3, 4]);
  });

  test('测试1个串行嵌套任务和一个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise(async (resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        return 1;
      });

      await emitter(async () => {
        sortArr.push(3);
        await emitter(async () => {
          sortArr.push(4);
          return 1;
        });
        return 1;
      });

      sortArr.push(5);
      resolve(2);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5]);
  });

  test('测试1个串行三层嵌套任务和一个非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise(async (resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        return 1;
      });

      // (async () => {
      await emitter(async () => {
        sortArr.push(3);
        await emitter(async () => {
          sortArr.push(4);
          await emitter(async () => {
            sortArr.push(5);
            return 1;
          });
          sortArr.push(6);
          return 1;
        });
        return 1;
      });
      // })();

      sortArr.push(7);
      resolve(2);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('测试1个串行三层嵌套任务和一个嵌套非串行任务', async () => {
    const sortArr: number[] = [];
    await new Promise(async (resolve) => {
      sortArr.push(1);
      emitter(async () => {
        sortArr.push(2);
        emitter(async () => {
          sortArr.push(3);
          return 1;
        });
        sortArr.push(4);
        return 1;
      });
      sortArr.push(5);

      // (async () => {
      await emitter(async () => {
        sortArr.push(6);
        await emitter(async () => {
          sortArr.push(7);
          await emitter(async () => {
            sortArr.push(8);
            return 1;
          });
          sortArr.push(9);
          return 1;
        });
        sortArr.push(10);
        return 1;
      });
      // })();

      sortArr.push(11);
      resolve(2);
    });
    expect(sortArr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});
