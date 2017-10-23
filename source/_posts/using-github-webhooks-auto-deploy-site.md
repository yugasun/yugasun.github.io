---
title: 使用Github的webhooks进行网站自动化部署
desc: 本文主要介绍使用Github的webhooks进行网站自动化部署的具体方法
reward: true
date: 2017-07-12 14:42:34
tags:
  - Git
---

之前一直使用的是通过配置 `CNAME` 的方式将个人域名 `yugasun.com` 隐射到 `yugasun.github.io`，然后设置 `Github` page 服务，来实现hexo创建的静态博客。但是由于国内 `github` 有时不太稳定，而且也不方便做深入的访问统计，所以自己购买了一台 `VPS` 作为服务器，但是又闲每次博客更新需要登录服务器，更新博客，太繁琐，作为一名懒惰的程序员，于是想到用 `Github webhooks` 来实现。

> 懒惰 - 是这样一种品质，它使得你花大力气去避免消耗过多的精力。它敦促你写出节省体力的程序，同时别人也能利用它们。为此你会写出完善的文档，以免别人问你太多问题。

<!-- more  -->

## 关于 Github webhooks

[官方](https://developer.github.com/webhooks/) 关于 `Github webhooks` 的解释如下：

> Webhooks allow you to build or set up GitHub Apps which subscribe to certain events on GitHub.com.

提炼出来几点：

    * 必须是Github上的项目
    * 订阅了确定的事件，包括 push/pull 等命令
    * 自动触发事件

我的个人博客刚好符合这几个条件，那么接下来就是如何实现 `网站自动化部署`, 本文主要从下面几点来介绍：

    1. 编写自动化 `shell` 脚本
    2. 实现简单node服务
    3. 配置 nginx 代理
    4. 配置 github webhooks


## 编写自动化 `shell` 脚本

因为只需要实现 `git pull` 拉取代码和 `hexo generate` 生成静态文件两个命令，所以我们的 `auto_build.sh` 非常简单：

```shell
#! /bin/bash
SITE_PATH='/opt/www/blog'

cd $SITE_PATH
git reset --hard origin/hexo
git clean -f
git pull
git checkout hexo

# generate hexo generate
yarn && hexo generate
```

注意：在执行上面的 `shell` 脚本前，我们需要在服务器上 `git clone` 博客项目到 `/opt/www/blog` 目录中。想了解`shell` 脚本的基本知识，可以自行谷歌。


## 实现简单node服务

`Github webhooks` 需要跟我们的服务器通信，确保是可以将相关命令推送到我们的服务器的，所以会发送一个带有 `X-Hub-Signature` 的 `POST` 请求，为了方便我直接使用第三方库 [github-webhook-handler](https://github.com/rvagg/github-webhook-handler) 来接受参数并做事件监听处理等工作。

所以先安装 `github-webhook-handler`:

```bash
yarn add github-webhook-handler
```

然后编写node服务器入口文件 `bloghook.js`，可以直接参考 `github-webhook-handler` 官方demo:

```javascript
var http = require('http')
var spawn = require('child_process').spawn
var createHandler = require('github-webhook-handler')

// 下面填写的 myscrect 跟github webhooks配置一样；
// path是我们访问的路径
var handler = createHandler({ path: '/auto_build', secret: 'myscrect' })

http.createServer(function (req, res) {
  handler(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location: ' + err.message)
  })
}).listen(9527)
handler.on('error', function (err) {
  console.error('Error:', err.message)
})
// 监听到push事件的时候执行我们的自动化脚本
handler.on('push', function (event) {
  console.log('Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref)
  runCommand('sh', ['./auto_build.sh'], function (txt) {
    console.log(txt)
  })
})
function runCommand (cmd, args, callback) {
  var child = spawn(cmd, args)
  var response = ''
  child.stdout.on('data', function (buffer) { response += buffer.toString() })
  child.stdout.on('end', function () { callback(response) })
}
```

因为我的服务器是使用 [pm2](https://github.com/Unitech/pm2) 来管理node服务的，所以直接开启上面编写的node服务：

```bash
pm2 start bloghook.js
```

## 配置 nginx 代理

```conf
server {
    listen          80;
    server_name     yugasun.com www.yugasun.com;
    location / {
        root        /opt/www/blog/public;
        index       index.html;
    }

    location /auto_build {
        proxy_pass http://127.0.0.1:9527;
    }
}
```

## 配置 `Github webhooks`

进入 github 上的博客项目，点击右边的 `Settings` Tab, 找到 `Webhooks` 选项， 然后点击 `Add webhooks`，填写 `Payload URL` 和 `Secret`, 如下：
![](https://static.yugasun.com/14998443006618.jpg)

注意：这里的 `Secret` 配置就是上面 node 服务中填写的 `mysecret` 变量。

## 验证

绑定成功后，我们可以尝试提交一下代码，然后在 `Github` 的 `Webhooks` 选项中查看是否自动触发了接口，如下图：
![](https://static.yugasun.com/14998448824107.jpg)

## 总结

以上就是使用 `Github` 的 `webhooks` 进行网站自动化部署的全部内容，但是还是有局限性的，那就是必须依赖 `github`, 一般选择的都是免费的github账号，所有项目都是public的，如果有些敏感项目不适合公开，那就需要购买服务账号，或者自己构建gitlab服务了。