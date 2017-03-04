---
title: 如何解决安装 node-sass 一直失败的问题？
date: 2017-03-03 22:07:02
tags: 
 - npm 
 - sass
---

今天在家办公，配置公司项目时，安装 [node-sass](https://github.com/sass/node-sass) 各种不成功，切换node版本删了重新安装也没法解决，通过搜索终于找到了解决办法。
  
原来是因为：
> 安装 `node-sass` 时，在 `node scripts/install` 脚本运行过程中，会从 github.com 下载文件名为 `.node` 文件，大部分安装不成功的原因都源自这里，因为 github Releases 里的文件都托管在 `s3.amazonaws.com` 上面，而这个网址在国内总是网络不稳定，所以我们需要通过第三方服务器下载这个文件。

知道了问题所在，解决办法就好办了。

### 方法一：npm install 时直接配置 node-sass 镜像

虽然本机已经配置了npm `registry` 为 `https://registry.npm.taobao.org` , 但是在安装 `node-sass` 时，下载 `.node` 文件依然会从 `s3.amazonaws.com` 下载，所以需要在安装是手动配置。   
直接运行下面的命令：

```npm
SASS_BINARY_SITE=https://npm.taobao.org/mirrors/node-sass/ npm install node-sass
```

********************************************

### 方法二：项目根目录配置 `.npmrc` 文件

如果希望能在运行 `npm install` 安装所有依赖时直接自动获取，我们需要在项目根目录下添加 `.npmrc` 文件，内容如下：

```npm
phantomjs_cdnurl=http://cnpmjs.org/downloads
sass_binary_site=https://npm.taobao.org/mirrors/node-sass/
registry=https://registry.npm.taobao.org
```

这样使用 `npm install` 安装 `node-sass` 和 `phantomjs` 时都能自动从淘宝源上下载了。


