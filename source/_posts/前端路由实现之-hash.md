---
title: 前端路由实现 - hash篇
reward: true
date: 2017-06-13 11:33:49
tags: 
  - Javascript
  - router
---

## 背景介绍

许多前端框架 `angular，vue，react` 他们都有各自的路由系统，管理着前端的页面视图切换，如果想了解其原理，最好方法就是手动实现一个。
`SPA`的前端路由有2种实现方式:

* 一种是HTML5推出的 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History)
* 另一种 `hash` 路由，就是常见的 `#` 号，这种方式兼容性更好。

<!-- more -->

## 需求分析

这里基于ES6 class声明的方式，实现的一个简单的路由类 `SPARouter` 包含以下功能：

 1. 基本hash路由功能
 2. 异步加载js组件，同步加载组件
 3. 组件传参
 4. 路由钩子函数：beforeEach()、afterEach()

## 实现步骤

1. 切换页面：hash路由切换是不会刷新页面的，浏览器有个全局变量 `location` 下有个属性值叫 `hash`，每当 `hash` 的值改变时，就会触发 `hashchange` 事件，所以我们可以通过监听 `hashchange` 事件来切换我们的页面。监听代码如下：

    ```javascript
    // 页面初始化时是没有hashchange时间的，但是如果hash值匹配到相应的路由，我们也需要更新页面
    window.addEventListener('load', () => {
      console.log('load')
      this.routeUpdate();
    });
   // 监听hash变化，来切换页面
    window.addEventListener('hashchange',function(){
    	console.log('hashchange')
      this.routeUpdate();
    })
    ```

2. 注册路由：初始化全局路由对象的时候，需要先定于路由规则，这样页面才会知道如何根据hash变化来切换界面。

    ```javascript
    /* 
     * 注册函数
     * routes变量是要在创建我们的路由类时传入构造函数的参数，
     * 它是一个数组，它的元素就是我们定义的没每个路由对象，
     * path - 路由路径
     * filename - js组件存储路径
     * initFunc - 可缺省，如果未定义filename属性，则可通过定义此函数来初始化该路由视图
     */ 
    var routes = [
        {
            path: '/index',
            filename: 'components/index.js'
        },
        //...
    ] 
    ```

3. 创建router对象实例, 将路由规则传入。
 
    ```javascript
    var router = new SPARouter(routes)
    ```
    
4. 从页面url中获取hash路由：

    ```javascript
    getHashRoute() {
        let hashDetail = window
          .location
          .hash
          .split('?');
        let hashName = hashDetail[0].split('#')[1];
        let params = hashDetail[1]
          ? hashDetail[1].split('&')
          : [];
        let query = {};
        params.map((item) => {
          let temp = item.split('=');
          query[temp[0]] = temp[1];
        });
    
        return {path: hashName, query: query};
    }
    ```
    
5. 匹配到相应的路由规则，更新路由视图

```javascript
routeUpdate() {
    let currentHash = this
     .utils
     .getHashRoute();
    this.currentRoute.query = currentHash['query']
    this
     .routers
     .map((item) => {
       if (item.path === currentHash.path) {
         this.currentRoute = item;
         this.refresh();
       }
     });
    if (!this.currentRoute.path) {
     location.hash = '/index';
    }
}
```

5. 异步加载js：一般单页面应用为了性能优化，都会把各个页面的文件拆分开，按需加载，所以路由里面要加入异步加载js文件的功能。异步加载我们就采用最简单的原生方法，创建script标签，动态引入js。

```javascript
loadComponent() {
    let self = this;
    if (this.currentRoute.filename) {
        var _body = document.getElementsByTagName('body')[0];
        var scriptEle = document.createElement('script');
        scriptEle.src = self.currentRoute.filename;
        scriptEle.async = true;
        scriptEle.type = 'text/javascript';
        window.SPA_ROUTE_INIT = null;
        scriptEle.onload = () => {
          self.afterFunc && self.afterFunc(self.currentRoute);
          self.currentRoute.fn = window.SPA_RESOLVE_INIT;
          self
            .currentRoute
            .fn(self.currentRoute);
        }
        _body.appendChild(scriptEle);
    } else {
        // 未定义
        if (self.currentRoute.initFunc) {
          self
            .currentRoute
            .initFunc(self.currentRoute);
            self.afterFunc && self.afterFunc(self.currentRoute);
        } else {
          console.trace('该路由定义出错，filename 和 initFunc 必须定义一个')
        }
    }
}	
```

6. 参数传递：在我们动态引入单独模块的js之后，我们可能需要给这个模块传递一些单独的参数。这里借鉴了一下jsonp的处理方式，我们把单独模块的js包装成一个函数，提供一个全局的回调方法，加载完成时候再调用回调函数。

    ```javascript
    SPA_RESOLVE_INIT = function ($router) {
        document
    	.getElementById("content")
    	.innerHTML = `<p style="color:#099fde;">当前异步渲染首页${$router.path}</p>`
        console.log($router);
    }
    ```
    
7. **扩展：**我们已经完成了基本功能，我们再进行扩展，实现路由钩子函数 `beforeEach` 和 `afterEach`。

    ```javascript
    beforeEach(callback) {
        if (Object.prototype.toString.call(callback) === '[object Function]') {
            this.beforeFunc = callback;
        } else {
            console.trace('路由切换前钩子函数不正确')
        }
    }
    afterEach(callback) {
        if (Object.prototype.toString.call(callback) === '[object Function]') {
            this.afterFunc = callback;
        } else {
            console.trace('路由切换后钩子函数不正确')
        }
    }    
    ```
    
这样我们就完成了一个简单的hash路由了，可以将其应用到实际的SPA项目，快乐的玩耍了，不过还是有很多不完备的地方，感兴趣的可以继续完善，使其变得更加健壮。

**运行效果图**  
![](http://o6sbyl9mg.bkt.clouddn.com/14973245321228.jpg?attname=&e=1497328179&token=U66r3n2i5yp6BFinWLOReh8Ixk7rAxs8Cv6DEYiB:CwSXP-Sepb7ZXGD-QMGUrrl3Xug)

下一篇将介绍如何利用HTML5的 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) 来实现 `history` 模式的路由，尽请期待~。

最后附上，完整的 [DEMO](https://github.com/yugasun/SPARouter.git)