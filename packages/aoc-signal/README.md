Javascript signal sdk for [AOC](https://git.saybot.net/kejian/aoc-desktop), this library is based on [js-realtime-sdk](https://github.com/leancloud/js-realtime-sdk).

## Dependencies
* [leancloud-realtime](https://github.com/leancloud/js-realtime-sdk)

## Installation
```shell
npm install --save aoc-signal
```

## Usage
```javascript
var signalService = new SignalService({
    appId: 'xxxxxx',
    appKey: 'xxxxxx'
});

const callbacks = {
    onDisconnect: () => {
        console.log('[disconnect] 服务器连接已断开');
    },
    onReconnect: () => {
        console.log('[reconnect] 重连成功');
    },
    onReconnecterror: () => {
        console.log('[reconnecterror] 重连失败');
    }
};

const testRoom = {
    name: 'testroom',
    members: ['Tom', 'Jerry']
};

const roomCallbacks = {
    onSignal: (signal) => {

    }
};
signalService.login('Tom', callbacks)
  .then(servie => {
      return service.joinRoom(testRoom, roomCallbacks);
  })    
  .then(room => {
      return room.broadcastMsg('hello');
  })
  .then(signal => {
      console.log(`send message success`);
  })
```

## Documentation
> This project use [typedoc](https://github.com/TypeStrong/typedoc) to auto generate API document.

> visit [API document](http://soc-signal-api.sdclient.saybot.net/)




