---
title: 前端开发中接口跨域解决方案探索
date: 2017-03-01 15:49:46
reward: true
tags: 
 - Webpack
 - NodeJs
 - Vuejs
---

前后端分离大家并不陌生，项目开发中，每当前端拿到后端给我的接口，联调的时候，往往前端代码和后端接口是不同源的，所以跨域是不可避免的。  
而作为一名优秀的前端工程师，怎么会忍受卑躬屈漆的找后端同学，帮忙在接口请求前多添加一行代码,将 `Access-Control-Allow-Origin` 设置为我们前端想要的呢？毛爷爷也曾教育我们: 
> 自己动手，丰衣足食

***注：以下配置均基于vue-cli脚手架构建的webpack项目。***

<!-- more --> 

好吧，废话不多说，聊聊目前个人项目中使用的一些方案：
 
## 使用express的中间件

[http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) 是一个基于nodejs的http代理中间件，那么如何集成到webpack构建的项目呢，使用 [vue-cli](https://github.com/vuejs/vue-cli) 构建webpack项目后，细心的同学会发现，在文件 `config/index.js` 中有个配置项 `proxyTable` ,如下：

```javascript
module.exports = {
  //...
      dev: {
        //...
        proxyTable:{}
        //...
      }
  //...
}

```

通过查阅 [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) API可以配置修改如下：

```javascript
module.exports = {
  //...
    dev: {
    //...
    proxyTable:{
      '/interface': {
        target: 'http://xxx.xxx.xxx.xxx:8000',
        changeOrigin: true,
        pathRewrite:{
        '^/interface': '/interface'
        }
      }
    }
    //...
    }
  //...
}
```

`proxyTable` 中的配置规则是, `key` - `接口url` , `value` - `接口路由相关配置` , `value` 中的解释如下：
```$xslt
target - 所要代理到的实际接口地址
changeOrigin - 如果设置为true,本地会开启node服务接收本地请求并代理请求接口，这样就不会有跨域问题了，仅适用于开发环境
pathRewrite -  重新target接口的url地址
```

如此配置后，你的本地环境接口只需要直接请求类似 `/inerface/list?p=1` 的url了，具体实现机制，可以参看 [vue-cli](https://github.com/vuejs/vue-cli) 构建的webpack项目和 [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) 相关API.

## 基于express编写nodejs服务

此方案的前提是你有 [express](http://expressjs.com/) 相关基础知识。

实现步骤如下：
1. 在项目根目录下创建server目录，并在目录中新建app.js文件
2. 编写express代理服务。

直接上 `server/app.js` 代码：

```javascript
var express = require('express');
var app = express();
var request = require('request');
var server = app.listen(3001, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
/**
 * add test server data proxy
 */
app.all('*', function(req, res, next) {
  res.append('Access-Control-Allow-Origin', '*');
  // next()
  var url = 'http://192.168.9.240:8000/interface' + req.url;
  req.pipe(request(url)).pipe(res)
});
/**
 * 以下为自定义路由服务
 */
app.get('/', function(req, res) {
  res.send('Hello World!');
});
app.get('/log_info', function(req, res) {
  res.json({
    "msg": "",
    "logdate": {
      "start": "2014-09-01",
      "end": "2015-02-08",
      "last": 160,
      "enrollment_start": "2014-11-12"
    },
    "success": true
  });
});
// 课程列表
app.get('/teacher_permission', function(req, res) {
  res.json(require('./mock/top_course_list.json'));
})
//...
```

核心代码是：

```javascript
res.append('Access-Control-Allow-Origin', '*');
var url = 'http://192.168.9.240:8000' + req.url;
req.pipe(request(url)).pipe(res)
```

这里第一行代码，可以看到我们为自己的express服务设置了 `Access-Control-Allow-Origin` 为 `*` 接着通过 [request](https://github.com/request/request) 模块来远程请求我们转换后的 *api* 地址。然后将结果返回。
这里还有个mock数据的功能，顺便提一下，上面 `server/app.js` 代码中 如果注释调 15、16行，开启14行，就可以自定义你的任何接口数据了，代码中列出了三种方式：
1. `res.send` 直接返回文本.
2. `res.json(obj)` 返回自定义json接口的数据。
3. `res.json(require(/path/xxx.json))` 引用定义好的json文件。
 
## 总结

如果阅读阅读 [vue-cli](https://github.com/vuejs/vue-cli) 构建的webpack项目，可以发现，其实 [webpack中间件](#使用webpack的中间件) 方案也是基于 [express](http://expressjs.com/) 服务的，代码请自行阅读 `build/dev-server.js`。
对于方案一适用于开发环境快速的实现跨域，方案二则显得更加的强大，无论是开发环境还是生产环境都可以使用，只需要灵活掌握基于 [express](http://expressjs.com/) 的node服务相关技巧。
当然对于传统的跨域方式，本文不做讨论，大家可以参考segmentfault上的文章 [详解js跨域问题](https://segmentfault.com/a/1190000000718840) 。这里卖一个关子，大家都知道，对于前端而言，如果开启一个webpack-dev-sever服务的时候，经常会遇到报错，需要 `ctrl + c` 终止当前服务，重新手动开启，显得有些笨拙，大家有没有想过如果webpack-dev-server服务能自动重启，是不是可以节约我们很多这种重复操作的时间呢？
答案是肯定的。 
> 预知后事如何，且听下回分解


  
本文到此为止，当然大家如果有更好的前端开发中接口跨域解决方案，希望能评论回复，或者给我发邮件，以便能够更好的补充本文。

PS: 春天来了，万物复苏，森林里的动物也到了交配的季节。。。




