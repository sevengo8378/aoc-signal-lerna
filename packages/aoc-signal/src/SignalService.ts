/**
 * Created by byrne on 19/01/2018.
 */
import { Realtime
  , TextMessage
  , IMClient
  , Conversation
  , Message, 
  ConversationBase,
  messageType,
  messageField,
  AVMessage
} from 'leancloud-realtime'
import ISignature from './ISignature'
import { Room, IRoom } from './Room'
import { ChatSignal, IChatSignal } from './ChatSignal'
import { CmdSignal, ICmdSignal } from './CmdSignal'
import ISignal from './ISignal'

const debug = require('debug')
const dbg = debug('signal:SignalService')

/**
 * 此类提供信令服务，使用时请先实例化
 */
export default class SignalService {

  protected _client: IMClient

  protected _service: Realtime

  protected _room: Room

  /**
   * 创建信令服务实例
   * @param cfg 信令服务配置参数
   * @param cfg.appId leancloud app id
   * @param cfg.appKey leancloud app key
   * @param cfg.region leancloud服务节点,默认cn
   * @param cfg.RTMServers leancloud提供的专线服务
   */
  constructor(cfg: {
    appId: string,
    appKey: string,
    region?: string,
    RTMServers?: string,
}) {
    cfg.region = cfg.region || 'cn'
    if (process.env.SERVER !== undefined) {
      cfg.RTMServers = process.env.SERVER
    }

    this._service = new Realtime(cfg)
    dbg(`AppId: ${cfg.appId}`)
    dbg(`AppKey: ${cfg.appKey}`)
    if (cfg.RTMServers) {
      dbg(`use specific RTMServers: '${cfg.RTMServers}'`)
    }

    // register ChatSigal & CmdSignal as customize Message
    messageType(1)(ChatSignal)
    messageType(2)(CmdSignal)
    messageField(['cmdId'])(CmdSignal)

    // @ts-ignore
    this._service.register([ChatSignal as AVMessage, CmdSignal as AVMessage])
  }

  /**
   * 登录信令客户端
   * @param clientId 用户clientId, 由外部系统产生并保证唯一性
   * @param callbacks 注册回调函数
   * @param callbacks.onDisconnect 客户端连接断开
   * @param callbacks.onSchedule 计划在一段时间后尝试重新连接
   * @param callbacks.onRetry 正在尝试重新连接
   * @param callbacks.onReconnect 客户端重连成功
   * @param callbacks.onReconnecterror 客户端重连发生错误
   * @param signature 登录安全签名
   * @param roomSignature 房间安全签名
   * 
   * > 注意在生产环境请同时提供signature和roomSignature，更多细节请参考[这里](https://leancloud.cn/docs/realtime_guide-js.html#hash-297306722)
   */
  login(
    clientId: string, 
    callbacks: {
      onDisconnect?: () => void,
      // onOffline?: () => void,
      // onOnline?: () => void,
      onSchedule?: (attempt: number, delay: number) => void,
      onRetry?: (attempt: number) => void,
      onReconnect?: () => void,
      onReconnecterror?: () => void,
    },    
    signature?: ISignature, 
    roomSignature?: ISignature
  ): Promise<void> {
    const factory = signature && roomSignature ? {
      signatureFactory: (cid: string) => Promise.resolve(signature),
      conversationSignatureFactory: (cid: string) => Promise.resolve(roomSignature)
    } : null
    
    return this._service.createIMClient(clientId, factory)
      .then((c) => {
        this._client = c
        const {
          onDisconnect,
          // onOffline,
          // onOnline,
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
        // this._client.on('offline', function() {
        //   dbg('[offline] 离线（网络连接已断开）')
        //   if (onOffline) onOffline()
        // })
        // this._client.on('online', function() {
        //   dbg('[online] 已恢复在线')
        //   if (onOnline) onOnline()
        // })
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
      })
  }

  /** 
   * 登出并关闭信令客户端 
   */
  logout(): Promise<void> {
    if (!this.isLoggedIn) {
      return Promise.reject(`err_not_login`)
    }

    const afterClose = () => {
      this._client = null
    }
    if (this._room) {
      return this.leaveRoom().then(() => {
        this._client.close().then(afterClose)
      })
    } else {
      return this._client.close().then(afterClose)
    }
  }

  /**
   * 加入信令房间
   * @param room 房间信息, 有两种方式可以进入房间, 一种直接提供房间id，另一种根据members信息直接创建
   * @param room.name 房间显示给用户的名字
   * @param room.members 房间成员列表
   * @param room.transient 暂态的聊天室（暂态类似聊天室,无人员上线,不能查询成员列表,没有成员加入离开通知,不支持邀请踢出）
   * @param room.unique 是否唯一对话，当其为 true 时，如果当前已经有相同成员的房间则直接返回该对话不再创建新的
   * @param callbacks 注册房间内回调函数
   * @param callbacks.onMessage 接收到信令
   * @param callbacks.onDelivered 有信令送达
   * @param callbacks.onMembersJoined 有成员进入房间
   * @param callbacks.onMembersLeft 有成员离开房间
   * 
   * 更多关于leancloud成员进入和离开的回调逻辑请看[这里](https://leancloud.cn/docs/realtime_guide-js.html#hash859892493)
   */
  joinRoom(
    room: {
      name: string, 
      members?: string[],
      transient: boolean,
      unique: boolean,
    } | string,       
    callbacks: {
      onMessage?: (signal: ISignal) => void,
      // onReceipt?: Function,
      onDelivered?: () => void,
      onMembersJoined?: (payload: {members: string[], invitedBy: string}) => void
      onMembersLeft?: (payload: {members: string[], kickedBy: string}) => void
  }): Promise<IRoom> {
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
        return this._room.join()
      })
      .then((conversation: Conversation) => {
        /* 还有以下事件可以实现
        infoupdated,
        invited,
        kicked,
        lastdeliveredatupdate,
        lastreadatupdate,
        memberinfoupdated,
        
        blocked,
        unblocked,
        membersblocked,
        membersunblocked,

        muted,
        unmuted,
        membersmuted,
        membersunmuted,

        messagerecall,
        messageupdate,
        */

        if (callbacks.onMessage) {
          conversation.on('message', (message) => {
            dbg(`onMessage: ${message.constructor.name}`)
            callbacks.onMessage(message as ISignal)
          })
        }
        // if (callbacks.onReceipt) {
        //   conversation.on('receipt', (message) => {
        //     callbacks.onReceipt(message)
        //   })
        // }
        if (callbacks.onDelivered) {
          conversation.on('lastdeliveredatupdate', () => {
            callbacks.onDelivered()
          })
        }

        if (callbacks.onMembersJoined) {
          conversation.on('membersjoined', (payload: {members: string[], invitedBy: string}) => {
            callbacks.onMembersJoined(payload)
          })
        }

        if (callbacks.onMembersLeft) {
          conversation.on('membersleft', (payload: {members: string[], kickedBy: string}) => {
            callbacks.onMembersLeft(payload)
          })
        }

        return new Room(conversation) as IRoom
      })
  }

  /** 
   * 离开信令房间
   */
  leaveRoom(): Promise<void> {
    if (!this._room) {
      dbg(`you are not in a room`)
      return Promise.reject(`err_not_in_room`)
    }
    return this._room.quit()
    .then(conversation => {
      this._room = null
      // Note: don't pass conversation as parameter to promise chain
    })
  }

  /**
   * 当前信令客户端是否登录状态
   */
  get isLoggedIn(): boolean {
    return this._client !== null
  }

  /**
   * 当前信令房间
   */
  get room(): IRoom {
    return this._room
  }
}
