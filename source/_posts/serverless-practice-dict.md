---
title: Serverless 实践篇 - 如何基于腾讯云快速开发免费的翻译工具
desc: Serverless 实践系列文章，如何基于腾讯云快速开发免费的翻译工具
reward: true
date: 2019-11-26 12:43:17
tags:
  - Serverless
---

### 背景

作为一名程序员，日常工作和学习中，我们会接触到各种英文文档和代码，因此英文基础是不可或缺的。但是我们脑海中的英文词汇是有限的，总会碰到一些不认识的单词，因此一个好的翻译软件就显得尤为重要。由于每次点开翻译软件，然后再输入陌生单词，获得答案的操作，总觉得太繁琐，而且大多数时候我们只需要一个简单的翻译就行，并不需要翻译软件列出的一大堆翻译解释。因此，开发一款简单的翻译工具的念头应运而生。

<!--more-->

### 思考

要开发一款翻译工具，第一反应就是想到使用现成的翻译接口，只需要我本地写几行脚本调用，可处理下数据就行了，同时我又想把它做成一个简单的服务，可以通过简单的 `query api` 的方式，就可以获得翻译，ok，现在需求很明确了：

```
0. 一个免费的翻译接口
1. 我需要一个简单的翻译服务，它的使用频率很低
2. 同时这个服务最好在我只有翻译需求时才运行
3. 我是个穷B，我不想花钱
```

> 写下第三条时，我默默地擦拭掉了眼角的泪水，可能年纪大了，容易进沙子......

### 准备

不知道为什么，我的脑海中第一个闪现的就是 `云函数`，因为他满足了上面提到的所有需求，关键是她免费，免费，免费....... 重要的是事情说三遍。当然免费是有限度的，对于这种小工具来说，已经够了。作为一名合格的撸羊毛党，对于免费的服务发现和洞察能力，是一门基本修养。

于是三下五除二就注册了一个腾讯云账号，顺势就开通了云函数服务。

接下来就是翻译接口了，在腾讯云平台搜了下，正好有腾讯云机器翻译的文本翻译接口正好可以满足需求，重点是它 `每月有5百万字符` 的免费额度，简直是我等屌丝的福音......

