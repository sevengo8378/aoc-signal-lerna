import {
    TextMessage,
} from 'leancloud-realtime'
import ISignal from './ISignal'

export interface IChatSignal extends ISignal {
    message: string
}

export class ChatSignal extends TextMessage implements IChatSignal {
    roomId(): string {
        return this.cid
    }

    get message(): string {
        return this.text
    }
}