import {
    TextMessage,
} from 'leancloud-realtime'
import ISignal from './ISignal'

export interface IChatSignal extends ISignal {
    /**
     * 文字聊天内容
     */
    message: string
}

/**
 * 房间内文字聊天消息
 */
export class ChatSignal extends TextMessage implements IChatSignal {
    /**
     * 房间id
     */
    get roomId(): string {
        return this.cid
    }

    /**
     * 文字聊天内容
     */
    get message(): string {
        return this.text
    }
}