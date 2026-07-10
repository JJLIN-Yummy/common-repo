export type responseType<v = any> = {
  IsSuccess: boolean;
  Value: v;
  Message: string;
};

export type responseErrorType = {
  IsSuccess: false;
  Value: null;
  Message: string;
};

export type requestType<
  P = Record<string, any>,
  Q = Record<string, any>,
  D = Record<string, any>,
> = {
  params: P;
  query: Q;
  data: D;
};

type a = requestType<{ name: number }, { name: number }, { name: number }>;

export type promiseThenDataType<D> = {
  data: D;
  error: null;
};
export type promiseCatchDataType = {
  data: null;
  error: Error | responseErrorType;
};
