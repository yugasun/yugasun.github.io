---
title: 异步编程之 Promise
desc: 异步编程方法的简介，以及 Promise 的基本用法介绍
reward: true
date: 2017-06-29 18:24:15
tags:
  - Javascript
---

Promise 是 Javascript 异步操作的解决方案，介绍Promise之前，先对异步操作做一个介绍。

## Javascript 的异步执行

### 1. 概述

Javascript语言的执行环境是“单线程”的，也就是一次只能完成一个任务。如果有多个任务，就必须按照队列顺序来执行。这种模式的好处是 _实现起来简单，执行环境相对单纯_，坏处是 _只要有一个任务耗时很长，就会阻塞整个进程_ ，通常会造成浏览器无响应（假死）。

Javascript语言本身并不慢，慢的是读写外部数据，最常见的是等待一个Ajax请求返回结果，等待的时候，如果服务器无响应，或者网络慢，就会导致脚本长时间等待停滞。

<!--more-->

为了解决这个问题，Javascript语言将任务分为 `同步 Synchronous` 和 `异步 Asynchronous`。`同步模式` 就是传统做法，所有任务按照队列依次执行。`异步模式` 则不同，每个任务分为两段，第一段包含对数据的请求，第二段被写成一个回调函数来对请求数据处理。第一段数据请求代码执行完，不是立即执行第二段代码，而是将程序执行权交给下一个任务。等到数据请求返回结果后，再由系统通知执行第二段处理数据代码。所以，程序的执行顺序与任务的顺序是不一致的、异步的。

以下是总结异步编程的几种方法：

### 2. 回调函数

回调函数是异步编程的最基本方法。

假设有两个函数 `f1` 和 `f2`, `f2` 必须在 `f1` 执行完之后执行，那么就可以将 `f2` 作为 `f1` 的回调函数：

```javascript
function f1(callback){
    // do somthing
    
    callback();
}
function f2(){
    // do something
}
f1(f2);
```

回调函数的优点是简单、容易理解和部署，缺点是不利于代码的阅读和维护，高耦合，使得程序结构混乱、流程难以追踪，很容易造成回调地狱，而每个任务只能指定一个回调函数。

### 3. 事件监听

另一种思路是采用事件驱动模式，任务的执行并不取决于代码的顺序，而是依赖于某个事件触发的。还是以 `f1` 和 `f2`为例，为 `f1` 绑定一个事件,当 `f1` 执行完后触发 `done` 事件，然后会执行 `f2`

```javascript
function f1(){
    // do something 
    f1.trigger('done');
}
function f2(){
    // do something
}
f1.on('done', f2);
```

事件监听也比较容易理解，可以绑定多个事件，每个事件可以指定多个回调函数，而且很好地 `去耦合`，有利于实现模块化。缺点是整个程序都要改写成事件驱动型，运行流程会变得很模糊。

### 4. 发布/订阅

`事件` 可以理解为 `信号`，我们可以设置一个信号中心，某个任务执行完成，就向信号中心 `发布 publish` 一个信号，其他任务可以向信号中心 `订阅 subscribe` 某个信号，从而知道什么时候开始执行。这就是 `发布/订阅模式 publish-subscribe pattern`, 又称 `观察者模式 observer pattern`。以下是用jQuery来举例：

```javascript
function f1(){
    // do something
    jQuery.publish('done');
}
function f2(){
    // do something
}
// 订阅
jQuery.subscribe('done', f2);
// 取消订阅
jQuery.unsubscribe('done', f2);
```

这种方法的性质与 `事件监听类似`，但是明显优于后者，因为可以通过查看 `消息中心`，了解存在多少信号、每个信号有多少订阅者，从而监控程序运行。

## 异步操作的流程控制

如果有多个异步操作，就存在一个流程控制问题：确定操作执行顺序，以后如何保证遵守这种顺序。

```javascript
function async(arg, callback){
    console.log('参数为 ' + arg + ' , 1秒后返回结果');
    setTimeout(function(){ callback(arg * 2); }, 1000);
}
```

上面的这个 `async` 函数是一个异步任务，每次执行需要1秒，然后再执行回调函数。如果有6个这样的任务，全部执行完成后，才能执行 `final` 函数，简单实现如下：

```javascript
function final(value) {
  console.log('完成: ', value);
}
async(1, function(value){
  async(value, function(value){
    async(value, function(value){
      async(value, function(value){
        async(value, function(value){
          async(value, final);
        });
      });
    });
  });
});
```

