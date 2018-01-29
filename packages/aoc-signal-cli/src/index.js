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
import { logstash } from './logstash';

const d = debug('app:index');

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

d(`role: ${program.role}`);

let use_zx = false;
if(program.zx === 'true' || program.zx === 'True') {
  use_zx = true;
}
d(`use_zx: ${use_zx}`);

const userName = program.role === 'send' ? `${program.room}_s` : `${program.room}_r`;
roomProps.members = [`${program.room}_s`, `${program.room}_r`];
roomProps.name = program.room;

const stats = {
  msgCnt: 0,
  avgDelay: 0,
  connectStats: {
    disconnect: 0,
    offline: 0,
    online: 0,
    schedule: 0,
    retry: 0,
    reconnect: 0,
    reconnecterror: 0,
  }
};
let lastMessageSendTime = 0;

const callbacks = {
  onDisconnect: () => {
    stats.connectStats.disconnect += 1;
    showLog('[disconnect] 服务器连接已断开');
  },
  onOffline: () => {
    stats.connectStats.offline += 1;
    showLog('[offline] 离线（网络连接已断开）');
  },
  onOnline: () => {
    stats.connectStats.online += 1;
    showLog('[online] 已恢复在线');
  },
  onSchedule: (attempt, time) => {
    stats.connectStats.schedule += 1;
    showLog(`[schedule] ${time / 1000}s 后进行第 ${attempt + 1} 次重连`);
  },
  onRetry: (attempt) => {
    stats.connectStats.retry += 1;
    showLog(`[retry] 正在进行第 ${attempt + 1} 次重连`);
  },
  onReconnect: () => {
    stats.connectStats.reconnect += 1;
    showLog('[reconnect] 重连成功');
  },
  onReconnecterror: () => {
    stats.connectStats.reconnecterror += 1;
    showLog('[reconnecterror] 重连失败');
  },
};

d('benchmark start');
if(use_zx) {
  process.env.SERVER = 'wss://rtm-global-in.leancloud.cn';
}
const signalService = new SignalService(leancloudConfig);

const onMessage = (message) => {
  showMsg(message);
};

const onReceipt = ({message}) => {
  d(`onReceipt ${message.text}, onDeliveredAt - onTimestamp = ${message.deliveredAt - message.timestamp}`);
};

const onDelivered = () => {
  d(`onDelivered`);
  signalService.conversation.fetchReceiptTimestamps()
    .then((conversation) => {
      if(lastMessageSendTime > 0) {
        const delay = (conversation.lastDeliveredAt.getTime() - lastMessageSendTime) / 2;
        d(`deliver delay=${delay}`);
        addSample('deliver', delay);
        lastMessageSendTime = 0;
      }
    });
};

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
          sendMsgOnInterval(signalService, 2000, program.count);
        }
      })
      .catch((err) => {
        d(`joinRoom error: ${err.toString()}`);
      });
  });

if(program.role === 'recv' && program.mode === 'single') {
  const waitSecondsToExit = parseInt(program.duration - 5, 10);
  d(`wait ${waitSecondsToExit} seconds to exit.`);
  setTimeout(() => {
    collectReport({
      login: eventCost(stats, 'login'),
      joinRoom: eventCost(stats, 'joinRoom'),
      connectStats: stats.connectStats,
    });
  }, waitSecondsToExit * 1000); // 持续一段时间后发送报告看是否会断线,时间由program.duration控制
}

const sendMsgOnInterval = (target, interval, totalTimes) => {
  let times = 0;
  const timer = setInterval(() => {
    if(times < totalTimes) {
      times++;
      const begin = Date.now();
      target.sendMsg(`msg ${times}`)
        .then((message) => {
          lastMessageSendTime = message.timestamp;
          const delay = (Date.now() - begin) / 2;
          d(`send ${times} message, delay=${delay}`);
          addSample('send', delay);
        });
    } else {
      clearInterval(timer);

      // 等待5秒后收集日志,保证已经收到receipt
      setTimeout(() => {
        const a2sCost = parseInt(getSample('send').avg.toFixed(0), 10);
        const s2bCost = getSample('deliver') ? parseInt(getSample('deliver').avg.toFixed(0), 10) : 0;
        collectReport({
          login: eventCost(stats, 'login'),
          joinRoom: eventCost(stats, 'joinRoom'),
          sendCostAvg: a2sCost,
          deliverCostAvg: s2bCost,
          netDelay: a2sCost + s2bCost,
          msgCount: parseInt(program.count, 10),
        });
      }, 5000);
    }

  }, interval);
};

const collectReport = (info) => {
  const log = {
    category: 'im_benchmark',
    formatVersion: 6,
    ...info,
    env: program.env,
    role: program.role,
    location: program.location,
    mode: program.mode,
    zx: use_zx,
  };
  d(`logstash: ${JSON.stringify(log, null, 2)}`);
  logstash([log])
    .then((response) => {
      if (response.status < 200 || response.status >= 300) {
        d(`http [${response.status}]`);
        throw new Error("Bad response from server");
      }
      return response.json();
    })
    .then(() => {
      d('benchmark complete.');
      process.exit(0);
    })
    .catch((err) => {
      d(`benchmark err: ${err}`);
    });
};




