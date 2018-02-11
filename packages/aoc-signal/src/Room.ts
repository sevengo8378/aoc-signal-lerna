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

export class Room implements IRoom {
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

    sendCmd(cmdId: number, cmdPayload: object , destination: string): Promise<ISignal> {
        const signal = new CmdSignal(cmdId, cmdPayload).setMentionList([destination])
        return this._send(signal)
    }

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

    join(): Promise<Conversation> {
        return this._conversation.join()
    }

    quit(): Promise<Conversation> {
        return this._conversation.quit()
    }

    refresh(): Promise<IRoom> {
        return this._conversation.fetchReceiptTimestamps()
            .then((conversation: Conversation) => {
                return this
            })
    }

}