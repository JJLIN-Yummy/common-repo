export function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // 现代浏览器和 Node.js 14.17+ 内置方法
    return crypto.randomUUID();
  }

  // 兼容旧环境
  let uuid = '';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // 版本号设置为 4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // 变体设置为 RFC4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  bytes.forEach((byte, i) => {
    if (i === 4 || i === 6 || i === 8 || i === 10) {
      uuid += '-';
    }
    uuid += byte.toString(16).padStart(2, '0');
  });

  return uuid;
}
