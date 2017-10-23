---
title: 前端路由实现 - history篇
desc: 前端基于history路由的实现原理
reward: true
date: 2017-06-15 16:37:58
tags:
  - Javascript
  - router
---

在上一篇 [前端路由实现-hash篇](http://www.yugasun.com/2017/06/13/%E5%89%8D%E7%AB%AF%E8%B7%AF%E7%94%B1%E5%AE%9E%E7%8E%B0-hash%E7%AF%87/) 已经介绍了如何通过hash的方式来实现前端路由，这一篇将在此基础上增加 `history` 路由的方式，想要实现此功能，必须先了解 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History)。

## History API

[官方 History API](https://developer.mozilla.org/en-US/docs/Web/API/History) 已经讲得很清楚了，我这里主要列举出来，方便参考。

History API 是HTML5新增的历史记录API，它可以实现无刷新的更改地址栏链接，简单讲，就是当页面为 `yugasun.com`, 执行Javascript语句：

<!--more-->

```javascript
window.history.pushState(null, null, '/about');
```

之后，地址栏地址就会变成 `yugasun.com/about`, 但浏览器不会刷新页面，甚至不会检测目标页面是否存在。



### History对象属性

|        属性                | 只读   |    描述
| -----------------         | ------  | -----------
| History.length            |  是     |  返回一个整数，该整数表示会话历史中元素的数目，包括当前加载的页。例如，在一个新的选项卡加载的一个页面中，这个属性返回1。
| History.scrollRestoration |         |  允许Web应用程序在历史导航上显式地设置默认滚动恢复行为。此属性可以是自动的（auto）或者手动的（manual）。
| History.state             |  是     |  返回一个表示历史堆栈顶部的状态的值。这是一种可以不必等待popstate 事件而查看状态而的方式。

### History对象方法

|        方法             |            描述
| --------------------   | ------------------
| History.back()         |  返回到上一条history记录，等同于： history.go(-1);
| History.forward()      |  前进到吓一跳history记录，等同于： history.go(1);
| History.go()           |  加载history中存储的指定标识的记录，以当前记录为基准0，下一条为1，上一条为-1，一次类推。
| History.pushState()    |  将指定的记录push到 history记录栈中。三个参数分辨为： state object - 状态对象，title - 火狐浏览器已经忽略此参数，一般传入null值，URL - 新的历史记录的地址。
| History.replaceState() |  替换当前的历史记录, 参数同pushState一致



## 实现原理

* 通常点击页面a链接，页面会刷新跳转，所以需要监听页面所有a链接点击事件，并阻止默认事件, 然后调用 `history.pushState()` 方法来实现路由切换

> 当活动历史记录条目更改时，将触发 [popstate](https://developer.mozilla.org/zh-CN/docs/Web/Events/popstate) 事件, 需要注意的是，调用 `history.pushState()` 和 `history.replaceState()` 不会触发 `popstate` 事件。只有在做出浏览器动作时，才会触发该事件，如用户点击浏览器的回退/前进按钮。

## 代码实现

1.给上一篇中实现的 `SPARouter` 类构造函数添加一个参数 `mode`(默认为 `hash`), 如果传入值为 `history` 时， 我们就采用 `history` 路油方式。

    ```javascript
    constructor(el, routers, mode) {
        this.mode = mode || 'hash';
        //...
    }
    ```

2.给window的`popstate`添加事件监听，给所有 `a` 链接添加 `click` 事件监听

    ```javascipt
      initEvent() {
        window.addEventListener('load', () => {
          console.log('load')
          this.routeUpdate();
        });
        if (this.mode === 'history') {
          window.addEventListener('popstate', (e) => {
            console.log('popstate')
            this.routeUpdate();
          });
          // 禁用所有a 链接默认跳转事件
          let self = this;
          document.addEventListener('click', function (e) {
            let target = e.target || e.srcElement;
            if (target.tagName === 'A') {
              e.preventDefault(); // 这里阻止默认事件
              let href = target.getAttribute('href');
              let path = href.split('?')[0];
              window
                .history
                .pushState({
                  path: path
                }, null, href);
              self.routeUpdate();
            }
          })
        } else {
          window.addEventListener('hashchange', () => {
            console.log('hashchange')
            this.routeUpdate();
          });
        }
      }
    ```

3.新增获取当前 `history state` 方法:

    ```javascript
    getHistoryRoute() {
        // 默认第一次加载时，获取不到state值，这里需要兼容处理
        let path = (window.history.state && window.history.state.path) || '';
        let queryStr = window
          .location
          .hash
          .split('?')[1];
        let params = queryStr
          ? queryStr.split('&')
          : [];
        let query = {};
        params.map((item) => {
          let temp = item.split('=');
          query[temp[0]] = temp[1];
        });
        return {path: path, query: query};
    }
    ```

4.对路由更新方法 `routerUpdate` 添加 `mode` 条件判断

    ```javascript
    routeUpdate() {
        let getLocation = this.mode === 'history'
          ? this.utils.getHistoryRoute
          : this.utils.getHashRoute;
        let currentLocation = getLocation();
        this.currentRoute.query = currentLocation['query']
        this
          .routers
          .map((item) => {
            if (item.path === currentLocation.path) {
              this.currentRoute = item;
              this.refresh();Ï
            }
          });
        if (!this.currentRoute.path) {
          if (this.mode === 'history') {
            window
              .history
              .pushState({
                path: '/index'
              }, null, '/index');
            this.routeUpdate();
          } else {
            location.hash = '/index';
          }
        }
    }
    ```

做完以上更新后，我们的 `SPARouter` 类就实现了 `history` 路由功能了，然后将页面中链接中删除 `#`，然后实例化 `SPARouter` 时添加第三个参数为 `history`， 如下：

```javascript
var router = new SPARouter(el, routes, 'history');
```

**运行效果图** 
![](https://static.yugasun.com/14975153191670.gif?attname=&e=1497518956&token=U66r3n2i5yp6BFinWLOReh8Ixk7rAxs8Cv6DEYiB:38Thr9f-I-ztliBOV6tskv_CAoA)




