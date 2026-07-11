import type { PluginOption, ViteDevServer } from 'vite';
import colors from 'picocolors';

/**
 * 
 * Alias
    带有 enforce: 'pre' 的用户插件
    Vite 核心插件
    没有 enforce 值的用户插件
    Vite 构建用的插件
    带有 enforce: 'post' 的用户插件
    Vite 后置构建插件（最小化，manifest，报告）
 */
export default function vitePluginVueMonitor(): PluginOption {
  return {
    name: 'ts-start',
    apply: 'serve', //在開發時候調用

    //vite獨特鉤子
    config(_config, _env) {
      //返回vite的配置,深度合併到vite.config.ts文件中或者直接覆蓋
      console.log('vite配置前調用... config');
    },
    configResolved(_config) {
      console.log('vite配置前調用... configResolved');
    },
    // configureServer(server){
    //     //注意 configureServer 在运行生产版本时不会被调用，所以其他钩子需要防范它缺失。
    //     console.log(`
    //         是用于配置开发服务器的钩子。最常见的用例是在内部 connect 应用程序中添加自定义中间件:
    //         configureServer
    //         `);
    //         server.ws.on('connection', () => {
    //             server.ws.send('my:greetings', { msg: '你好呀' })
    //         })
    //         server.middlewares.use((req,res,next)=>{
    //             console.log("我是前置中間件...");
    //             next();
    //         })
    //         server.middlewares.use((req,res,next)=>{
    //             return ()=>{
    //                 console.log("我是后置中間件...");
    //                 next();
    //             }
    //         })
    // },
    transformIndexHtml(_html, _ctx) {
      console.log(`
                转换 index.html 的专用钩子。钩子接收当前的 HTML 字符串和转换上下文。    
            `);
    },
    handleHotUpdate(_ctx) {
      console.log(`
                执行自定义 HMR 更新处理。钩子接收一个带有以下签名的上下文对象：
            `);
    },

    //通用鉤子
    options() {
      console.log('服務啟動時... options');
    },
    buildStart() {
      console.log('服務啟動時... buildStart');
    },
    resolveId() {
      console.log('傳入模塊時... resolveId');
    },
    load() {
      console.log('傳入模塊時... load');
    },
    transform() {
      console.log('傳入模塊時... transform');
    },
    buildEnd() {
      console.log('服務關閉時... buildEnd');
    },
    closeBundle() {
      console.log('服務關閉時... closeBundle');
    },

    configureServer(server: ViteDevServer) {
      const print = server.printUrls;
      server.printUrls = () => {
        const network = server.resolvedUrls?.network[0];
        const local = server.resolvedUrls?.local[0];
        if (!network && !local) {
          console.log(
            colors.red('获取IP地址失败,请检查vite.config.ts文件中server.host配置是否正确!\n')
          );
        } else {
          console.info(
            colors.green(`
                                  ≧ω≦
                                 | | |
                                  \_/ 
                                (=^･ｪ･^=)
                                九幽玄天

                        `)
          );
          print();
        }
      };
    },
  };
}
