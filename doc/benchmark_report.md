这次挑了4台机器，测试leancloud使用中各种性能问题，每次测试让两台机器模拟客户端连接服务器加入房间然后收发消息，持续跑24小时。

初步结论：
1. 客户端连接服务器的连通率还是比较高的，当然因为客户端分布不够广泛这个结论仅供参考
2. 不使用专线无论国内海外几乎不发生断线，海外使用专线会有规律断线。询问了leancloud答复是专线入口代理有配置超时时间，去掉就可以了。
3. 海外客户端连接服务器耗时使用专线提升明显(美国从8秒到1.3秒, 新加坡从3.2秒到1.9秒），用户体验考虑北美估计需要使用专线。
4. 建立连接后加入房间，收发消息等行为受专线影响不大。国内与海外之间能保持在300ms以内，国内到国内150ms以内，感觉在可接受范围内。
5. 专业版基础价格30RMB/天起，实时消息按照15RMB/天/万人计算。
6. 专线价格10Mbps带宽起售，7000RMB/月。之后每1Mbps带宽/700RMB可往上叠加。

接下来计划:
1. 针对REST api做http测试，这个能覆盖的范围就很广了
2. 开始针对js前端开发一个library，供前端调用
3. 目前建立了一套方便的机制，如果有更多海外ubuntu环境，可以做更多测试

详细结果如下:

环境:
* 国内两台 - aws国内，公司50.148
* 海外1 - aws美国东部
* 海外2 - aws新加坡

1.登录连接服务器耗时：

统计方式： 登录成功时间 - 开始登录时间

结果:

测试项         | 耗时ms(10%中位数)  | 耗时ms(50%中位数)  | 耗时ms(90%中位数) 
--------      | ---------------- | ---------------- | ---------
中国 | 594ms | 793ms | 1048ms
美国东部(无专线) | 5227ms | 8044ms  | 134028ms
美国东部(有专线) |1315ms | 1360ms | 1437ms
新加坡(无专线) | 2642ms | 3188ms | 4724ms
新加坡(有专线) | 1820ms | 1887ms | 2056ms

2.进入房间耗时：

统计方式： 成功进入房间 - 开始进入房间

结果:

测试项         | 耗时(10%中位数)  | 耗时(50%中位数)  | 耗时(90%中位数) 
--------      | ---------------- | ---------------- | ---------
中国 | 256ms | 271ms | 315ms
美国东部(无专线) |717ms | 776ms | 894ms
美国东部(有专线) | 696ms | 710ms | 727ms
新加坡(无专线)   | 507ms | 528ms | 587ms
新加坡(有专线) | 899ms | 917ms | 941ms

3.发送方统计消息延时：

统计方式： 每5分钟统计一次，每次A每隔2秒发送1条消息给B，连续发送10条，统计消息从A到B平均耗时

结果：
测试项 | 阶段 | 耗时(10%中位数)  | 耗时(50%中位数)  | 耗时(90%中位数) 
----- | --- | ---------------- | ----------------- | ---------
A中国->B中国 |  A到B | 115ms | 125ms | 135ms
A中国->B中国 |  A到服务器 | 54ms | 65ms | 67ms
A中国->B中国 |  服务器到B | 58ms | 63ms | 72ms
A中国->B海外 | A到B | 195ms | 236ms | 295ms
A中国->B海外 | A到服务器 | 54ms | 61ms | 68ms
A中国->B海外 | 服务器到B | 127ms | 180ms | 229ms
A美国东部->B中国(无专线) | A到B | 230ms | 247ms | 275ms
A美国东部->B中国(无专线) | A到服务器 | 170ms | 184ms | 212ms
A美国东部->B中国(无专线) | 服务器到B | 55ms | 60ms | 73ms
A美国东部->B中国(有专线) | A到B | 222ms | 229ms | 243ms
A美国东部->B中国(有专线) | A到服务器 | 164ms | 168ms | 174ms
A美国东部->B中国(有专线) | 服务器到B | 56ms | 60ms | 73ms
A新加坡->B中国(无专线) | A到B | 185ms | 195ms | 217ms
A新加坡->B中国(无专线) | A到服务器 | 118ms | 123ms | 137ms
A新加坡->B中国(无专线) | 服务器到B | 60ms | 71ms | 82ms
A新加坡->B中国(有专线) | A到B | 284ms | 292ms | 305ms
A新加坡->B中国(有专线) | A到服务器 | 215ms | 220ms | 226ms
A新加坡->B中国(有专线) | 服务器到B | 66ms | 71ms | 82ms

4.连接断线率

统计方式： 客户端启动后放一个小时，统计断线和重新连接成功次数

结果:
* 中国：不发生断线
* 海外(无专线): 不发生断线
* 海外(有专线): 每6分钟断线一次，之后又重连成功 

5.没有发生连接不上的情况