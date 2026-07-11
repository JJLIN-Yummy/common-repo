import type { requestType, responseType } from '#/http';
import { httpClient } from '@/request-core/http-client';
import { configMap } from '@/__tests__/settings';
import { httpEmitter } from '@/__tests__/utils/httpUtils';
import { responseEnum } from '@/__tests__/responseEnum';
import { createHttpError } from '@/__tests__/utils/httpTestUtils';

// const { RequestFactoryWrapper } = httpClient({
//   apiUrl: 'http://localhost:3000',
// });

const http = httpEmitter([
  {
    error: createHttpError(401),
  },
  {
    error: createHttpError(403),
  },
  {
    success: responseEnum.user,
  },
]);
const { RequestFactoryWrapper } = httpClient({
  apiUrl: configMap.c1.apiUrl,
  http,
  globalPlugins: [
    {
      beforeFetch() {},
    },
  ],
});

const request = RequestFactoryWrapper<
  requestType<{ a?: number; b?: number }, EmptyObj, EmptyObj>,
  responseType<any>
>({ id: 1 })
  .reRequest(2)
  .collectData(({ params }) => {
    return {
      url: '/user',
      method: 'GET',
      params,
    };
  });

request({ params: {} })
  .response()
  .then((_res) => {
    //console.log(1, res);
  })
  .catch((_e) => {
    //console.log(1, e);
  });

setTimeout(() => {
  request({ params: { a: 1 } })
    .response()
    .then((_res) => {
      //console.log(2, res);
    })
    .catch((_e) => {
      //console.log(2, e);
    });
}, 0);

//console.log(requestManager);

// request({ params: {} })
//   .response()
//   .then((res) => {
//     //console.log(res);
//   })
//   .catch((err) => {
//     //console.log(err);
//   });

// (async ()=>{
//   const res = await request({ params: {} }).response();
//   //console.log(res);
// })();

// request({ params: { a: 1 } })
//   .response()
//   .then((res) => {
//     //console.log(res);
//   })
//   .catch((err) => {
//     //console.log(err);
//   });
