/**
 * Created by byrne on 19/01/2018.
 */
import { Realtime
  , TextMessage
  , IMClient
  , Conversation
  , Message, 
  ConversationBase
} from 'leancloud-realtime'
import SignalConfig from './SignalConfig'
import ISignature from './ISignature'
import Room from './Room'
import ChatSignal from './ChatSignal'

const debug = require('debug')
const dbg = debug('signal:SignalService')

export default class SignalService {

  protected _client: IMClient

  protected _service: Realtime

  protected _room: Room

  /**
   * 创建信令服务实例
   * @param SignalConfig cfg 服务配置
   */
  constructor(cfg: SignalConfig) {
    if (process.env.SERVER !== undefined) {
      cfg.RTMServers = process.env.SERVER
    }

    this._service = new Realtime(cfg)
    dbg(`Leancloud AppId: ${cfg.appId}`)
    dbg(`Leancloud AppKey: ${cfg.appKey}`)
    dbg(`RTMServers: '${cfg.RTMServers}'`)
  }

  /**
   * 登录信令服务
   * @param {String} clientId 用户unique id, 由外部系统产生并保证唯一性
   * @param {Object} callbacks 注册回调函数
   * @returns {Promise.<TResult>}
   */
  login(
    clientId: string, 
    callbacks: {
      onDisconnect?: () => void,
      onOffline?: () => void,
      onOnline?: () => void,
      onSchedule?: (attempt: number, delay: number) => void,
      onRetry?: (attempt: number) => void,
      onReconnect?: () => void,
      onReconnecterror?: () => void,
    },    
    signature?: ISignature, 
    channelSignature?: ISignature
  ) {
    const factory = signature && channelSignature ? {
      signatureFactory: (cid: string) => Promise.resolve(signature),
      conversationSignatureFactory: (cid: string) => Promise.resolve(channelSignature)
    } : null
    
    return this._service.createIMClient(clientId, factory)
      .then((c) => {
        this._client = c
        const {
          onDisconnect,
          onOffline,
          onOnline,
          onSchedule,
          onRetry,
          onReconnect,
          onReconnecterror,
        } = callbacks
        dbg(`create client success`)
        this._client.on('disconnect', function() {
          dbg('[disconnect] 服务器连接已断开')
          if (onDisconnect) onDisconnect()
        })
        this._client.on('offline', function() {
          dbg('[offline] 离线（网络连接已断开）')
          if (onOffline) onOffline()
        })
        this._client.on('online', function() {
          dbg('[online] 已恢复在线')
          if (onOnline) onOnline()
        })
        this._client.on('schedule', function(attempt: number, time: number) {
          dbg(`[schedule] ${time / 1000}s 后进行第 ${attempt + 1} 次重连`)
          if (onSchedule) onSchedule(attempt, time)
        })
        this._client.on('retry', function(attempt: number) {
          dbg(`[retry] 正在进行第 ${attempt + 1} 次重连`)
          if (onRetry) onRetry(attempt)
        })
        this._client.on('reconnect', function() {
          dbg('[reconnect] 重连成功')
          if (onReconnect) onReconnect()
        })
        this._client.on('reconnecterror', function() {
          dbg('[reconnecterror] 重连失败')
          if (onReconnecterror) onReconnecterror()
        })
        // this._client.on('message', function(message: Message, conversation: Conversation) {
        //   debug(`Message received: '${message.toFullJSON()}' from ${conversation.name}`)
        //   if (onMessage) onMessage(message, conversation)
        // })
      })
  }

  /**
   * 加入信令房间
   * @param {object | string} room 房间信息
   * @param {object} callbacks 注册回调函数
   * @return {Promise<Room>}
   */
  joinRoom(
    room: {
      // room name
      name: string, 
      // 创建暂态的聊天室（暂态类似聊天室,无人员上线,不能查询成员列表,没有成员加入离开通知,不支持邀请踢出）
      transient: boolean,
      // 唯一对话，当其为 true 时，如果当前已经有相同成员的对话存在则返回该对话，否则会创建新的对话
      unique: boolean,
    } | string,       
    callbacks: {
      onMessage?: Function,
      onReceipt?: Function,
      onDelivered?: Function,
      onMessageHistory?: Function,
  }): Promise<Room> {
    if (!this._client) {
      Promise.reject('err_not_login')
    }

    let ret: Promise<Conversation> = null
    if (typeof room === 'string') {
      ret = this._client.getConversation(<string> room)
        .then(function(conversation: Conversation) {
          if (conversation) {
            return conversation
          } else {
            Promise.reject('err_room_not_found')
          }
        })
    } else {
      ret = this._client.createConversation(<any> room)
        .then(function(conversation: Conversation) {
          return conversation
        })
    }
    return ret.then(conversation => {
        dbg(`Room Info: ${JSON.stringify(conversation, null, 2)}`)
        this._room = new Room(conversation)
        return conversation.join()
      })
      .then((conversation: Conversation) => {
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

        if (callbacks.onMessage) {
          conversation.on('message', (message) => {
            callbacks.onMessage(message)
          })
        }
        if (callbacks.onReceipt) {
          conversation.on('receipt', (message) => {
            callbacks.onReceipt(message)
          })
        }
        if (callbacks.onDelivered) {
          conversation.on('lastdeliveredatupdate', () => {
            callbacks.onDelivered()
          })
        }
        if (callbacks.onMessageHistory) {
          const msgIter = conversation.createMessagesIterator({})
          msgIter.next().then((result) => {
            callbacks.onMessageHistory(result.value)
          }).catch(err => {
            throw err
          })
        }
        return new Room(conversation)
      })
  }

  isLoggedIn() {
    return this._client && this._room
  }

  get room() {
    return this._room
  }
}
