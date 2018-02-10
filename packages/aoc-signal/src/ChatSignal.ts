import {
    TextMessage,
} from 'leancloud-realtime'
import ISignal from './ISignal'

export default class ChatSignal extends TextMessage implements ISignal {
    roomId(): string {
        return this.cid
    }
}