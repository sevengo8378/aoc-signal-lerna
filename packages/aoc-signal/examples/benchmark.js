/**
 * Created by byrne on 10/01/2018.
 */
import {formatTime, encodeHTML, messageDelay} from './src/utils';
import { TextMessage } from 'leancloud-realtime';
import roomProps from './src/roomProps';
import { SignalService } from 'aoc-signal';
import leancloudConfig from './src/leancloud/leancloud_config';

const userName = 'Guest2';

const stats = {
  msgCnt: 0,
  avgDelay: 0
}

const callbacks = {
  onDisconnect: () => {
    showLog('[disconnect] 服务器连接已断开');
  },
  onOffline: () => {
    showLog('[offline] 离线（网络连接已断开）');
  },
  onOnline: () => {
    showLog('[online] 已恢复在线');
  },
  onSchedule: (attempt, time) => {
    showLog('[schedule] ' + time / 1000 + 's 后进行第 ' + (attempt + 1) + ' 次重连');
  },
  onRetry: (attempt) => {
    showLog('[retry] 正在进行第 ' + (attempt + 1) + ' 次重连');
  },
  onReconnect: () => {
    showLog('[reconnect] 重连成功');
  },
  onReconnecterror: () => {
    showLog('[reconnecterror] 重连失败');
  },
}

const onMessage = (message) => {
  showMsg(message);
};

const onReceipt = ({message}) => {
  console.log(`onReceipt ${message.text}, onDeliveredAt - onTimestamp = ${message.deliveredAt - message.timestamp}`);
}

const onDelivered = (obj) => {
  console.log(`onDelivered ${obj}`);
}

const onMessageHistory = (history) => {
  const msgCnt = history.length;
  for(let i=msgCnt-1; i>=0; i--) {
    showMsg(history[i], true);
  }
};

const showMsg = (message, isBefore) => {
  let from = message.from;

  if(message.from === userName) {
    from = '自己';
  }

  if(message instanceof TextMessage) {
    const delay = messageDelay(message);
    const avgDelay = (stats.avgDelay * stats.msgCnt + delay) / (stats.msgCnt + 1);
    stats.msgCnt = stats.msgCnt + 1;
    stats.avgDelay = avgDelay;
    showLog(`(${formatTime(Date.now())}) ${delay}ms ${encodeHTML(from)}:`, `${encodeHTML(message.text)}`, isBefore);
    console.log(`Message Received Count: ${stats.msgCnt}, Delay:${delay}, Average Delay: ${stats.avgDelay.toFixed(0)}ms`);
  } else {
    console.warn(`unsupported message type`);
  }
}

const showLog = (msg, data, isBefore) => {
  console.log(`${msg} ${data}`);
};

console.log('leancloud test start');
let signalService = new SignalService(leancloudConfig);
signalService.login(userName, callbacks)
  .then(client => {
    console.log(`${userName} 登录成功`);
    console.log(`${userName} 加入房间 ${roomProps.name}...`);
    const callbacks = {
      onMessage: onMessage,
      // onMessageHistory: onMessageHistory,
      onReceipt: onReceipt,
      onDelivered: onDelivered,
    };
    signalService.joinRoom(roomProps, callbacks)
      .then((conversation) => {
        console.log(`${userName} 加入房间 ${roomProps.name} 成功, 当前房间人数${conversation.members.length}, 可以开始聊天`);
        // signalService.sendMsg('test message')
        //   .then(message => {
        //     console.log(`(${formatTime(message.timestamp)}) 自己:`, `${encodeHTML(message.text)}`);
        //   });
      });
  });
