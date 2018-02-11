import {
    TextMessage,
} from 'leancloud-realtime'
import ISignal from './ISignal'

export interface ICmdSignal extends ISignal {
    cmdId: number

    cmdPayload: object
}

export class CmdSignal extends TextMessage implements ICmdSignal {

    cmdId: number

    protected _cmdPaylod: object
    protected _cmdPaylodStr: string

    constructor(cmdId: number, cmdPayload: object) {
        const text = JSON.stringify(cmdPayload)
        super(text)
        this.cmdId = cmdId
    }

    roomId(): string {
        return this.cid
    }

    get cmdPayload(): object {
        if (this._cmdPaylodStr === this.text && this._cmdPaylod) {
            return this._cmdPaylod
        } else {
            this._cmdPaylod = JSON.parse(this.text)
            this._cmdPaylodStr = this.text
            return this._cmdPaylod
        }
    }

}