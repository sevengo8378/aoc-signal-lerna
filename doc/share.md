## leancloud
[主页](https://leancloud.cn/) - 领先的 BaaS 提供商，为移动开发提供强有力的后端支持

* 实时通信
* 云引擎
* 云缓存(python，nodejs)
* 消息推送
* 数据统计

实时通信SDK支持以下类型
* Javascript
* Objective-C
* Android
* Unity
* .NET

javascript sdk使用例子:
```shell
$ npm install leancloud-realtime@next --save
```

```javascript
import { Realtime
  , TextMessage
  , IMClient
  , Conversation
  , Message
} from 'leancloud-realtime'

// 初始化实时通讯 SDK
var realtime = new Realtime({
  appId: 'Ywrrru86RayYkdMTzGRtQpoo-gzGzoHsz',
  appKey: '7ae07vEY6KYPxa4DVG9oL6Sh',
  plugins: [TypedMessagesPlugin], // 注册富媒体消息插件
});

// Tom 用自己的名字作为 clientId，获取 IMClient 对象实例
realtime.createIMClient('Tom').then(function(tom) {
  // 创建与Jerry之间的对话
  return tom.createConversation({
    members: ['Jerry'],
    name: 'Tom & Jerry',
  });
}).then(function(conversation) {
  // 发送消息
  return conversation.send(new TextMessage('耗子，起床！'));
}).then(function(message) {
  console.log('Tom & Jerry', '发送成功！');
}).catch(console.error);
```

注意:

1. 有中国和北美两个数据中心，相互之间数据不互通
2. 支持通过masterKey对操作签名，用户登录、对话创建假如踢出等都需要验证签名
3. 支持自定义消息
4. 支持以插件形式扩展功能

我们要做的事：

1. 测试leancloud连通性和消息延时性能，对比使用和不使用专线的效果
2. 封装sdk api，提供简易api供业务使用

---
## build cli tool with nodejs to do benchmark

### packaging shell commands
* 入口脚本增加[shebang](https://en.wikipedia.org/wiki/Shebang_(Unix))
```javascript
#!/usr/bin/env
```

* `package.json`增加`bin`字段
```javascript
...
  "author": "Tim Pettersen",
  "license": "Apache-2.0",
+ "bin": {
+   "benchmark-leancloud": "./bin/index.js"
+ }
}
```

* 本地调试阶段使用`npm link`

方法一
```shell
$ cd path/to/my-project
$ npm link path/to/my/package #直接从package创建一个软链到当前目录node_modules
```
方法二
```shell
$ cd path/to/my/package
$ npm link #在全局创建一个软链
$ cd path/to/my-project
$ npm link package-name #把全局安装的package链到当前目录的node_modules
```

> 1.通过`npm unlink package-name`取消链接

> 2.修改后需要重新build但不需要重新link

* 通过`npm publish`进行发布

### parse cli arguments 
* commander
```javascript
import program from 'commander';

program
  .version(packageJson.version)
  .option('-r --role <role>', 'Specify if message sender or receiver', /^(send|recv)$/i, 'send')
  .option('-e --env <env>', 'Specify environment', /^(dev|prod)$/i, 'dev')
  // .option('-u --uname <uname>', 'Specify user name', 'Guest1')
  .option('-r --room <room>', 'Specify room name', 'testroom')
  .option('-l --location <location>', 'Specify user location', 'china')
  .option('-c --count <count>', 'Specify message count to send', '10')
  .option('-m --mode <mode>', 'Specify test mode', /^(multi|single)/i, 'multi')
  .option('-d --duration <duration>', 'Specify process duration in seconds, only works in single mode', 3600)
  .option('-z --zx <zx>', 'User zhuanxian', false)
  .parse(process.argv);

console.log(`role: ${program.role}`);
```

---
## quickly benchmark with ansible
* ansible
* vagrant
* [性能测试报告](./benchmark_report.md)

---
## 使用typescript
* typescript引入
* .d.ts文件
* tsdoc

## 参考文献
* [模块调试技巧 - npm link](https://github.com/atian25/blog/issues/17)
* [Building command line tools with Node.js](https://developer.atlassian.com/blog/2015/11/scripting-with-node/)
  - Prompting for user input
  - Coloring terminal output
  - Adding a progress bar