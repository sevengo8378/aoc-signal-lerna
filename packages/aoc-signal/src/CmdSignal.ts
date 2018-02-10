import {
    TextMessage,
} from 'leancloud-realtime'
import ISignal from './ISignal'

export default class CmdSignal extends TextMessage implements ISignal {

    constructor(cmd: { type: string, payload: any}) {
        const text = JSON.stringify(cmd)
        super(text)
    }
    
    roomId(): string {
        return this.cid
    }
}