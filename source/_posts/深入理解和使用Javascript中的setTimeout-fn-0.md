---
title: '深入理解和使用Javascript中的setTimeout(fn,0)'
reward: true
date: 2017-08-07 17:05:51
tags:
  - Javascript
---

在讲述之前我们先来看一段代码：

```javascript
console.log(1)
setTimeout(function(){
  console.log(2)
},0)
console.log(3)
```

上述代码输出顺序是：132

那么问题来了：

> 上述代码中setTimeout函数设置的明明是 `0` 毫秒后执行回调函数，为什么 `2` 会在 `3` 之后输出呢？
<!-- more  -->

理解setTimeout之前你需要知道 ***JavaScript的单线程机制和浏览器的事件模型***


## 单线程的Javascript

首先浏览器是多线程的，各个线程在内核控制下同步执行，一个浏览器至少实现三个常驻线程：Javascript引擎线程、界面渲染线程、浏览器事件触发线程。

> * Javascript引擎线程是基于事件驱动单线程执行的，JS引擎一直等待着任务队列中任务的到来，然后加以处理，浏览器在任何时候只有一个JS线程在运行JS程序。
> * 界面渲染线程负责浏览器界面的渲染，当界面需要重绘 `Repain` 或回流 `Reflow` 时，该线程就会执行。但需要注意界面渲染线程与JS引擎线程是互斥的，当JS引擎执行时界面渲染线程会被挂起，界面更新会被保存在一个队列中等到JS引擎线程空闲时再执行。
> * 事件触发线程，当一个事件被触发时该线程会把事件添加到待处理队列的队尾，等待JS引擎的处理。这些事件可来自Javascript引擎当前执行的代码块如 `setTimeout`、也可以是来自浏览器内核其他线程如鼠标点击、Ajax异步请求等，但由于JS是单线程的，所有这些事件都需要排队等待JS引擎处理。

js的单线程在这一段面试代码中尤为明显（理解即可，请不要尝试...浏览器会假死的）：

```javascript
var isEnd = true;
window.setTimeout(function () {
    isEnd = false;//1s后，改变isEnd的值
}, 1000);
//这个while永远的占用了js线程，所以setTimeout里面的函数永远不会执行
while (isEnd);
//alert也永远不会弹出
alert('end');
```

上面代码在浏览器中的任务队列如下图所示：
![](http://o6sbyl9mg.bkt.clouddn.com/15021010673972.png)


以下摘自《Javascript高级程序编程（第三版）》：

> * Javascript是运行于单线程环境中的，而定时器仅仅只是将计划代码在未来的某个时间执行。执行实际是不能保证的，因为在页面的生命周期中，不同时间可能有其他代码在控制Javascript进程。在页面下载完成后的代码运行、事件处理程序、Ajax回调函数都必须使用同样的线程来执行。实际上，浏览器负责进行排序，指派某段代码在某个时间点运行的优先级。
> * 定时器工作方式是，当特定时间过去后将回调代码插入到队列中。比如设置一个150ms后执行的定时器，表示代码会在150ms后被加入到队列中。如果在这个时间点上，队列中没有其他可执行代码，那么该回调代码就会被执行。

注意：定时器指定的时间间隔表示何时将定时器中的代码添加到队列中，而不是何时实际执行代码。


## setTimeout(fn,0)解析

我们再回过头来分析文章头部的代码：

```javascript
console.log(1)
setTimeout(function(){
  console.log(2)
},0)
console.log(3)
```

依据setTimeout运行机制，必须要等到当前脚本的同步任务和“任务队列”中已有的任务，全部处理完以后，才会执行setTimeout指定的任务。也就是说，setTimeout的真正作用是，在“任务队列”的现有事件的后面添加一个事件，规定在指定时间执行某段代码。setTimeout添加的事件，会在下一次 `Event Loop` 执行。

这里 `setTimeout(fn,0)` 将第二个参数设置为 `0`，作用是让 `fn` 在现有的任务（脚本的同步任务和“任务队列”中已有的任务）一结束就立刻执行。

实际上，参数 `0` 也无法准确到立刻执行任务队列，Jvascript定时器延时往往不准确，正因为如此，定时器不可用于测量实际时间。

> 关于 `Event Loop` 解释，可以阅读阮一峰老师的博客：http://www.ruanyifeng.com/blog/2013/10/event_loop.html

## setTimeout(fn,0)应用

### 调整事件发生顺序

用户自定义回调函数，有些时候会在浏览器默认动作之前发生。比如，用户输入框输入文本，keypress事件会在浏览器接受文本之前触发。因此，下面代码无法达到目的：

```javascript
document.getElementById('input').onkeypress = function(){
    this.value = this.value.toUpperCase()
}
```

上面代码想在用户输入后，立马将字符转换为大写。但实际上，它只能将上一个字符转为大写，因为浏览器此时没有真正接收到文本，所以 `this.value` 娶不到最新输入的那个字符。这里用 `setTimeout` 来改写成如下代码才能实现：

```javascript
document.getElementById('input').onkeypress = function (event) {
    var self = this;
    setTimeout(function(){
        self.value = self.value.toUpperCase()
    },0)
}
```

这也就解释了，为什么Vuejs生命周期函数 `mouted` 中操作DOM是无效的，必须通过 `$nextTick()` 函数来执行，通过阅读Vuejs中有关 [nextTick源码](https://github.com/vuejs/vue/blob/dev/src/core/util/env.js) 你会发现，其实它也利用了 `setTimeout(fn, 0)` 延迟执行来实现的。

### 分割耗时任务

setTimeout 一个很关键的用法就是分片，如果一段程序过大，我们可以拆分成若干细小的块。因此可以将那些计算量大、耗时长的任务，利用 `setTimeout(fn,0)` 进行分块，这样即使在复杂程序没有处理完时，页面还是能够相应，不至于卡死。代码如下：

```javascript
var div = document.getElementsByTagName('div')[0];
// 改写前
for(var i=0xA00000;i<0xFFFFFF;i++) {
  div.style.backgroundColor = '#'+i.toString(16);
}
// 改写后
var timer;
var i=0x100000;
function func() {
  timer = setTimeout(func, 0);
  div.style.backgroundColor = '#'+i.toString(16);
  if (i++ == 0xFFFFFF) clearInterval(timer);
}
timer = setTimeout(func, 0);
```

上述改写前代码，任务会一直占用当前线程，不会响应其他任务，会造成浏览器“阻塞”，而通过 `setTimeout(fn,0)` 改写后，修改背景色任务只会在当前脚本的同步任务和“任务队列”中任务执行完成后，才会执行。即：`可利用setTimeout实现这种伪多线程。`

## 起因

之所以会整理学习本文，是因为在一次跟大神 [@前端小武](https://xuexb.com/) 有关 `setTimeout(fn,0)` 用法上有一些歧义，个人解释的时候也不够清楚，存在一些迷惑，所以专门花时间收集整理了此文，来加强自己对于 `setTimeout(fn,0)` 的理解。

文章解释型文字比较多，不理解的地方可以反复阅读，也可以留言提问。

## 参考文献

* [Scheduling: setTimeout and setInterval](https://javascript.info/settimeout-setinterval#settimeout-0)
* [你所不知道的setTimeout](http://jeffjade.com/2016/01/10/2016-01-10-javacript-setTimeout/)
* [JavaScript下的setTimeout(fn,0)意味着什么？](http://www.cnblogs.com/silin6/p/4333999.html)






