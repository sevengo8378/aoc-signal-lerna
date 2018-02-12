export default interface ISignal {
   /**
    * 房间id
    */ 
   readonly roomId: string

   /**
    * 信令发送者
    */
   readonly from: string

   /**
    * 信令id
    */
   readonly id: string

   /**
    * 信令发出时间
    */
   readonly timestamp: Date

   /**
    * 转化成json对象
    */
   toJSON(): object

}