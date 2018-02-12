import {
    TextMessage,
} from 'leancloud-realtime'
import ISignal from './ISignal'

export interface ICmdSignal extends ISignal {
    /**
     * 指令id
     */
    cmdId: number

    /**
     * 指令附带信息
     */
    cmdPayload: object
}

/**
 * 房间内指令消息
 */
export class CmdSignal extends TextMessage implements ICmdSignal {

    /**
     * 指令id
     */
    cmdId: number

    protected _cmdPaylod: object
    protected _cmdPaylodStr: string

    /**
     * 构造指令实例
     * @param cmdId 指令id
     * @param cmdPayload 指令附带信息 
     */
    constructor(cmdId: number, cmdPayload: object) {
        const text = JSON.stringify(cmdPayload)
        super(text)
        this.cmdId = cmdId
    }

    /**
     * 房间id
     */
    get roomId(): string {
        return this.cid
    }

    /**
     * 指令附带信息
     */
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