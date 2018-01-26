/**
 * Created by byrne on 18/01/2018.
 */

export default {
  // id: '5a605d7d5b90c830ff7bbae7',
// id: '5a6008fc1579a30038700abc',
//   members: ['Sender', 'Receiver'],
  name: 'testroom',

  // 创建暂态的聊天室（暂态类似聊天室,无人员上线,不能查询成员列表,没有成员加入离开通知,不支持邀请踢出）
  transient: false,

  // 唯一对话，当其为 true 时，如果当前已经有相同成员的对话存在则返回该对话，否则会创建新的对话
  unique: true,
};
