---
title: 基于Web Audio API的音乐可视化
desc: 基于Web Audio API的音乐可视化
reward: true
date: 2017-08-02 00:12:23
tags:
  - Javascript
  - HTML5
---

> [Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API/Using_Web_Audio_API#) 提供了一个简单强大的机制来实现控制Web应用程序的音频内容。它允许你开发复杂的混音，音效，平移以及更多。[Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API/Using_Web_Audio_API#) 并不会取代HTML5的 `audio` 音频元素，而是 `audio` 的补充。如果你只是想控制一个简单的音频播放，你最好选择 `audio`，如果你想实现更复杂的音频处理以及播放，那么 [Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API/Using_Web_Audio_API#) 无疑是更好的选择。

<!-- more  -->

## 基本概念

Web Audio API可以在一个音频上下文中对音频进行相关处理，它允许音频基于模块化的流程处理。基本音频操作都是基于音频节点来进行的，这些节点被连接在一起，组成一个音频的路由图。它支持带有不同类型的频道层的多个音源，甚至只需要一个音频上下文。它基于模块化的设计，使得你可以动态的创建复杂的音频功能。

音频节点通过输入和输出连接起来，形成一个链，从一个或多个源出发，通过一个或更多的节点，最终到输出终端（你也可以不提供输出终端，换句话说，如果只是想使一些音频数据可视化）。

一个基本的Web Audio的工作流程如下：

1. 构建音频上下文AudioContext对象；
2. 在AudioContext对象内，构建音源，比如 `audio`，oscillator，stream
3. 构建效果节点，比如混响，双二阶滤波器，声相，压限器
4. 选择最终的音频终端，比如说你的系统扬声器
5. 连接源到效果节点，连接效果节点到音频终端

## 构建AudioContext对象

首先，创建一个 [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) 实例：

```javascript
var audioCtx = new AudioContext();
```

对于webkit/Blink浏览器和Firefox浏览器需要进行兼容处理，修改如下：

```javascript
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
```

> 注意：在Safari浏览器下，不添加 `window` 前缀，该函数会无效。(但是在最新的Safari@10.1.2中没有发现此问题)

## 创建AudioSource

现在我们已经创建了一个音频上下文，你可以使用音频上下文的方法来做很多事情。但是第一步要做的就是创建一个音频源。当然你可以通过很多种方式创建，下面列出了一些例子：

* 通过JavaScript直接生成一个音频节点比如oscillator. 一个 [OscillatorNode](https://developer.mozilla.org/zh-CN/docs/Web/API/OscillatorNode)是利用[AudioContext.createOscillator](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createOscillator) 方法来构建。
* 从原始PCM数据构建: AudioContext有解密被支持的音频格式的多种方法。 看 [AudioContext.createBuffer()](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createBuffer), [AudioContext.createBufferSource()](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createBufferSource), 以及 [AudioContext.decodeAudioData()](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/decodeAudioData).
* 来自于HTML音频元素例如 [video](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/video) 或者 [`audio`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/audio): 可以看 [AudioContext.createMediaElementSource()](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createMediaElementSource).
* 直接来自于 [WebRTC](https://developer.mozilla.org/en-US/docs/WebRTC)，[MediaStream](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaStream) 例如来自于摄像头或麦克风. 可以看 [AudioContext.createMediaStreamSource()](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createMediaStreamSource).

这里我将通过XHR加载音频文件，通过 [AudioContext.decodeAudioData()](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/decodeAudioData) 来解码成buffer，并通过 [AudioContext.createBufferSource()](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createBufferSource)将buffer转换为一个音频源对象。代码如下：

```javascript
var audioData = ajaxRequest.response
audioCtx.decodeAudioData(audioData)
  .then(function (buffer) {
    concertHallBuffer = buffer
    soundSource = playAudioCtx.createBufferSource()
    // ....
  )
```

## 连接音频源和输出终端节点(音频设备...)

为了将上一步创建的音频源输出到扬声器播放，需要将其跟输出终端节点连接起来。

设备的默认输出结构（通常是指设备扬声器），可以通过连接到 [AudioContext.destination](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/destination)来输出。代码如下：

```javascript
soundSource.connect(audioCtx.destination)
```

当然在连接输出终端之前，可以介入很多音频效果节点，如上面提到的 [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode), [BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode), [ WaveShaperNode](https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode)[ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode) [GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode)，集体各个节点作用，可以查看相关API，实例如下：

```javascript
soundSource = audioCtx.createBufferSource()
soundSource.buffer = concertHallBuffer
soundSource.connect(analyser)
analyser.connect(distortion)
distortion.connect(biquadFilter)
biquadFilter.connect(convolver)
convolver.connect(gainNode)
gainNode.connect(audioCtx.destination)
```

这将会形成一个音频节点图：

![audio-node-graph](https://static.yugasun.com/audio-node-graph.png)

也可以连接多个节点到一个效果节点上，比如需要混合多个音频源在一起，就让他们都通过一个效果节点。

## 播放音乐及设置音调

现在audio节点图已经建立，我们可以设置音频相关属性值及调用音频节点的相关方法来实现想要的音效。实例代码如下：

```javascript
// sine wave — other values are 'square', 'sawtooth', 'triangle' and 'custom'
oscillator.type = 'sine'; 
oscillator.frequency.value = 2500; // value in hertz
oscillator.start();
```

## 基于canvas实现音频可视化

根据音频数据的频率来绘制不同高度的音频柱子，代码如下：

```javascript
const WIDTH = canvas.width
const HEIGHT = canvas.height
var bufferLength
var dataArray
var draw

// fftSize - 频域的 FFT 变换的大小
analyser.fftSize = 4096

// frequencyBinCount - 值为fftSize的一半. 这通常等于将要用于可视化的数据值的数量.
bufferLength = analyser.frequencyBinCount

dataArray = new Uint8Array(bufferLength)
canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)

draw = function () {
  window.requestAnimationFrame(draw)
  analyser.getByteFrequencyData(dataArray)

  canvasCtx.fillStyle = 'rgb(0, 0, 0)'
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

  var barWidth = (WIDTH / bufferLength) * 2.5
  var barHeight
  var x = 0

  for (var i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i]

    canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)'
    canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2)

    x += barWidth + 1
  }
}

draw()
```

## 总结

到这里，一个简易的音频可视化方案就实现了，当然[Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API/Using_Web_Audio_API#)能做的不仅仅只是文中提到的这些，感兴趣的可以更加深入的研究。

本文的项目源码地址：[Web Audio API Practice](https://github.com/yugasun/Web-Audio-API-Practice)

## 参考文献

* [Using the Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API)