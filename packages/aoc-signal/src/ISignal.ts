export default interface ISignal {
   roomId(): string

   readonly from: string

   readonly id: string

   timestamp: Date

   toJSON(): object

}