可以看到，当异步回调越来越多，嵌套层次也会越来越深，不仅写起来麻烦，容易出错，也很难维护。

### 1. 串行执行

为了解决嵌套问题，可以编写一个流程控制函数，通过队列的方式，一个任务执行完成再执行另一个任务，即 `串行执行`，如下：

```javascript
var items = [ 1, 2, 3, 4, 5, 6];
var results = [];

function series(item){
    if(item){
        async(item, function(result){
            results.push(result);
            return series(items.shift());
        });
    } else {
        return final(results);
    }
}
series(items.shift());
```

### 2. 并行执行

也可以让所有的任务同时执行，等到全部完成以后，再执行final函数：

```javascript
var items = [ 1, 2, 3, 4, 5, 6];
var results = [];

items.forEach(function(item){
    async(item, function(result){
        results.push(result);
        if( results.length === items.length ){
            final(results);
        }
    });
});
```

并行执行的好处是效率较高，比起串行执行，较为节省时间，但是问题在于，如果并行任务较多，容易耗尽系统资源，拖慢执行速度，因此有了第三种流控制方式 `并行与串行结合`

### 3. 并行与串行结合

所谓并行与串行结合，就是设置一个任务上限，每次最多只能并行执行 n 个异步任务，这样就避免过分占用系统资源。

```javascript
var items = [ 1, 2, 3, 4, 5, 6];
var results = [];
var running = 0;
var limit = 2;

function launcher(){
    while( running < limit && items.length > 0 ){
        var item = items.shift();
        async(item, function(result){
            results.push(result);
            running--;
            if( items.length > 0 ){
                launcher();
            } else if(running == 0）{
                final(results); 
            }
        }); 
        running++;
    }
}
```

上面代码中，限制了最多可执行异步任务，变量 `running` 记录当前正在运行的任务数，只要低于任务上限，就再启动新的任务，如果running等于0，表示所有任务执行完成，此时就执行final函数。

## Promise对象

