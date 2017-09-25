---
title: 使用rsync命来快速迁移服务器数据
reward: true
date: 2017-09-25 15:59:36
tags:
  - linux
---

由于之前本人的博客是部署在国外的一台VPS上的，但是域名是从阿里云购买备案的，然后最近被阿里云无辜断定为 `空壳网站` (仅仅是因为我的域名未指向阿里云服务器o(╯□╰)o)，虽然 [@xuexb](https://xuexb.com) 告诉我说不用管，但是自己内心还是忐忑的，于是就忍痛割爱又买了台阿里云的服务器。由于我的国外VPS上部署了我的太多项目和数据了，虽然大部分项目都在github上，可以通过 `git clone` 来重新部署，但是还有些私人项目，就得自己去拷贝了.....通过搜索，发现了强大的 `rsync` 命令，让人喜出望外。

<!--more-->

## rsync 命令简介

> `rsync` 命令是一个远程数据同步工具，可以通过 LAN/WAN 快速同步多台主机间的文件。`rsync` 使用所谓的 `rsync算法` 来使本地和远程两个主机之间的文件达到同步，这个算法只传送两个文件的不同部分，而不是每次都整份传送，因此速速相当快。而正好，我可以借助此命令来同步我的 VPS 上的项目目录 `/opt/www` 到我的阿里云目录 `/opt/www`，这样我就只需等待同步完成，然后快速搭建我的开发环境就行了。


## 配置 rsync 服务

编辑 `/etc/xinetd.d/rsync` 文件，修改 `disable=yes` 为 `disable=no`，`/etc/xinetd.d/rsync` 内容如下：

```bash
# default: off
# description: The rsync server is a good addition to an ftp server, as it \
#	allows crc checksumming etc.
service rsync
{
	disable	= no
	flags		= IPv6
	socket_type     = stream
	wait            = no
	user            = root
	server          = /usr/bin/rsync
	server_args     = --daemon
	log_on_failure  += USERID
}
```

并重启xinetd服务：

```bash
/etc/init.d/xinetd restart
```

## 创建 rsync 服务配置文件

创建 `/etc/rsyncd.conf` 配置文件，并添加如下内容：

```bash
uid=root
gid=root
max connections=4
log file=/var/log/rsyncd.log
pid file=/var/run/rsyncd.pid
lock file=/var/run/rsyncd.lock
secrets file=/etc/rsyncd.passwd
hosts deny=104.128.82.150/22

[www]
comment= backup web
path=/opt/www
read only = no
exclude=test
auth users=aliyun
```

创建密码文件，采用这种方式不能使用系统用户对客户端进行认证，所以需要创建一个密码文件，其格式为 `username:password`，用户名需要同 `/etc/rsyncd.conf` 文件中定义的 `auth users` 一致，密码可以随便定义，同时需要把创建的密码文件权限设置为600，运行如下命令：

```bash
echo "aliyun:abc123" > /etc/rsyncd.passwd
chmod 600 /etc/rsyncd.passwd
```

## 运行命令

例如我需要同步 VPS 上的项目目录 `/opt/www` 下所有文件到阿里云目录 `/opt/www`下，命令如下：

```bash
rsync -avz --progress --delete aliyun@104.128.82.150::www /opt/www
```

然后输入密码，然后会开始同步传输，控制台会输出下面内容：

```bash
Password: 
receiving incremental file list
./
https_bak.conf
        3972 100%    3.79MB/s    0:00:00 (xfer#1, to-check=1012/1014)
AiChat/
AiChat/.env
          92 100%   89.84kB/s    0:00:00 (xfer#2, to-check=1013/1024)
...
```

之后你只需要耐心等待同步完成~，然后显示如下内容：

```bash
...
sent 1015272 bytes  received 298798817 bytes  42523.81 bytes/sec
total size is 671578940  speedup is 2.24
```

> 注意 `aliyun@104.128.82.150::www` 中的 `www` 为 `/etc/rsyncd.conf` 配置文件中添加的 `模块名称- [www]`

## 总结

当然我只是用到 `rsync` 命令的一个很小的功能，感兴趣的朋友，可以深入研究下。

## 相关文章

* http://man.linuxde.net/rsync