import {
    Conversation, 
    Message
} from 'leancloud-realtime'
import ISignal from './ISignal'
import { ChatSignal } from './ChatSignal'
import { CmdSignal } from './CmdSignal'

export interface IRoom {
    members: string[]

    createdAt: Date

    id: string 

    name: string 

    lastDeliveredAt: Date 

    lastReadAt: Date

    sendMsg(message: string, destination: string): Promise<ISignal>

    broadcastMsg(message: string): Promise<ISignal>

    sendCmd(cmdId: number, cmdPayload: object , destination: string): Promise<ISignal>

    broadcastCmd(cmdId: number, cmdPayload: object): Promise<ISignal>

    getHistorySignals(options: {beforeTime?: Date, beforeSignalId?: string, limit?: number}): Promise<ISignal[]> 

    refresh(): Promise<IRoom>
}

/**
 * 信令房间
 */
export class Room implements IRoom {
    protected _conversation: Conversation

    /**
     * 注意: 在joinRoom等函数返回的Promise回调回调会带有room参数，库使用者不要直接new Room实例
     * @param conversation 
     */
    constructor(conversation: Conversation) {
        this._conversation = conversation
    }

    /**
     * 房间成员
     */
    get members(): string[] {
        return this._conversation.members
    }

    /**
     * 房间创建时间
     */
    get createdAt(): Date {
        return this._conversation.createdAt
    }

    /**
     * 房间unique id
     */
    get id(): string {
        return this._conversation.id
    }

    /**
     * 房间显示名称
     */
    get name(): string {
        return this._conversation.name
    }

    /**
     * 房间内最后一条消息送达时间
     */
    get lastDeliveredAt(): Date {
        return this._conversation.lastDeliveredAt
    }

    /**
     * 房间内最后一条消息被阅读时间
     */
    get lastReadAt(): Date {
        return this._conversation.lastReadAt
    }

    /**
     * 获取房间历史消息
     * @param options 条件设置
     * @param options.beforeTime 限制起始查询结果为小于该时间之前的消息，不传则为当前时间
     * @param options.limit 限制查询结果的数量，默认为 20
     */
    getHistorySignals(options: {beforeTime?: Date, limit?: number}): Promise<ISignal[]> {
        const iter: any = this._conversation.createMessagesIterator(options)
        return iter.next().then((result: any) => {
            return result.value as ISignal[]
        })
    }

    /**
     * 发送聊天消息
     * @param message 消息文本
     * @param destination 目标接收对象，请传clientId
     */
    sendMsg(message: string, destination: string): Promise<ISignal> {
        const signal = new ChatSignal(message).setMentionList([destination])
        return this._send(signal)
    }

    /**
     * 广播聊天消息
     * @param message 消息文本
     */
    broadcastMsg(message: string): Promise<ISignal> {
        const signal = new ChatSignal(message).mentionAll()
        return this._send(signal)
    }

    /**
     * 发送指令
     * @param cmdId 指令id
     * @param cmdPayload 指令附带信息 
     * @param destination 目标接收对象，请传clientId
     */
    sendCmd(cmdId: number, cmdPayload: object , destination: string): Promise<ISignal> {
        const signal = new CmdSignal(cmdId, cmdPayload).setMentionList([destination])
        return this._send(signal)
    }

    /**
     * 广播指令
     * @param cmdId 指令id
     * @param cmdPayload 指令附带信息 
     */
    broadcastCmd(cmdId: number, cmdPayload: object): Promise<ISignal> {
        const signal = new CmdSignal(cmdId, cmdPayload).mentionAll()
        return this._send(signal)
    }

    protected _send(signal: ChatSignal | CmdSignal): Promise<ISignal> {
        return this._conversation.send(signal, {
            receipt: true,
            transient: false,
        }).then((msg: ChatSignal | CmdSignal) => {
            return msg as ISignal
        }) 
    }

    /**
     * 主动加入房间
     */
    join(): Promise<Conversation> {
        return this._conversation.join()
    }

    /**
     * 主动退出房间
     */
    quit(): Promise<Conversation> {
        return this._conversation.quit()
    }

    /**
     * 刷新房间信息，lastDeliveredAt和lastReadAt会随之更新
     */
    refresh(): Promise<IRoom> {
        return this._conversation.fetchReceiptTimestamps()
            .then((conversation: Conversation) => {
                return this
            })
    }

}