export const responseEnum = {
  user: {
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    data: {
      code: 200,
      data: [
        { id: 1, name: '盈盈' },
        { id: 2, name: '林俊杰' },
      ],
      message: 'success',
    },
  },
  user_1: {
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    data: {
      code: 200,
      data: [{ id: 1, name: '盈盈' }],
      message: 'success',
    },
  },
  error_401: {
    response: {
      status: 401,
    },
  },
  error_403: {
    response: {
      status: 403,
    },
  },
  error_404: {
    response: {
      status: 404,
    },
  },
  error_500: {
    response: {
      status: 500,
    },
  },
};
