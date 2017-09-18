---
title: Web聊天机器人
reward: true
date: 2017-08-26 23:11:29
tags:
  - Web Audio API
  - Baidu AI
  - WebSocket
---

有朋友曾经问我，`在AI的热潮中，我们前端能做点什么`，想了想，其实AI是没法离开我们前端的，因为无论AI有多牛，它提供的也是一种智能服务，最终它还是需要以产品的形态提供给用户的面前，只要是用户继续使用WEB，那么肯定是离不开我们前端工程师的。在很久之前，自己就想做一款基于语音识别的聊天AI产品了，但是这需要涉及很多自己不擅长的领域，自己还在摸索学习中，所以本文尝试借助第三方服务来实现。

本文只是一种简单的尝试，主要用到了以下技术：

  1. Web Audio API，利用此API相关接口进行录音和转码
  2. WebSocket，本文主要使用了 [Socket.IO](https://socket.io) 库来实现与机器人的语音实时对话。
  3. Nodejs，主要使用Koa来构建Web服务，接受语音数据，并调用百度语音识别API和图灵机器人API
  4. 百度语音识别API，对浏览器录制音频进行识别，输出文字
  5. 图灵机器人API，对识别出的语音文字，进行智能回复
  6. [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) 和 [SpeechSynthesisUtterance](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance) API，来进行文字朗读。 

<!-- more  -->


以下实现主要分为4个步骤：

  1. Web服务和前端界面实现
  2. 语音录制与音频转化
  3. 语音识别
  4. 语音回复


## Web服务和前端界面

本文主要是基于Koa2来实现Web服务，并使用async/await语法，所以需要你的nodejs版本至少是 `7.0`，本机使用的是 `8.3.0`版本。至于Koa2的用法，这里不做详细介绍，感兴趣的同学可以查阅官方文档：[http://koajs.com](http://koajs.com)，直接上Web服务代码：

```javascript
require('dotenv').config()

const path = require('path')
const Koa = require('koa')
const KoaRouter = require('koa-router')
const KoaStatic = require('koa-static')
const IO = require('koa-socket')

const app = new Koa()
const router = new KoaRouter()
const io = new IO()

// 定义路由
router.get('/', async (ctx, next) => {
  ctx.render('index.html')
})

// html
app.use(KoaStatic(path.join(__dirname, 'views')))
// js, css, images
app.use(KoaStatic(path.join(__dirname, 'public')))

app.use(router.routes())
app.use(router.allowedMethods())

io.attach(app)

io.on('connection', (socket) => {
  console.log('a user connected')
})

io.on('chat message', async (socket) => {
  // 1. 这里使用百度语音识别
  // 2. 图灵机器人回复
  io.broadcast('bot reply', { say: text, replay: reply })
})

app.listen(5000)

console.log('Server is on: http://localhost:5000')
```

前端界面源码可以到github上 [Demo](https://github.com/yugasun/AiChat) 去下载。

这里对话的内容是通过 [Socket.IO](https://socket.io) 来实现的，[Socket.IO](https://socket.io) 使用起来非常简单，发送者通过 `socket.emit(eventNanme, data)` 来发送数据，接受这通过 `sockiet.on(eventNanme, data)` 来接受数据。后端服务直接借助了 [koa-socket](https://github.com/mattstyles/koa-socket) 插件实现，因为它是对 `socket.io` 的二次封装，所以用法也很类似。


## 语音录制与音频转化

使用 [Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API/Using_Web_Audio_API#) 进行语音录制和音频转化，更多实例和相关知识也可以参考之前的一篇博文： [基于Web Audio API的音乐可视化](https://yugasun.com/post/%E5%9F%BA%E4%BA%8EWeb-Audio-API%E7%9A%84%E9%9F%B3%E4%B9%90%E5%8F%AF%E8%A7%86%E5%8C%96.html)。
因为百度语音识别对语音数据要求如下：

* 原始语音的录音格式目前只支持评测 8k/16k 采样率 16bit 位深的单声道语音
* 压缩格式支持：pcm（不压缩）、wav、amr
* 系统支持语言种类：中文（zh）、粤语（ct）、英文（en）。

而我们使用 AudioContext 录制的音频的采样率默认为 `44.1kHz`，采样位数为 `16bit`，所以我们需要将音频数据的采样率转化为 `8k/16kHz`，本文是直接转换为 `16kHz`；浏览器默认支持 `wav` 压缩格式，所以这里是符合要求的，但是需要使用 [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)，来将我们的音频流转化为相应的音频buffer。

我们知道浏览器提供了 [navigator.mediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) 接口来获取浏览器 `音频/视频流`，获取之后流媒体之后，我们可以使用 [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) 来创建一个 [ScriptProcessorNode](https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode) 节点来对音频流进行我们想要的处理：录制 - 转码(修改采样率)。具体项目封装了一个 `H5Recorder`，代码如下：

```javascript
(function (window) {

  var H5Recorder = function (stream) {
    var context = new AudioContext();
    var audioInput = context.createMediaStreamSource(stream);
    var recorder = context.createScriptProcessor(4096, 1, 1);

    var audioData = {
      size: 0, //录音文件长度
      buffer: [],  //录音缓存
      inputSampleRate: context.sampleRate, //输入采样率 默认为 44.1k
      inputSampleBits: 16, //输入采样数位 8, 16
      // 百度语音识别: 原始语音的录音格式目前只支持评测 8k/16k 采样率 16bit 位深的单声道语音
      outputSampleRate: 16000, //输出采样率
      oututSampleBits: 16,  //输出采样数位 8, 16
      input: function (data) {
        this.buffer.push(new Float32Array(data));
        this.size += data.length;
      },
      //合并压缩
      compress: function () { 
        //合并
        var data = new Float32Array(this.size);
        var offset = 0;
        for (var i = 0; i < this.buffer.length; i++) {
          data.set(this.buffer[i], offset);
          offset += this.buffer[i].length;
        }
        //压缩
        var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
        var length = data.length / compression;
        var result = new Float32Array(length);
        var index = 0, j = 0;
        while (index < length) {
          result[index] = data[j];
          j += compression;
          index++;
        }
        return result;
      },
      // 语音转码
      encodeWAV: function () {
        var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
        var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits);
        var bytes = this.compress();
        var dataLength = bytes.length * (sampleBits / 8);
        var buffer = new ArrayBuffer(44 + dataLength);
        var data = new DataView(buffer);

        var channelCount = 1;//单声道
        var offset = 0;

        var writeString = function (str) {
          for (var i = 0; i < str.length; i++) {
            data.setUint8(offset + i, str.charCodeAt(i));
          }
        }

        // 资源交换文件标识符 
        writeString('RIFF'); offset += 4;
        // 下个地址开始到文件尾总字节数,即文件大小-8 
        data.setUint32(offset, 36 + dataLength, true); offset += 4;
        // WAV文件标志
        writeString('WAVE'); offset += 4;
        // 波形格式标志 
        writeString('fmt '); offset += 4;
        // 过滤字节,一般为 0x10 = 16 
        data.setUint32(offset, 16, true); offset += 4;
        // 格式类别 (PCM形式采样数据) 
        data.setUint16(offset, 1, true); offset += 2;
        // 通道数 
        data.setUint16(offset, channelCount, true); offset += 2;
        // 采样率,每秒样本数,表示每个通道的播放速度 
        data.setUint32(offset, sampleRate, true); offset += 4;
        // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8 
        data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true); offset += 4;
        // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8 
        data.setUint16(offset, channelCount * (sampleBits / 8), true); offset += 2;
        // 每样本数据位数 
        data.setUint16(offset, sampleBits, true); offset += 2;
        // 数据标识符 
        writeString('data'); offset += 4;
        // 采样数据总数,即数据总大小-44 
        data.setUint32(offset, dataLength, true); offset += 4;
        // 写入采样数据 
        if (sampleBits === 8) {
          for (var i = 0; i < bytes.length; i++ , offset++) {
            var s = Math.max(-1, Math.min(1, bytes[i]));
            var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
            val = parseInt(255 / (65535 / (val + 32768)));
            data.setInt8(offset, val, true);
          }
        } else {
          for (var i = 0; i < bytes.length; i++ , offset += 2) {
            var s = Math.max(-1, Math.min(1, bytes[i]));
            data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
        }

        return new Blob([data], { type: 'audio/wav' });
      }
    };

    //开始录音
    this.start = function () {
      audioInput.connect(recorder);
      recorder.connect(context.destination);
    }

    //停止
    this.stop = function () {
      recorder.disconnect();
    }

    //获取音频文件
    this.getBlob = function () {
      this.stop();
      return audioData.encodeWAV();
    }

    //音频采集
    recorder.onaudioprocess = function (e) {
      audioData.input(e.inputBuffer.getChannelData(0));
      //record(e.inputBuffer.getChannelData(0));
    }

  };

  //获取录音机
  H5Recorder.init = function (callback) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        var rec = new H5Recorder(stream);
        callback(rec);
      })
      .catch(function (err) {
        console.error(err)
      })
  }

  window.H5Recorder = H5Recorder;
})(window);
```

使用时只需要通过 `H5Recorder.init()` 来初始化就行了。

> PS: 如果你想在线上使用 `navigator.mediaDevices.getUserMedia` 接口来获取用户音频/视频流，Chrome浏览器会提示不安全，必须升级https，才能正常使用，当然本地测试是没问题的。

## 语音识别

这里主要借助百度语音识别接口，使用前需要先到 [百度AI官网](http://ai.baidu.com/) 注册并创建应用，获得相应接口验证参数 ，然后下载Nodejs SDK。使用起来很简单，直接上代码了：

```javascript
const AipSpeech = require('./baidu-ai').speech  // 百度语音识别
// 设置APPID/AK/SK
// APP_ID = '你的 App ID'
// API_KEY = '你的 Api ID'
// SECRET_KEY = '你的 Secret Key'
const client = new AipSpeech(process.env.APP_ID, process.env.API_KEY, process.env.SECRET_KEY)

io.on('chat message', async (socket) => {
  const voiceBuffer = socket.data
  // 1. 这里使用百度语音识别
  let text = await client.recognize(voiceBuffer, 'wav', 16000, { lan: 'zh' })
    .then(function (res) {
      if (res.err_no === 0) {
        return res.result[0]
      } else {
        console.error(err)
      }
    })
    .catch(function (err) {
      console.error(err)
    })

  // 2. 图灵机器人回复
  //...
  io.broadcast('bot reply', { say: text, replay: reply })
})
```

## 语音回复

这里使用的是 [图灵机器人](http://www.tuling123.com)，使用前也需要到官网注册并创建相应的应用。图灵机器人非常强大，自身具有很多功能，如聊天对话、预报天气、讲笑话等，可以根据个人需要定制相关功能。接口使用也是非常简单，相关代码如下：

```javascript
const SendChat = require('./tuling-ai') // 图灵机器人回复
io.on('chat message', async (socket) => {
  const voiceBuffer = socket.data
  // 1. 这里使用百度语音识别
  let text = await client.recognize(voiceBuffer, 'wav', 16000, { lan: 'zh' })
    .then(function (res) {
      if (res.err_no === 0) {
        return res.result[0]
      } else {
        console.error(err)
      }
    })
    .catch(function (err) {
      console.error(err)
    })

  // 2. 图灵机器人回复
  let reply = await SendChat(text)
    .then((res) => {
      return res.results[0].values.text
    })
    .catch((err) => {
      console.error(err)
    })
  io.broadcast('bot reply', { say: text, replay: reply })

})
```

这里 `tuling-ai` 是个人基于接口封装的一个基于 `Promise` 的请求模块，代码如下：

```javascript

const request = require('request-promise')

function SendChat (text) {
  const textTpl = {
    'perception': {
      'inputText': {
        'text': text
      },
      'selfInfo': {
        'from': 'chat'
      }
    },
    'userInfo': {
      'apiKey': '填写创建的图灵机器人的apiKey',
      'userId': 'test'
    }
  }

  let options = {
    method: 'POST',
    uri: 'http://openapi.tuling123.com/openapi/api/v2',
    body: textTpl,
    json: true
  }

  return request(options)
}

module.exports = SendChat
```

到这里就实现了我们的简易Web聊天机器人。赶紧运行测试一下吧~

本文项目 [源码地址](https://github.com/yugasun/AiChat)

## 总结

虽然本文是一个简单的聊天机器人Demo，但是实现它其实涉及到很多知识点，需要我们花时间慢慢的去消化。所以在AI的热潮中，我们前端还是有很多事情可以做的。后面个人将尝试创建私人聊天接口来替代图灵机器人，这将会在后续的文章中体现，敬请期待~