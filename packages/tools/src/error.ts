export function throwTypeError<V>(name: string, value: V, message?: string): Error {
  return new TypeError(
    `TypeError：参数 ${name} 类型错误，错误得到 ${typeof value} (值: ${String(value)})
            ${message}
        `
  );
}

export function throwError(message?: string) {
  return new Error(`${message}`);
}
