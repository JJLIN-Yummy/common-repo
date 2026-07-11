import express from 'express';
const app = express();

// 统一跨域中间件：所有请求都会执行，放在最顶部
const allowOrigins = ['http://localhost:5174', 'http://127.0.0.1:5174'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowOrigins.includes(origin)) {
    // 只能设置单个域名，不能数组
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // 处理OPTIONS预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,token');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }

  next();
});

// 业务接口不用再手动写跨域头
app.get('/user', (req, res) => {
  const t = new Date().getTime();
  while (new Date().getTime() - t < 1000) {}
  res.status(500);
  return res.send({ code: 500, data: 'ok', message: 'ok' });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
