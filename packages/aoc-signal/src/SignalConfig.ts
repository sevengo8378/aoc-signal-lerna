import { Record } from 'immutable'

/**
 * 信令服务实例配置
 */
export default class SignalConfig extends Record({
    appId: null,
    appKey: null,
    region: 'cn',
    RTMServers: null,
    // plugins: null,
}) {
    // 应用ID
    appId: string

    // 应用key
    appKey: string

    // 节点id
    region: string

    // 指定私有部署的 RTM 服务器地址
    RTMServers?: string

    // 加载插件
    // plugins?: string[]
}