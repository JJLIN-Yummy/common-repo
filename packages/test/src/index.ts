import { type EmptyObj, httpClient, type requestType, type responseType } from '@common/request';

const { RequestFactoryWrapper } = httpClient({
  apiUrl: 'http://127.0.0.1:3000/api',
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

request()
  .response()
  .then((res) => {
    console.log(res);
  });
