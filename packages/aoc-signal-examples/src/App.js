import React, { Component } from 'react';
import './App.css';
import { SignalService, CmdSignal, ChatSignal } from 'aoc-signal';
import _ from 'lodash';
// import { TextMessage } from 'leancloud-realtime';
import {formatTime, encodeHTML, messageDelay, addSample, getSample } from './utils';
import roomProps from './roomProps';
import leancloudConfig from './leancloud/leancloud_config';
import { CmdDef } from './Consts';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userName: 'Guest1',
      password: '123123',
      roomProps: roomProps,
      msgToSend: '',
      msgInterval: 1000,
      bgColor: 'white',
      loginBtnText: 'Login',
      logs: [],
      samples: {
        send: {
          cnt: 0,
          avg: 0
        },
        recv: {
          cnt: 0,
          avg: 0
        },
        total: {
          cnt: 0,
          avg: 0
        }
      }
    };
    this.signalService = new SignalService(leancloudConfig);
    this.lastMessageSendTime = 0;
  }

  _handleLoginBtnEvt = () => {
    if(this.state.loginBtnText === 'Login') {
      this.login();
    } else {
      this.logout();
    }
  }

  login = () => {
    this.showLog(`${this.state.userName} 正在登录...`);
    const callbacks = {
      onDisconnect: () => {
        this.showLog('[disconnect] 服务器连接已断开');
      },
      onOffline: () => {
        this.showLog('[offline] 离线（网络连接已断开）');
      },
      onOnline: () => {
        this.showLog('[online] 已恢复在线');
      },
      onSchedule: (attempt, time) => {
        this.showLog(`[schedule] ${time / 1000}s 后进行第 ${attempt + 1} 次重连`);
      },
      onRetry: (attempt) => {
        this.showLog(`[retry] 正在进行第 ${attempt + 1} 次重连`);
      },
      onReconnect: () => {
        this.showLog('[reconnect] 重连成功');
      },
      onReconnecterror: () => {
        this.showLog('[reconnecterror] 重连失败');
      },
      // onMessage: this.onMessage,
    };
    const {id, ...restRoomProps} = this.state.roomProps;
    let room = restRoomProps;
    if(id !== '') {
      room = id;
    }
    const roomLogName = typeof room === 'string' ? room : restRoomProps.name;
    this.signalService.login(this.state.userName, callbacks)
      .then(() => {
        this.showLog(`${this.state.userName} 登录成功`);
        this.showLog(`${this.state.userName} 加入房间 ${roomLogName}...`);
        const callbacks = {
          onMessage: this.onMessage,
          // onMessageHistory: this.onMessageHistory,
          onReceipt: this.onReceipt,
          onDelivered: this.onDelivered,
          onMembersJoined: this.onMembersJoined,
          onMembersLeft: this.onMembersLeft,
        };
        this.signalService.joinRoom(room, callbacks)
          .then((room) => {
            this.showLog(`${this.state.userName} 加入房间 ${roomLogName} 成功`);
            this.showLog(`当前房间人数${room.members.length}, 可以开始聊天 [${room.members.join(',')}]`);
            this.setState({
              loginBtnText: 'Logout'
            });
          });
      });
  }

  logout = () => {
    const afterLogout = () => {
      this.showLog(`${this.state.userName} 注销成功`);
      this.setState({
        loginBtnText: 'Login'
      });
    };
    if (this.signalService.room) {
      this.signalService.leaveRoom().then(() => {
        this.signalService.logout().then(afterLogout);
      });
    } else {
      this.signalService.logout().then(afterLogout);
    }
  }

  onMessage = (message) => {
    if(message instanceof ChatSignal) {
      this.showMsg(message);
    } else if (message instanceof CmdSignal) {
      switch(message.cmdId) {
        case CmdDef.SET_BG_COLOR: 
          this.updateBgColor(message.cmdPayload.value, false);
          break;

        default: 
          console.warn(`unsupported cmdId: ${message.cmdId}`);
          break;  
      }
    }
  }

  onReceipt = ({message}) => {
    const delayRecv = message.deliveredAt - message.timestamp;
    this.updateSample('recv2', delayRecv);
    const recv2 = getSample('recv2');
    console.log(`onReceipt ${message.text}, onDeliveredAt - onTimestamp = ${delayRecv}, cnt=${recv2.cnt}, avg=${recv2.avg.toFixed(0)}`);
  }

  onDelivered = () => {
    this.signalService.room.refresh()
      .then((room) => {
        if(this.lastMessageSendTime > 0) {
          const delay = room.lastDeliveredAt.getTime() - this.lastMessageSendTime;
          this.updateSample('total', delay);
          console.log(`onDelivered delay=${delay}`);
          this.lastMessageSendTime = 0;
        }
        console.log(room.lastDeliveredAt);
      });
  }

  onMembersJoined = (payload) => {
    console.log(`onMembersJoined event: ${JSON.stringify(payload, null, 2)}`);
    const members = payload.members;
    members.forEach(member => {
      this.showActivity('joined room', member);
    });
  }

  onMembersLeft = (payload) => {
    console.log(`onMembersLeft event: ${JSON.stringify(payload, null, 2)}`);
    const members = payload.members;
    members.forEach(member => {
      this.showActivity('left room', member);
    });
  }    

  onMessageHistory = (history) => {
    const msgCnt = history.length;
    for(let i = msgCnt - 1; i >= 0; i--) {
      this.showMsg(history[i], true);
    }
  }

  sendMsg = () => {
    if(this.state.msgToSend.length === 0) {
      alert(`请输入文字`);
    } else {
      this.signalService.room.broadcastMsg(this.state.msgToSend)
        .then(message => {
          this.setState({
            msgToSend: '',
          });
          this.showMsg(message);
        });
    }
  }

  autoSendMsg = () => {
    if(!this.signalService.isLoggedIn) {
      alert('你还没有登录');
      return;
    }
    this.autoSendTimer = setInterval(() => {
      const msg = `msg content ${this.state.samples.send.cnt + 1}`;
      this.signalService.sendMsg(msg)
        .then(message => {
          this.showMsg(message);
        });
    }, this.state.msgInterval);
  }

  autoSendStop = () => {
    if(this.autoSendTimer > 0) {
      clearInterval(this.autoSendTimer);
      this.autoSendTimer = 0;
    }
  }

  showActivity = (activity, member) => {
    this.showLog(`${member} ${activity}`);
  }

  showMsg = (message, isBefore) => {
    let from = message.from;
    const isSelf = message.from === this.state.userName;
    if(isSelf) {
      from = '自己';
    }

    if(isSelf) {
      this.updateSample('send', message.sendDelay);
      this.lastMessageSendTime = message.timestamp;
      this.showLog(`(${formatTime(message.timestamp)}) ${message.sendDelay}ms 自己:`, `${encodeHTML(message.text)}`, isBefore);
    } else {
      const delay = messageDelay(message);
      this.updateSample('recv', delay);
      this.showLog(`(${formatTime(Date.now())}) ${delay}ms ${encodeHTML(from)}:`, `${encodeHTML(message.text)}`, isBefore);
    }
  }

  showLog = (msg, data, isBefore) => {
    const item = [msg];
    if (data) {
      item.push(data);
    }
    const logs = this.state.logs;
    if (isBefore) {
      logs.unshift(item);
    } else {
      logs.push(item);
    }
    // console.log(`scrollTop: ${this.refs.logPanel.scrollTop}, scrollHeight: ${this.refs.logPanel.scrollHeight}`);
    this.setState({
      logs: logs,
    });
    this.refs.logPanel.scrollTop = this.refs.logPanel.scrollHeight;
  }

  renderLogs = () => {
    const bgColorCls = `bg-color-${this.state.bgColor}`;
    return (
      <div id="print-wall" className={`print-wall ${bgColorCls}`} ref="logPanel">
        {
          this.state.logs.map((log, index) => {
            if(_.isArray(log) && log.length > 1) {
              return (<p key={`log_${index}`}>{log[0]} <span className="strong">{log[1]}</span></p>);
            } else {
              return (<p key={`log_${index}`}>{log[0]}</p>);
            }
          })
        }
      </div>
    );
  }

  updateInputtext = (evt, key) => {
    this.setState({
      [key]: evt.target.value
    });
  }

  updateRoomProps = (evt, key) => {
    this.setState({
      roomProps: {
        ...this.state.roomProps,
        [key]: evt.target.value
      }
    });
  }

  updateBgColor = (color, needBroadcast = true) => {
    this.setState({
      bgColor: color
    });
    if(needBroadcast && this.signalService && this.signalService.isLoggedIn) {
      this.signalService.room.broadcastCmd(CmdDef.SET_BG_COLOR, { value: color});
    }
  }

  updateSample = (key, value) => {
    addSample(key, value);
    this.setState({
      samples: {
        ...this.state.samples,
        [key]: getSample(key),
      }
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Leancloud React Demo</h1>
        </header>

        <div className="item">
          <label>
            用户名
            <input autoFocus id="input-name" type="text"
              value={this.state.userName}
              onChange={evt => this.updateInputtext(evt, 'userName')}
            />
          </label>
          <label>
            房间名
            <input autoFocus id="input-room" type="text"
              value={this.state.roomProps.name}
              onChange={evt => this.updateRoomProps(evt, 'name')}
            />  
          </label>
        </div>
        <div className="item">   
          <label>
            房间ID(id值不为空优先根据id加入房间)
            <input autoFocus id="input-room-id" type="text"
              value={this.state.roomProps.id}
              onChange={evt => this.updateRoomProps(evt, 'id')}
            />  
          </label>
          <div id="login-btn" className="btn" onClick={this._handleLoginBtnEvt}>{this.state.loginBtnText}</div>
        </div>
        <div className="stats">
          Message Send Count: {this.state.samples.send.cnt}, Average Delay: {this.state.samples.send.avg.toFixed(0)}ms (发送成功时间 - 消息发出时间)
        </div>
        <div className="stats">
          Message Recv Count: {this.state.samples.recv.cnt}, Average Delay: {this.state.samples.recv.avg.toFixed(0)}ms (接收方收到时间 - msg.timestamp)
        </div>
        <div className="stats">
          Message Count: {this.state.samples.total.cnt}, Average Delay: {this.state.samples.total.avg.toFixed(0)}ms (onDelivered时间 - msg.timestamp)
        </div>
        <div className="item">
          <label>
            切换背景颜色
            <select value={this.state.bgColor}
              onChange={evt => this.updateBgColor(evt.target.value, true)}>
              <option value="white">White</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
            </select>
          </label>
        </div>
        <div className="item">
          {this.renderLogs()}
        </div>
        <div className="item">
          <label>输入信息：</label>
          <input id="input-send" className="input-send" type="text"
            value={this.state.msgToSend}
            onChange={evt => this.updateInputtext(evt, 'msgToSend')}
          />
          <div id="send-btn" className="btn" onClick={this.sendMsg}>发送</div>
        </div>
        <div className="item">
          <label>时间间隔(毫秒)：</label>
          <input id="input-send" className="input-send-interval" type="text"
            value={this.state.msgInterval}
            onChange={evt => this.updateInputtext(evt, 'msgInterval')}
          />
          <div id="auto-send-btn" className="btn" onClick={this.autoSendMsg}>自动发送</div>
          <div id="auto-send-stop-btn" className="btn" onClick={this.autoSendStop}>停止</div>
        </div>

      </div>
    );
  }
}

export default App;
