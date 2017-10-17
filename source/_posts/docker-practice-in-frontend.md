---
title: Docker 在前端开发中的实践
reward: true
date: 2017-10-17 10:29:18
tags:
  - Docker
---

今天是我入职第一天，
为了在新同事面前表现我的积极向上，我很早就来到了公司，领取了新Mac。
然后坐到自己工位上，泡了杯热腾腾的卡布奇洛，准备大干一番~

于是，按下开机键，设置电脑密码，配置自己喜欢的桌面，

然后，
下载 Chrome、Postman、Visual Studio Code、iTerm，
安装 Nodejs、nvm、yarn、nrm、oh-my-zsh、webpack、sass、vue-cli.....
配置VPN、Alfred、SS.....

此处省略一万个工具。

<!--more-->

如果我按时下班了，说明一切进展的很顺利，
通常会遇到各种网络问题、配置问题、版本问题......，然后不得不加班处理这些开发环境配置.....

于是我的第一周周报是：

> * 本周工作：安装配置开发环境，熟悉项目环境。

Oh！ xxx。

## 传统的解决办法

开发机模式
![develop machine](https://static.yugasun.com/15082084284764.png)
大公司思路很简单：既然自己搞这么麻烦，那么公司直接帮你搞好，入职时直接给你个账号，登录到开发机上开发就解决了。

确实很便利，没毛病，但是还是得解决三个问题：

1. 如何在本地预览页面？
2. 如何在本机编辑文件，并同步到开发机？
3. 如何在外网访问开发机？

当然解决方案也很多，这里只介绍一种：`Nginx + Samba + VPN`

* [Nginx](https://nginx.org/) 可以解决第一个问题，每个工程师分配的账号都对应一个域名，nginx会把该域名解析到用户开发目录，这样开发时，只需简单配置host，就可以访问到自己的页面了。
* [Samba](https://wiki.archlinux.org/index.php/Samba) 可以解决第二个问题，Samba 是 [SMB/CIFS](https://en.wikipedia.org/wiki/Server_Message_Block) 网络协议的重新实现, 它作为 NFS 的补充使得在 Linux 和 Windows 系统中进行文件共享、打印机共享更容易实现。
* VPN可以解决第三个问题，大公司除了专用软件，还有配套使用硬件来提高安全系数。VPN硬件类似U盾，上面显示一串动态数字密码，定时刷新，每次外网登录 VPN 都需要附加动态密码。

这样开发人员就可以愉快地在开发机上写代码了。

但是这套架构对于中小型公司来说，搭建整套开发环境、规范开发流程、规范VPN使用流程、全公司切到开发机，时间和人力成本都不低......

## Docker闪亮登场

Docker 镜像模式
![docker image mode](https://static.yugasun.com/15082110151873.jpg)

Docker基础使用和介绍请参考 [Docker — 从入门到实践](https://www.gitbook.com/book/yeasy/docker_practice/details)，这里只介绍使用到的部分。

使用Docker前，我们先来讨论几个问题：

1. Docker 能否跨平台？
2. 如何预览 Docker 里的网页？
3. 如何编辑 Docker 文件？
4. Docker 如何实现一次配置多处使用？

因为 Docker 是运行在本地机器上的，所以不存在外网访问问题。
而且上述问题，Docker 都提供了相应功能来解决：

1. Docker 服务本身就是跨平台的，而且它针对不同平台，提供了相应的客户端版本。
2. Docker 提供了镜像端口映射到本地端口的功能，通过参数 `-p` 配置。
3. Docker 可以用数据卷的方式映射到本地开发目录，通过参数 `-v` 配置。
4. 配置好的 Docker image 可以导出，复制使用，也可以 push 到 [Docker hub](https://hub.docker.com/explore/)，通过 `docker pull` 命令拉取到本地，进行使用。

## Docker 的三个核心概念

* Image - 镜像：我们都知道，操作系统分为内核和用户空间。对于 Linux 而言，内核启动后，会挂载 root 文件系统为其提供用户空间支持。而 Docker 镜像（Image），就相当于是一个 root 文件系统。比如官方镜像 ubuntu:14.04 就包含了完整的一套 Ubuntu 14.04 最小系统的 root 文件系统。
* Container - 容器：镜像（Image）和容器（Container）的关系，就像是面向对象程序设计中的类和实例一样，镜像是静态的定义，容器是镜像运行时的实体。容器可以被创建、启动、停止、删除、暂停等。
* Repository - 仓库：镜像构建完成后，可以很容易的在当前宿主上运行，但是，如果需要在其它服务器上使用这个镜像，我们就需要一个集中的存储、分发镜像的服务，[Docker Registry](https://docs.docker.com/registry/) 就是这样的服务。
* Volume - 卷：简单来说，Volume 就是专门存放数据的文件夹，启动 Image 时可以通过 `-v 本地目录:容器目录` 
映射本地路径到容器，一个容器可以挂载一个或多个 Volume，Volume 中的数据独立于 Image，重启不会丢失。我们创建一个 Volume，挂载到系统的一个目录下，然后把代码都放进去就可以了。

Image 运行于 Container 时，修改的内容都是临时的，是不会保存的，如果重启Container，所有临时数据都将销毁。那么，可以通过 `docker commit [OPTIONS] CONTAINER [REPOSITORY[:TAG]]` 命令来实现状态保存。
这里的 `commit` 和 `git commit` 类似，会将当前状态保存为一个新的 Image，因此可以借此功能来保存配置好的公用开发环境镜像 Image。

而本地开发目录只需要借助 `Volume` 来挂载到镜像就行。

## 动手开始配置开发环境

先交代下笔者的开发环境：

```
Mackbook Pro    OSX 系统
docker-tool     docker工具包
```

整个配置过程包括以下步骤：

1. 下载并安装 Docker 工具包。
2. 下载并运行 Ubuntu 镜像
3. 处理常规的 linux 系统初始化工作：更换国内源、安装常用工具包
4. 安装前端开发工具
5. 保存镜像，提交到Docker Hub 仓库。

### 1.下载并安装 Docker工具包。

Docker Toolbox 是 Docker 官方提供的 Docker 套装，包括全套 Docker 环境，也有图形化的工具 `Kitematic`。
直接登录官方网站，下载安装适合自己系统的客户端：https://docs.docker.com/engine/installation/

> 本文都是以 Mac OS 为例，Window 操作方法类似。

安装好以后，启动 docker 程序，你的状态栏会出现这个![docker icon](https://static.yugasun.com/15082208013131.jpg)图标。

然后打开mac终端，输入以下命令，验证下：

```bash
$ docker --version
Docker version 17.09.0-ce, build afdb6d4
```


### 2.下载并运行 Ubuntu 镜像

本文以 `Ubuntu:14.04` 版本为例，直接拉取 Docker Hub 镜像到本地：

```bash
$ docker pull ubuntu:14.04
```

运行成功后，查看是否拉取成功：

```bash
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
yugasun/dev         latest              63e5d6e177bd        3 days ago          468MB
ubuntu              14.04               dea1945146b9        4 weeks ago         188MB
```

输出 `REPOSITORY` 为 `ubuntu`，`TAG` 为 `14.04` 的镜像就是我们刚刚拉取的。

然后打开Mac上安装好的`Kitematic` 应用，可以看到如下界面：
![kitematic](https://static.yugasun.com/15082211883408.jpg)

点击 `ubuntu` 镜像右下角的 `CREATE` 按钮创建 Container，
![create button](https://static.yugasun.com/15082212852412.jpg)

然后，点击 `EXEC` 按钮，就可进入该 `ubuntu` 的交互终端，或者直接在 Mac终端输入如下命令：

```bash
$ docker exec -it ubuntu sh
```
![docker termimal](https://static.yugasun.com/15082214834125.jpg)

之后就是熟悉的 linux 系统操作了，你可以自由发挥了。

### 3.处理常规的 linux 系统初始化工作

Ubuntu 装完系统后，由于默认源在国外，对于没有翻墙的用户，下载工具包会非常慢。所以读者可以根据自己实际情况，可以选择是否更换源，如果需要直接运行以命令：

```bash
# 这里用到是中科大源
sed -i 's/archive.ubuntu.com/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
apt-get update
```

然后安装常用的工具包：

```bash
apt-get install vim bash-completion zsh git curl
```

### 4.安装前端开发工具

* 对于一个终端爱好者，谁没有几个钟爱的插件呢，所以笔者无论走到哪里，都会装上自己喜欢的 [ob-my-zsh](https://github.com/robbyrussell/oh-my-zsh)，并修改成自己喜欢的主题。

    ```bash
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
    ```

* 安装成功后，切换 shell 到 zsh:

    ```bash
    zsh
    ```

* 一般 `apt-get install nodejs` 安装的node版本都很低，所以这里借助 [nvm](https://github.com/creationix/nvm) 工具来安装，先安装 nvm:

    ```bash
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash
    ```

    安装成功后直接运行一下命令：
    
    ```bash
    nvm install stable
    ```
    一般该命令会安装当前最新稳定版本的 nodejs, 安装成功后检查一下：
    
    ```bash
    node -v
    ```

* 这样基本的基于 nodejs 的前端开发环境已经准备好了，但是对于 `npm install` 很慢的读者，可以再安装一个切换 `npm 源` 的工具 [nrm](https://github.com/Pana/nrm)，将 `npm 源` 切换到 `taobao`，该工具非常方便，对于需要的读者，这步可以选择自由安装：

    ```bash
    npm install -g nrm --registry=https://registry.npm.taobao.org
    ```
    
    `nrm` 安装成功后直接运行 `nrm use taobao`，这样今后你的 `npm install` 命令源将一直是 `https://registry.npm.taobao.org`，更多使用可以自行研究。
    
    
> 因为笔者的项目都是基于 Vue的，所以还安装了 `vue-cli、webpack、babel、eslint` 以及相关库，读者可以根据项目需要安装相应的库。

### 5.保存镜像，提交到Docker Hub 仓库

到此，已经完成了开发环境所有配置，但是这个配置只是临时的，在容器重启后，都会丢失。
所以，`docker commit` 命令出现了，先输入：

```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
9a5acc611aa1        ubuntu:14.04        "/bin/bash"         7 seconds ago       Up 6 seconds                            ubuntu
```

`ubuntu:14.04` 就是我们刚配置好的镜像，然后执行：

```base
docker commit -a="yugasun" -m="Init frontend develop environment" ubuntu yugasun/fe-dev:latest
```

查看我们保存的镜像：

```bash
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
yugasun/fe-dev      latest              b544f125ed7f        5 seconds ago       468MB
```

接下来就是将我保存的 `yugasun/fe-dev` 推送到 Docker Hub 供所有人使用。

首先登录 Docker Hub，当然在这之前你需要 https://hub.docker.com 上注册一个账号:

```bash
$ docker login
Login with your Docker ID to push and pull images from Docker Hub. If you don't have a Docker ID, head over to https://hub.docker.com to create one.
Username (yugasun):
Password: <输入密码>
Login Succeeded
```

然后直接 `docker push yugasun/fe-dev` 到远程Docker Hub 仓库。

访问并登录 `https://hub.docker.com/`, 会发现个人中心多了一个镜像：
![docker hub](https://static.yugasun.com/15082245136919.jpg)

## 镜像有了，别人如何使用并开发呢？

新人使用流程：

1. 安装 Docker 工具包
2. 注册 Docker Hub 账号
3. `docker pull <镜像名称>`
4. 运行镜像

运行 `docker pull yugasun/fe-dev` 后会，`docker images` 查看该镜像 ID 为 b544f125ed7f，

```bash
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
yugasun/fe-dev      latest              b544f125ed7f        15 minutes ago      468MB
```

然后输入以下指令：

```bash
$ docker run -t -d -p=8080:8080/tcp --name=fe-dev -v=/Users/Yuga/Desktop/Develop:/web b544f125ed7f
```

相关参数介绍：

* **--name**：定义运行时的容器 Container 名称
* **-d**：以Detached模式运行
* **-p**：将本地的8080端口映射到容器Container的8080端口。
* **-v**：将本地开发目录`/Users/Yuga/Desktop/Develop` 挂在到 容器 Container 的 `/web` 目录，实现开发同步。

这样我们的镜像就跑起来了。

然后终端登录该容器：

```bash
$ docker exec -it fe-dev zsh
```

之后又是熟悉的linux系统操作了。

## 开发一个简单的Vue项目demo

登录容器 `fe-dev` 后，输入如下命令：

```bash
# 进入开发目录
cd web/
# 使用之前安装的vue-cli命令初始化项目
vue init webpack awesomeproject
# 进入项目目录
cd awesomeproject
# 安装依赖
npm install
# 运行项目
npm run dev
```

打开浏览器访问 http://localhost：8080，会出现以下界面:
![vue project view](https://static.yugasun.com/15082258181869.jpg)


你会发现挂在的本地目录 `/Users/Yuga/Desktop/Develop` 下有一个 `awesomeproject` 目录，就是你在 docker 下操作创建的项目目录。

之后你就可以再改环境下愉快地开发玩耍了~

## 总结

用 Docker 来做前端环境部署确实可行，笔者小团队已经开始使用，但是整个配置过程还是不够完美，后期可以通过自动化脚本来优化。当然对于每个特定项目的开发环境，可以通过在项目根目录下配置 `Dockerfile` 文件来实现，这里先不做介绍了。本人也不是专业搞 Docker 的，介绍不对的地方，可以随时评论或发邮件指正~

正所谓：

> 前人栽树后人乘凉

一次开发配置，所有人共享使用，方便自己，也帮助了他人，这样的开发模式，何乐而不为呢？

## 参考文献

* [用 Docker 快速配置前端开发环境](http://numbbbbb.com/2016/09/26/20160926_%E7%94%A8%20Docker%20%E5%BF%AB%E9%80%9F%E9%85%8D%E7%BD%AE%E5%89%8D%E7%AB%AF%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/)
* [Docker — 从入门到实践](https://www.gitbook.com/book/yeasy/docker_practice/details)