/**
 * Created by byrne on 19/01/2018.
 */
import { Realtime, TextMessage } from 'leancloud-realtime';
import d from 'debug';

const debug = d('signal:SignalService');

export default class SignalService {
  /**
   * 创建信令服务实例
   * @param {Object} cfg 服务配置
   * @param {String} cfg.appId 应用ID
   * @param {String} cfg.appKey 应用key
   * @param {String} [cfg.region='cn'] 节点id
   * @param {String} [cfg.RTMServers] 指定私有部署的 RTM 服务器地址
   * @param {Plugin[]} [cfg.plugins] 加载插件
   */
  constructor(cfg) {
    const _cfg = {
      appId: cfg.appId,
      appKey: cfg.appKey,
      region: cfg.region || 'cn',
    };
    if(process.env.SERVER !== undefined) {
      _cfg.RTMServers = process.env.SERVER;
    }
    this.service = new Realtime(_cfg);
    debug(`Leancloud AppId: ${_cfg.appId}`);
    debug(`Leancloud AppKey: ${_cfg.appKey}`);
    debug(`RTMServers: '${_cfg.RTMServers}'`);
    this.client = null;
    this._conversation = null;
    this.msgIter = null;
  }

  /**
   * 登录信令服务
   * @param {String} clientId 用户unique id, 由外部系统产生并保证唯一性
   * @param {Object} callbacks 注册回调函数
   * @returns {Promise.<TResult>}
     */
  login(clientId, callbacks) {
    // todo: leancloud4.0的api才有logIn的过程
    // return User.logIn(clientId, password).then((user) => {
    //   return this.service.createIMClient(user);
    // })
    return this.service.createIMClient(clientId)
      .then((c) => {
        this.client = c;
        const {
          onDisconnect,
          onOffline,
          onOnline,
          onSchedule,
          onRetry,
          onReconnect,
          onReconnecterror,
          onMessage
        } = callbacks;
        debug(`create client success`);
        this.client.on('disconnect', function() {
          debug('[disconnect] 服务器连接已断开');
          if(onDisconnect) onDisconnect();
        });
        this.client.on('offline', function() {
          debug('[offline] 离线（网络连接已断开）');
          if(onOffline) onOffline();
        });
        this.client.on('online', function() {
          debug('[online] 已恢复在线');
          if(onOnline) onOnline();
        });
        this.client.on('schedule', function(attempt, time) {
          debug(`[schedule] ${time / 1000}s 后进行第 ${attempt + 1} 次重连`);
          if(onSchedule) onSchedule(attempt, time);
        });
        this.client.on('retry', function(attempt) {
          debug(`[retry] 正在进行第 ${attempt + 1} 次重连`);
          if(onRetry) onRetry(attempt);
        });
        this.client.on('reconnect', function() {
          debug('[reconnect] 重连成功');
          if(onReconnect) onReconnect();
        });
        this.client.on('reconnecterror', function() {
          debug('[reconnecterror] 重连失败');
          if(onReconnecterror) onReconnecterror();
        });
        this.client.on('message', function(message, conversation) {
          debug(`Message received: '${message.text}' from ${conversation.name}`);
          if(onMessage) onMessage(message, conversation);
        });
        return this.client;
      });
  }

  joinRoom(roomProps, callbacks) {
    if(!this.client) {
      return Promise.reject('err_not_login');
    }
    const {
      id, ...restRoomProps
    } = roomProps;
    return this.client.getConversation(id)
      .then((conversation) => {
        if (conversation) {
          return conversation;
        } else {
          debug(`不存在这个room ${id}，创建一个`);
          return this.client.createConversation(restRoomProps)
            .then(function(conversation) {
              debug('创建新 Room 成功，id 是：', conversation.id);
              return conversation;
            });
        }
      })
      .then(conversation => {
        this._conversation = conversation;
        this.msgIter = conversation.createMessagesIterator();
        return conversation.join();
      })
      .then(conversation => {
        /* 还有以下事件
         kicked,
         membersjoined,
         membersleft,
         message,
         receipt,
         lastdeliveredatupdate,
         lastreadupdate,
         messagerecall,
         messageupdate,
         */

        if(callbacks.onMessage) {
          conversation.on('message', (message) => {
            callbacks.onMessage(message);
          });
        }
        if(callbacks.onReceipt) {
          conversation.on('receipt', (message) => {
            callbacks.onReceipt(message);
          });
        }
        if(callbacks.onDelivered) {
          conversation.on('lastdeliveredatupdate', () => {
            callbacks.onDelivered();
          });
        }
        if(callbacks.onMessageHistory && this.msgIter) {
          this.msgIter.next().then((result) => {
            callbacks.onMessageHistory(result.value);
          }).catch(err => {
            console.error(err);
          });
        }
        return conversation;
      });
  }

  sendMsg(msg) {
    if(!this.client) {
      return Promise.reject('err_not_login');
    }
    if(!this._conversation) {
      return Promise.reject('err_not_join');
    }
    const clientSendAt = Date.now();
    return this._conversation.send(new TextMessage(msg), {
      receipt: true,
      transient: false,
    })
      .then((message) => {
        message.sendDelay = Date.now() - clientSendAt;
        return message;
      });
  }

  isLoggedIn() {
    return this.client && this._conversation;
  }

  get conversation() {
    return this._conversation;
  }
}
