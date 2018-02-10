export default interface ISignal {
   roomId(): string

   readonly from: string

   readonly id: string

   toJSON(): object

}