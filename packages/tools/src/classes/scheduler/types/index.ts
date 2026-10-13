export type onCancel = {
  onCancel: (e: Error) => any;
};

export type onTimeout = {
  onTimeout: (e: Error) => any;
};

export type onSuccess<T> = {
  onSuccess: (v: T) => any;
};

export type onError = {
  onError: (e: Error) => any;
};

export type priority = {
  priority: number;
};
