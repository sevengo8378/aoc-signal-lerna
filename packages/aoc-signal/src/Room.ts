import {
    Conversation, 
    Message
} from 'leancloud-realtime'
import ISignal from './ISignal'
import IRoom from './IRoom'
import ChatSignal from './ChatSignal'
import CmdSignal from './CmdSignal'

export default class Room implements IRoom {
    protected _conversation: Conversation

    constructor(conversation: Conversation) {
        this._conversation = conversation
    }

    get members(): string[] {
        return this._conversation.members
    }

    get createdAt(): Date {
        return this._conversation.createdAt
    }

    get id(): string {
        return this._conversation.id
    }

    get name(): string {
        return this._conversation.name
    }

    get lastDeliveredAt(): Date {
        return this._conversation.lastDeliveredAt
    }

    get lastReadAt(): Date {
        return this._conversation.lastReadAt
    }

    getHistorySignals(options: {beforeTime?: Date, beforeSignalId?: string, limit?: number}): Promise<ISignal[]> {
        const iter: any = this._conversation.createMessagesIterator(options)
        return iter.next().then((result: any) => {
            return result.value as ISignal[]
        })
    }

    sendMsg(message: string, destination: string): Promise<ISignal> {
        const signal = new ChatSignal(message).setMentionList([destination])
        return this._send(signal)
    }

    broadcastMsg(message: string): Promise<ISignal> {
        const signal = new ChatSignal(message).mentionAll()
        return this._send(signal)
    }

    sendCmd(cmd: { type: string, payload: any} , destination: string): Promise<ISignal> {
        const signal = new CmdSignal(cmd).setMentionList([destination])
        return this._send(signal)
    }

    broadcastCmd(cmd: { type: string, payload: any}): Promise<ISignal> {
        const signal = new CmdSignal(cmd).mentionAll()
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

    refresh(): Promise<Room> {
        return this._conversation.fetchReceiptTimestamps()
            .then((conversation: Conversation) => {
                return this
            })
    }

}