// todo:error类型不会做了
import { throwError } from '@/error';
import type { promiseThenDataType } from '../types/http';

export async function promiseTransformer<D>(fn: () => Promise<D>): Promise<promiseThenDataType<D>> {
  // return fn().then((data) => {
  //     return ({ data, error: null }) as promiseThenDataType<D>;
  // }).catch((error) => {
  //     return ({ data: null, error: error ?? throwError('无法识别的错误，请检查你的代码') }) ;
  // }).finally(() => {

  // })

  return new Promise((resolve, reject) => {
    fn()
      .then((data) => {
        resolve({ data, error: null });
      })
      .catch((error) => {
        reject({
          data: null,
          error: error ?? throwError('server error'),
        });
      })
      .finally(() => {});
  });
}
