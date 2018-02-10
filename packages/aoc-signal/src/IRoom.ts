import ISignal from './ISignal'

export default interface IRoom {
    members: string[]

    createdAt: Date

    id: string 

    name: string 

    getHistorySignals(options: {beforeTime?: Date, beforeSignalId?: string, limit?: number}): Promise<ISignal[]> 
}