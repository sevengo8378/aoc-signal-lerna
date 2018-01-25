/**
 * Created by byrne on 19/01/2018.
 */

import packageJson from '../package.json';
import debug from 'debug';
import program from 'commander';

import {formatTime, encodeHTML, messageDelay} from './utils';
// import { TextMessage } from 'leancloud-realtime';
import roomProps from './roomProps';
import { SignalService } from 'aoc-signal';
import leancloudConfig from './leancloud_config';
import { eventBegin, eventEnd, eventCost, addSample, getSample } from './utils/time_stats';

const d = debug('app:index');

program
  .version(packageJson.version)
  .option('-r --role <role>', 'Specify if message sender or receiver', /^(send|recv)$/i, 'send')
  .option('-e --env <env>', 'Specify environment', /^(dev|prod)$/i, 'dev')
  .option('-u --uname <uname>', 'Specify user name', 'Guest1')
  .option('-l --location <location>', 'Specify user location', 'china')
  .parse(process.argv);

d(`role: ${program.role}`);

const userName = program.uname;
const stats = {
  msgCnt: 0,
  avgDelay: 0,
};
let lastMessageSendTime = 0;

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
    showLog(`[schedule] ${time / 1000}s 后进行第 ${attempt + 1} 次重连`);
  },
  onRetry: (attempt) => {
    showLog(`[retry] 正在进行第 ${attempt + 1} 次重连`);
  },
  onReconnect: () => {
    showLog('[reconnect] 重连成功');
  },
  onReconnecterror: () => {
    showLog('[reconnecterror] 重连失败');
  },
};

d('benchmark start');
const signalService = new SignalService(leancloudConfig);

const onMessage = (message) => {
  showMsg(message);
};

const onReceipt = ({message}) => {
  d(`onReceipt ${message.text}, onDeliveredAt - onTimestamp = ${message.deliveredAt - message.timestamp}`);
};

const onDelivered = () => {
  signalService.conversation.fetchReceiptTimestamps()
    .then((conversation) => {
      if(lastMessageSendTime > 0) {
        const delay = (conversation.lastDeliveredAt.getTime() - lastMessageSendTime) / 2;
        addSample('deliver', delay);
        d(`onDelivered delay=${delay}`);
        lastMessageSendTime = 0;
      }
    });
}

const showMsg = (message, isBefore) => {
  let from = message.from;

  if(message.from === userName) {
    from = '自己';
  }

  const delay = messageDelay(message);
  const avgDelay = (stats.avgDelay * stats.msgCnt + delay) / (stats.msgCnt + 1);
  stats.msgCnt = stats.msgCnt + 1;
  stats.avgDelay = avgDelay;
  showLog(`(${formatTime(Date.now())}) ${delay}ms ${encodeHTML(from)}:`, `${encodeHTML(message.text)}`, isBefore);
  d(`Message Received Count: ${stats.msgCnt}, Delay:${delay}, Average Delay: ${stats.avgDelay.toFixed(0)}ms`);
};

const showLog = (msg, data) => {
  d(`${msg} ${data}`);
};

eventBegin(stats, 'login');
signalService.login(userName, callbacks)
  .then(() => {
    eventEnd(stats, 'login');
    d(`${userName} 创建IM client成功, role=${program.role}`);
    d(`${userName} 加入房间 ${roomProps.name}...`);
    const callbacks = {
      onMessage: onMessage,
      // onMessageHistory: onMessageHistory,
      onReceipt: onReceipt,
      onDelivered: onDelivered,
    };
    eventBegin(stats, 'joinRoom');
    signalService.joinRoom(roomProps, callbacks)
      .then((conversation) => {
        eventEnd(stats, 'joinRoom');
        d(`${userName} 加入房间 ${roomProps.name} 成功, 当前房间人数${conversation.members.length}, 可以开始聊天`);
        if(program.role === 'send') {
          sendMsgOnInterval(signalService, 2000, 10);
        }
      });
  });

const sendMsgOnInterval = (target, interval, totalTimes) => {
  let times = 0;
  const timer = setInterval(() => {
    if(times < totalTimes) {
      times++;
      const begin = Date.now();
      target.sendMsg(`msg ${times}`)
        .then((message) => {
          lastMessageSendTime = message.timestamp;
          const delay = (Date.now() - begin)/2;
          d(`send ${times} message, delay=${delay}`);
          addSample('send', delay);
        });
    } else {
      clearInterval(timer);

      // 等待5秒后收集日志,保证已经收到receipt
      setTimeout(() => {
        const a2sCost = getSample('send').avg.toFixed(0);
        const s2bCost = getSample('deliver').avg.toFixed(0);
        logstash({
          login: eventCost(stats, 'login'),
          joinRoom: eventCost(stats, 'joinRoom'),
          sendCostAvg: a2sCost,
          deliverCostAvg: s2bCost,
          netDelay: parseInt(a2sCost, 10) + parseInt(s2bCost, 10),
        });
      }, 5000);
    }

  }, interval);
};

const logstash = (info) => {
  const log = {
    ...info,
    env: program.env,
    role: program.role,
    location: program.location,
  };
  d(`logstash: ${JSON.stringify(log, null, 2)}`);
};




