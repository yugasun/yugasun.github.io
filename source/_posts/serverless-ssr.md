---
title: 前端福音：Serverless 和 SSR 的天作之合
desc: Serverless 实践系列文章，Serverless 和 SSR 的天作之合
reward: true
date: 2020-06-09 16:32:19
tags:
  - Serverless
  - Serverless-Practice
---

## 什么是 SSR

SSR 顾名思义就是 `Server-Side Render`, 即服务端渲染。原理很简单，就是服务端直接渲染出 HTML 字符串模板，浏览器可以直接解析该字符串模版显示页面，因此首屏的内容不再依赖 Javascript 的渲染（CSR - 客户端渲染）。

<!--more-->

SSR 的核心优势：

1. 首屏加载时间：因为是 HTML 直出，浏览器可以直接解析该字符串模版显示页面。
2. SEO 友好：正是因为服务端渲染输出到浏览器的是完备的 html 字符串，使得搜索引擎
   能抓取到真实的内容，利于 SEO。

SSR 需要注意的问题：

1. 虽然 SSR 能快速呈现页面，但是在 UI 框架（比如 React）加载成功之前，页面是没法进行 UI 交互的。
2. TTFB (Time To First Byte)，即第一字节时间会变长，因为 SSR 相对于 CSR 需要在服务端渲染出更对的 HTML 片段，因此加载时间会变长。
3. 更多的服务器端负载。由于 SSR 需要依赖 Node.js 服务渲染页面，显然会比仅仅提供静态文件的 CSR 应用需要占用更多服务器 CPU 资源。以 React 为例，它的 `renderToString()` 方法是同步 CPU 绑定调用，这就意味着在它完成之前，服务器是无法处理其他请求的。因此在高并发场景，需要准备相应的服务器负载，并且做好缓存策略。

## 什么是 Serverless

Serverless，它是云计算发展过程中出现的一种计算资源的抽象，依赖第三方服务，开发者可以更加专注的开发自己的业务代码，而无需关心底层资源的分配、扩容和部署。

特点：

1. 开发者只需要专注于业务，无需关心底层资源的分配、扩容和部署
2. 按需使用和收费
3. 自动扩缩容