还有一个很重要的步骤就是 `创建API密钥`，因为之后无论是 `请求云API请求` 还是 `scf 命令行工具部署` 都需要 `API密钥`，只需要到腾讯云控制台 [创建API密钥](https://console.cloud.tencent.com/cam/capi) 就行。

### 鉴权开发

接下来就是正式开发了。腾讯云机器翻译的接口鉴权有两种签名算法：一种是简单的 `HMAC-SHA1/SHA256`算法，另一种则是相对复杂的 `TC3-HMAC-SHA256` 算法。官方给出的解释是：

> TC3-HMAC-SHA256 签名方法相比以前的 HmacSHA1 和 HmacSHA256 签名方法，功能上覆盖了以前的签名方法，而且更安全，支持更大的请求，支持 json 格式，性能有一定提升，建议使用该签名方法计算签名。

考虑到以后的扩展性（作为一名喜欢装x的程序员），毅然选择了第二种鉴权算法。可是官方文档并未给出 `Javascript` 的实现版本，于是自己花时间用 `Typescript` 手写了这个签名算法，整体还是没有什么难度的，只需要按照 [官方文档](https://cloud.tencent.com/document/api/551/30636)，一步一步实现就好，这里奉上 [源代码](https://github.com/yugasun/tencent-serverless-sdk/blob/master/packages/capi/src/utils.ts#L81)。

> 注意：因为 GET 和 POST 方式的参数是有区别的，目前只支持 POST 方式。

搞定了最复杂的签名算法，接下来就是 `云函数` 的开发了。

### 云函数创建

创建一个 `云函数`，参考官方文档 [使用控制台创建函数](https://cloud.tencent.com/document/product/583/37509)，模板选择 `Nodejs8.9` 运行环境，创建成功后，在线编辑函数代码就行。当然你也可以本地创建，参考这个代码模板 https://github.com/yugasun/tencent-serverless-demo/tree/master/dict, 然后根据个人需求修改 `template.yaml` 文件就行。

如果你是本地开发的函数，需要部署到线上，就需要用到 [SCF命令行工具](https://cloud.tencent.com/document/product/583/37510) 了，更具文档安装下就行。(当然云函数的部署，还有其他很多种，待大家自己去探索了)

### 业务开发

接下来就是编写业务逻辑了，本来代码中应该包含了鉴权和标准云API请求的代码，但是考虑到以后可能还会再次使用，于是将腾讯云相关的 API 请求代码封装成了 [tss-capi](https://www.npmjs.com/package/tss-capi) 模块。然后重构后的函数代码就变得简洁很多：

```js
const Dotenv = require('dotenv');
const { Capi } = require('tss-capi');
const path = require('path');

function scfReturn(err, data) {
  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { error: err, data: data },
  };
}

exports.main_handler = async (event, context, callback) => {
  const query = event.queryString || {};
  const sourceText = query.q;
  if (!sourceText) {
    return scfReturn(new Error('Please set word you want to translate.'), null);
  }
  try {
    const envPath = path.join(__dirname, '.env');
    const { parsed } = Dotenv.config({
      path: envPath,
    });

    const client = new Capi({
      Region: 'ap-guangzhou',
      SecretId: parsed.TENCENT_SECRET_ID,
      SecretKey: parsed.TENCENT_SECRET_KEY,
      ServiceType: 'tmt',
      host: 'tmt.tencentcloudapi.com',
    });

    const res = await client.request(
      {
        Action: 'TextTranslate',
        Version: '2018-03-21',
        SourceText: sourceText,
        Source: 'auto',
        Target: 'zh',
        ProjectId: 0,
      },
      {
        host: 'tmt.tencentcloudapi.com',
      },
    );

    const translateText = res.Response && res.Response.TargetText;
    return scfReturn(null, translateText);
  } catch (e) {
    return scfReturn(e, null);
  }
};
```

> 注意：函数使用了 `dotenv` 来配置上文提到的 `API 密钥`，开发中你需要将含有 `TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY` 的 `.env` 文件放到项目根目录。

细心的读者可能还会发现，这里的函数返回都是通过 `scfReturn` 规范化的，这是为什么呢？

这里踩了一个坑，正常情况下，云函数执行结果是可以返回任何结果的，但是由于这里本人在创建 `API 网关触发器` 时，点击启用了 `集成响应`，但是当时并没有注意这个功能，就没有理会她，导致接口请求一直报错，也很莫名其妙。通过搜索，发现官方对于 `集成响应` 的说明：

> 集成响应，是指 API 网关会将云函数的返回内容进行解析，并根据解析内容构造 HTTP 响应。通过使用集成响应，可以通过代码自主控制响应的状态码、headers、body 内容，可以实现非 JSON 格式的内容响应，例如响应 XML、HTML、甚至 JS 内容。在使用集成响应时，需要按照 API 网关触发器的集成响应返回数据结构，才可以被 API 网关成功解析，否则会出现 {"errno":403,"error":"Invalid scf response format. please check your scf response format."} 错误信息。

找到了接口报错的原因了，于是便写了 `scfReturn` 函数，来规范所有接口返回。

### 函数部署

借助 [SCF命令行工具](https://cloud.tencent.com/document/product/583/37510)，云函数的部署变得相当简单。你只需要在项目根目录下执行 `scf deploy` 命令，接下来所有的一切事情，命令行就会自动帮你搞定。当然如果需要自动创建 `API 网关触发器`，还需要在 `template.yaml` 文件中进行配置，如下：

```yaml
Resources:
  default:
    Type: TencentCloud::Serverless::Namespace
    dict:
      Type: TencentCloud::Serverless::Function
      Properties:
        CodeUri: ./
        Description: Tencent Machine Translator
        Environment:
          Variables: {}
        Handler: index.main_handler
        Role: QCS_SCFExcuteRole
        MemorySize: 128
        Runtime: Nodejs8.9
        Timeout: 3
        VpcConfig:
          SubnetId: ''
          VpcId: ''
        Events:
          dict:
            Type: APIGW
            Properties:
              StageName: release
              ServiceId: service-7kqwzu92
              HttpMethod: ANY
```

> 注意： 配置中的 `service-7kqwzu92` 是我在 [API网关](https://console.cloud.tencent.com/apigateway/service?rid=1) 创建的服务，需要修改成私人配置。

第一次部署成功后，如果再次运行 `scf deploy` 会提示 `default dict: The function already exists.` 函数已经存在的错误，这里就需要进行强制覆盖，将部署命令修改为 `scf deploy -f` 就好。

### 最后

终于一个简单免费的云词典开发好了，浏览器访问：http://service-7kqwzu92-1251556596.gz.apigw.tencentcs.com/test/dictt?q=hello ，成功输出翻译结果：

```json
{
  "isBase64Encoded": false,
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
  	"error": null,
		"data": "你好"
  }
}
```

当然，这还并不能满足我作为一名 `懒惰` 程序员的需求，因为我现在翻译，还需打开浏览器，然后输我要翻译的字符串才行，于是我又在本地写了一个简单的脚本，通过执行终端命令就可以了，最后的运行效果是：

```shell
$ dict billionaire
亿万富翁
```

不知道为啥，看到 `亿万富翁` 的翻译输出到命令行时，一粒沙子又莫名的飞入了我的眼中：

> 金钱最大不是只有 `100块` 吗？尽然还有 `亿万` 这个单位......

### 源码

朋友请留步，源码在这里: https://github.com/yugasun/tencent-serverless-demo/tree/master/dict