> Promise对象是CommonJS工作组提出的一种规范，目的是为一步操作提供 [统一接口](http://wiki.commonjs.org/wiki/Promises/A)。

首先它是一个Javascript对象，用法跟普通javascript对象没有区别，其次它起到代理（proxy）作用，充当异步操作与回调函数之间的中介。它使得异步操作具备同步操作的接口，使得程序具备正常的同步运行流程，回调函数不必再一层层嵌套。简单说，它的思想是，每一个异步任务返回一个Promise对象，由于是立刻返回，所以可以采用同步操作的流程，这个Promise对象拥有then、catch等方法，允许指定回调函数，在异步任务完成后调用。

比如，异步操作 `f1` 返回一个 Primise对象，它的回调函数 `f2` 写法如下：

```javascript
(new Promsie(f1)).then(f2);
```

这种写法对于多层嵌套回调尤其方便：

```javascript
// 传统写法
step1(function (value1) {
  step2(value1, function(value2) {
    step3(value2, function(value3) {
      step4(value3, function(value4) {
        // ...
      });
    });
  });
});

// Promises的写法, 程序执行流程一目了然，十分易读
(new Promise(step1))
  .then(step2)
  .then(step3)
  .then(step4);
```

### 1. Promise 接口

前面说过，Promise接口的基本思想是，异步任务返回一个Promise对象。

Promise对象只有三种状态：

> 1. 未完成 - pending
> 2. 已完成 - fulfilled
> 3. 失败 - rejected

初始状态为 `pending` 一旦状态发生变化，将不可逆，即变换成 `rejected` 或 `fulfilled`。

Promise对象使用 `then` 方法添加回调函数。`then` 方法可以接受两个回调函数，第一个是异步操作成功时（变为 `fulfilled`状态）时的回调函数，第二个是异步操作失败（变为 `rejected`状态）时的回调函数（可省略）。
用法如下：

```javascript
po
    .then(step1)
    .then(step2)
    .then(step3)
    .then(
        console.log,
        console.error
    );
```

上面代码中  `po` 为新建的Promise对象，因为 `then` 返回的是Promise对象 po，所以可以如上链式调用。`po` 状态一旦变为 `fulfilled`，就会继续执行紧接着的 `then` 指定的回调函数，每一步必须等到前一步完成。只要有任何一个任务执行失败，状态变为 `rejected`,就会停止执行之后的 `then` 回调函数, 直接执行接下来第一个操作失败的回调函数，也就是上面代码的 `console.error`；

### 2. Promise 对象的生成

ES6提供了原生Promise构造函数，用来生成Promise实例。如下：

```javascript
var promise = new Promise(function(resolve, reject){
    // 异步操作代码
    if( /* 异步操作成功 */ ){
        resolve(value);
    } else {
        reject(error);
    }
});
```

Promise 构造函数接受一个函数作为参数，该函数有两个参数：`resolve` 和 `reject`。

* `resolve` 函数作用是，将Promise对象的状态从 `pending` -> `fulfilled`，在异步操作成功时调用，并将异步操作的结果，作为参数传递出去；
* `reject` 函数作用是，将Promise对象状态从 `pending` -> `rejected`，在异步操作失败时调用，并将异步操作报出的错误，作为参数传递出去。

reject 传递的错误可以用 `then` 方法的第二个回调函数接受处理，也可以用 `catch` 方法统一处理，如下

```javascript
promise.then(step1)
        .then(step2)
        .then(step3)
        .catch(function(e){
        
        });
```

### 3. 高级方法 `Promise.all` 和 `Promise.race`

`Promise.all(iterable)` 返回一个新的Promise对象，接受的是一个数组队列参数，队列中所有的异步任务执行成功时，这个新的Promise对象才会触发成功，一旦队列中有任何一个任务执行失败，就会立即触发该对象的失败。这个新的promise对象在触发成功状态以后，会把一个包含iterable里所有promise返回值的数组作为成功回调的返回值，顺序跟iterable的顺序保持一致；如果这个新的promise对象触发了失败状态，它会把iterable里第一个触发失败的promise对象的错误信息作为它的失败错误信息。Promise.all方法常被用于处理多个promise对象的状态集合。

`Promise.race(iterable)` 返回一个新的Promise对象，接受的是一个数组队列参数，队列里任意一个基于promise的异步任务执行成功或失败后，父promise马上也会用子promise的成功返回值或失败详情作为参数调用父promise绑定的相应句柄，并返回该promise对象。

概念有些拗口，直接上实例吧：

```javascript
// ajax1, ajax2, ajax3分别为三个基于promise的异步请求
Promise.all([ajax1, ajax2, ajax3])
.then(function(result){
    // 返回result为一个数组[result1, result2, result3]
    // result1, result2, result3分别为ajax1，ajax2， ajax3执行成功返回结果。
})
.catch(function(err){
    // err为ajax1, ajax2, ajax3中任意一个执行失败返回的结果
});
```

```javascript
// ajax1, ajax2, ajax3分别为三个基于promise的异步请求
Promise.race([ajax1, ajax2, ajax3])
.then(function(result){
    // 返回result为ajax1, ajax2, ajax3中执行最快成功的那个任务的返回结果
})
.catch(function(err){
    // err为ajax1, ajax2, ajax3中执行最快失败返回的结果
});
```

## Promise 的应用

加载图片：

```javascript
var preloadImage = function(path){
    return new Promise(function(resolve, reject){
        var image = new Image();
        image.onload = resolve;
        image.onerror = reject;
        image.src = path;
    }
}
preloadImage.then(function(){
    // 图片相关操作
});
```

Ajax操作：

```javascript
function search(term){
    var url = "http://example.com/search?q=" + term;
    var xhr = new XMLHttpRequest();
    var result;
    
    var promise = new Promise(function(resolve, reject){
        xhr.open('GET', url, true);
        xhr.onload = function(e){
            if( this.status === 200 ){
                result = JSON.parse(this.responseText);
                resolve(result);
            }
        };
        xhr.onerror = function(e){
            reject(e);
        };
        xhr.send();
    });
    return promise;
}
```

## ES5的简单实现

直接奉上 [ES5实现源码](https://github.com/yugasun/JsLearning/blob/master/promise.html)

## 小结

Promise 对象优点在于，让回调函数变成规范的链式写法，程序流变得更加清晰，它一整套的接口可以实现许多强大的功能，比如为多个一步操作部署一个回调函数、为多个回调函数中抛出错误统一指定处理方法等。而且，它还有一个前面三种方法都没有的好处：如果一个任务已经完成，再添加回调函数，该毁掉函数会立即执行，所以，你不用担心是否错过某个事件或信号。

## 参考链接

[1] [Promise - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
[2] [Promise对象-- JavaScript 标准参考教程(alpha)](http://javascript.ruanyifeng.com/advanced/promise.html)







