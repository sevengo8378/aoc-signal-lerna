import ISignal from './ISignal'

export default interface ICmdSignal extends ISignal {
    cmdId: number

    content: object
}