更详细的有关 Serverless 介绍，推荐阅读：[精读《Serverless 给前端带来了什么》](https://zhuanlan.zhihu.com/p/58877583)

## Serverless + SSR

结合 Serverless 和 SSR 的特点，我们可以发现他们简直是天作之合。借助 Serverless，前端团队无需关注 SSR 服务器的部署、运维和扩容，可以极大地减少部署运维成本，更好的聚焦业务开发，提高开发效率。

同时也无需关心 SSR 服务器的性能问题，理论上 Serverless 是可以无限扩容的（当然云厂商对于一般用户是有扩容上限的）。

## 如何快速将 SSR 应用 Serverless 化？

既然说 Serverless 对于 SSR 来说有天然的优势，那么我们如何将 SSR 应用迁移到Serverless 架构上呢？

本文将以 Next.js 框架为例，带大家快速体验部署一个 Serverless SSR 应用。

借助 Serverless Framework 的 [Nextjs 组件](https://github.com/serverless-components/tencent-nextjs/tree/v2)，基本可以实现无缝迁移到腾讯云的 SCF 上。

#### 1. 初始化 Next.js 项目

```bash
$ npm init next-app serverless-next
$ cd serverless-next

# 编译静态文件
$ npm run build
```

#### 2. 全局安装 serverless cli

```bash
$ npm install serverless -g
```

#### 3. 配置 serverless.yml

```yaml
org: orgDemo
app: appDemo
stage: dev
component: nextjs
name: nextjsDemo

inputs:
  src: ./
  functionName: nextjsDemo
  region: ap-guangzhou
  runtime: Nodejs10.15
  exclude:
    - .env
  apigatewayConf:
    protocols:
      - https
    environment: release
```

#### 4. 部署

部署时需要进行身份验证，如您的账号未 `登录` 或 `注册` 腾讯云，您可以直接通过 `微信` 扫描命令行中的二维码进行授权登陆和注册。当然你也可以直接在项目下面创建 `.env` 文件，配置腾讯云的 `SecretId` 和 `SecretKey`。如下：

```dotenv
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

执行部署命令：

```bash
$ serverless deploy
```

> 以下 `serverless` 命令全部简写为 `sls`.

部署成功后，直接访问 API 网关生成的域名，这里是就可以了。

> 类似 `https://service-xxx-xxx.gz.apigw.tencentcs.com/release/` 这种链接。

#### 现有 Next.js 应用迁移

如果你的项目是基于 Express.js 的自定义 Server，那么需要在项目根目录新建 sls.js 入口文件，只需要将原来启动 Node.js Server 的入口文件复制到 sls.js 中，然后进行少量改造就好，默认入口 `sls.js` 文件如下：

```js
const express = require('express');
const next = require('next');
const app = next({ dev: false });
const handle = app.getRequestHandler();

// 将原来的服务逻辑放入到异步函数 `createServer()`中
async function createServer() {
  // 内部内容需要根据项目需求进行修改就好，基本是你的 `server.js` 的原代码
  await app.prepare();
  const server = express();

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // 定义返回二进制文件类型
  // 由于 Next.js 框架默认开启 `gzip`，所以这里需要配合为 `['*/*']`
  // 如果项目关闭了 `gzip` 压缩，那么对于图片类文件，需要定制化配置，比如 `['image/jpeg', 'image/png']`
  server.binaryTypes = ['*/*'];

  return server;
}

// export 函数 createServer()
module.exports = createServer;
```

添加入口文件后，重新执行部署命令 `sls deploy` 就 OK 了。

## Serverless 部署方案的优化

至此，我们已经成功将整个 Next.js 应用迁移到腾讯云的 Serverless 架构上了，但是这里有个问题，就是所有的静态资源都部署到了 SCF 中，这就导致我们每次页面请求的同时，会产生很多静态源请求，对于 SCF 来说同一时间并发会比较高，而且很容易造成冷启动。而且大量静态资源通过 SCF 输出，然后经过 API 网关返回，会额外增加链路长度，也会导致静态资源加载慢，无形中也会拖累网页的加载速度。

云厂商一般会提供云对象存储功能，腾讯云叫 COS（对象存储），用它来存储我们的静态资源有天然的优势。而且开始使用有 `50GB!!!` 的免费容量（用来存喜爱的高清电影也是不错的吧~）。

要是在我们项目部署时，将静态资源统一上传到 COS，然后静态页面通过 SCF 渲染，这样既支持了 SSR ，也解决了静态资源访问问题。而且 COS 也支持 CDN 加速，这样静态资源优化就更加方便。

那么我们如何将静态资源上传到 COS 呢？

### 普通青年做法

```
登录 [腾讯云 COS 控制台](https://console.cloud.tencent.com/cos5) -> 创建存储桶 -> 获取 cos 访问链接 -> 构建 Next.js 项目 -> 点击 COS 上传按钮 -> 选择上传文件 -> 开始上传 -> 完成
```

### 文艺青年做法

```
配置 COS 组件 -> 构建 Next.js 项目 -> 执行部署cos组件命令 -> 完成
```

接下来我们一起学习下文艺青年是如何做的。

在项目下创建 cos 文件夹，创建 `cos/serverless.yml` 配置文件：

```yaml
org: orgDemo
app: appDemo
stage: dev
component: cos
name: serverless-cos

inputs:
  # src 配置成你的next项目构建的目标目录
  src: ../.next/static
  # 由于 next框架在访问静态文件会自动附加 _next 前缀，所以这里需要配置上传 COS 的目标目录为 /_next
  targetDir: /_next/static
  bucket: serverless-bucket
  region: ap-guangzhou
  protocol: https
  acl:
    permissions: public-read
```

根据 COS 访问链接生成规则：

```bash
<protocol>://<bucket-name>-<appid>.cos.<region>.myqcloud.com
```

可以直接推断出部署后的访问 URL 为：`https://serverless-bucket-1251556596.cos.ap-guangzhou.myqcloud.com`

然后在项目更目录新建 `next.config.js` 文件，配置 `assetPrefix` 为该链接：

```js
const isProd = process.env.NODE_ENV === 'production';
module.exports = {
  assetPrefix: isProd
    ? 'https://serverless-bucket-1251556596.cos.ap-guangzhou.myqcloud.com'
    : '',
};
```

> 注意：如果你是直接给该 COS 配置了 CDN 域名，那么这里直接改成 CDN 域名就行。

然后执行构建：

```bash
$ npm run build
```

然后部署命令新增部署到 cos 命令执行就好：

```bash
$ sls deploy --target=./cos && sls deploy
```

然后我们就可以耐心等待部署完成。

## Serverless + Next.js 部署流程图

优化后项目整体部署流程图如下：

<center>
<img src="https://blog-1251556596.file.myqcloud.com/deploy-flow.png" width="800" alt="Depoy flow">
</center>

起初虽然看起来步骤很多，但是项目配置一次后，之后部署，只需要执行构建和部署命令，
就可以了。

## 性能分析

依赖 Serverless Component, 虽然我们可以快速部署 SSR 应用。但是对于开发者来说，性能才是最重要的。那么 Serverless 方案的性能表现如何呢？

为了跟传统的 SSR 服务做对比，我专门找了一台 CVM （腾讯云服务器），然后部署相同的 Next.js 应用。分别进行压测和性能分析。

压测配置如下：

| 起始人数 | 每阶段增加人数 | 每阶段持续时间(s) | 最大人数 | 发包间隔时间(ms) | 超时时间(ms) |
| -------- | -------------- | ----------------- | -------- | ---------------- | ------------ |
| 5        | 5              | 30                | 100      | 0                | 10000        |

> 本文压测使用的是 [腾讯 WeTest](https://wetest.qq.com/)。

## 页面访问性能对比

均使用 Chrome 浏览器

| 方案              |          配置           |  TTFB   | FCP  | TTI  |
| :---------------- | :---------------------: | :-----: | :--: | :--: |
| 腾讯云 CVM        | 2 核，4G 内存，10M 带宽 | 50.12ms | 2.0s | 2.1s |
| 腾讯云 Serverless |        128M 内存        | 69.88ms | 2.0s | 2.2s |

## 压测性能对比

### 1.响应时间：

<center>
<img src="https://blog-1251556596.file.myqcloud.com/cvm-response-time.png" width="600" alt="CVM Response Time">
</center>

<center>
<img src="https://blog-1251556596.file.myqcloud.com/serverless-response-time.png" width="600" alt="Serverless Response Time">
</center>

| 方案              |          配置           | 最大响应时间 | P95 耗时 | P50 耗时 | 平均响应时间 |
| :---------------- | :---------------------: | :----------: | :------: | :------: | :----------: |
| 腾讯云 CVM        | 2 核，4G 内存，10M 带宽 |    8830ms    |  298ms   |   35ms   |   71.05 ms   |
| 腾讯云 Serverless |        128M 内存        |    1733ms    |  103ms   |   73ms   |   76.78 ms   |

### 2.TPS:

<center>
<img src="https://blog-1251556596.file.myqcloud.com/cvm-tps.png" width="600" alt="CVM TPS">
</center>

<center>
<img src="https://blog-1251556596.file.myqcloud.com/serverless-tps.png" width="600" alt="Serverless TPS">
</center>

| 方案              |          配置           | 平均 TPS  |
| :---------------- | :---------------------: | --------- |
| 腾讯云 CVM        | 2 核，4G 内存，10M 带宽 | 727.09 /s |
| 腾讯云 Serverless |        128M 内存        | 675.59 /s |

## 价格预算对比

直接上图：

<center>
<img src="https://blog-1251556596.file.myqcloud.com/budget.png" width="600" alt="CVM vs Serverless Budget">
</center>

## 对比分析

从单用户访问页面性能表现来看 `Serverless 方案略逊于服务器方案`，但是页面性能指标是可以优化的。从压测来看，虽然 Serverless 的 `平均响应时间` 略大于 CVM，但是 `最大响应时间` 和 `P95耗时` 均优于 CVM 很多，CVM 的最大响应时间甚至接近 Serverless 的 `3倍`。而且当并发量逐渐增大时，CVM 的响应时间变化明显，而且越来越大，而 Serverless 则表现平稳，除了极个别的冷启动，基本能在 `200ms` 以内。

由此可以看出，随着并发的增加，SSR 会导致服务器负荷越来越大，从而会加大服务器的响应时间；而 Serverless 由于具有自动扩缩的能力，所以相对比较平稳。

当然由于测试条件有限，可能会有考虑不够全面的地方，但是从压测图形来看，是完全符合理论预期的。

但是从价格对比来看，接近配置的 Serverless 方案基本不怎么花钱，甚至很多时候，免费额度就已经可以满足需求了，这里为了增加 Serverless 费用，估计调大了调用次数，内存大小，但是即便如此，服务器方案还是接近 Serverless 方案的 10 倍!!!!!。

## 最后

写到这，作为一名前端开发，我的内心是无比激动的。记得以前在项目中为了优化首屏时间和 SEO，就做个好几个方案的对比，但是最终因为公司运维团队的不够配合，最后放弃了 SSR，最后选择了前端可掌控的 `预渲染方案`。现在有了 Serverless，前端终于不用受运维的限制，可以基于 Serverless 来大胆的尝试 SSR。而且借助 Serverless，前端还可以做的更多。

当然真正的 SSR 并不止如此，要达到页面极致体验我们还需要做很多工作，比如：

1. 静态资源部署到 CDN
2. 页面缓存
3. 降级处理
4. ...

但是这些无论是部署到服务器还是 Serverless，都是我们需要做的工作。并不会成为我们将 SSR 部署到 Serverless 的绊脚石。

如果你对 Serverless Component 开发感兴趣，欢迎一起学习讨论，也可以访问 https://sls.plus 网站，找到你所需要的组件。
