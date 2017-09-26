---
title: 使用rsync命来快速迁移服务器数据
reward: true
date: 2017-09-25 15:59:36
tags:
  - linux
  - rsync
---

由于之前本人的博客是部署在国外的一台VPS上的，但是域名是从阿里云购买备案的，然后最近被阿里云无辜断定为 `空壳网站` (仅仅是因为我的域名未指向阿里云服务器o(╯□╰)o)，虽然 [@xuexb](https://xuexb.com) 告诉我说不用管，但是自己内心还是忐忑的，于是就忍痛割爱又买了台阿里云的服务器。由于我的国外VPS上部署了我的太多项目和数据了，虽然大部分项目都在github上，可以通过 `git clone` 来重新部署，但是还有些私人项目，就得自己去拷贝了.....通过搜索，发现了强大的 `rsync` 命令，让人喜出望外。

<!--more-->

## rsync 命令简介

> `rsync` 命令是一个远程数据同步工具，可以通过 LAN/WAN 快速同步多台主机间的文件。`rsync` 使用所谓的 `rsync算法` 来使本地和远程两个主机之间的文件达到同步，这个算法只传送两个文件的不同部分，而不是每次都整份传送，因此速速相当快。而正好，我可以借助此命令来同步我的 VPS 上的项目目录 `/opt/www` 到我的阿里云目录 `/opt/www`，这样我就只需等待同步完成，然后快速搭建我的开发环境就行了。

## rsync 工作模式

rsync总共有6中工作模式，分别如下：

1. 拷贝本地文件，将/home/coremail目录下的文件拷贝到/cmbak目录下。

```bash
rsync -avSH /home/coremail/ /cmbak/
```

2. 拷贝本地机器的内容到远程机器。

```bash
rsync -av /home/coremail/ 192.168.11.12:/home/coremail/
```

3. 拷贝远程服务器(ssh 方式运行rsync)的内容到本地机器。

```bash
rsync -av 192.168.11.11:/home/coremail/ /home/coremail/
```

4.拷贝远程rsync服务器(daemon形式运行rsync)的文件到本地机。

```bash
rsync -av root@172.16.78.192::www /databack
```

5.拷贝本地机器文件到远程rsync服务器(daemon形式运行rsync)中。当DST路径信息包含”::”分隔符时启动该模式。

```bash
rsync -av /databack root@172.16.78.192::www
```

6.显示远程机的文件列表。这类似于rsync传输，不过只要在命令中省略掉本地机信息即可。

```bash
rsync -v rsync://192.168.11.11/data
```

## daemon形式运行rsync

### 配置 rsync 服务

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

### 创建 rsync 服务配置文件

创建 `/etc/rsyncd.conf` 配置文件，并添加如下内容：

```bash
uid=root  #指定当模块传输文件的守护进程UID
gid=root  #指定当模块传输文件的守护进程GID
max connections=10 #最大并发连接数
log file=/var/log/rsyncd.log  #rsync 服务器的日志
pid file=/var/run/rsyncd.pid  #指定PID文件
lock file=/var/run/rsyncd.lock  #指定支持max connection的锁文件，默认为/var/run/rsyncd.lock
secrets file=/etc/rsyncd.passwd #验证密码文件
hosts deny=104.128.82.150/22   #禁止连接的IP

[www]
comment = backup web # 备注
path = /opt/www #用来指定要备份的目录
read only = no   #设置no，客户端可以上传文件，yes是只读
write only = no   #no为客户端可以下载，yes不能下载
list = true   #客户请求时，使用模块列表
exclude = node_modules # 排除的目录
auth users = aliyun #连接用户名，和linux系统用户名无关系
```

创建密码文件，采用这种方式不能使用系统用户对客户端进行认证，所以需要创建一个密码文件，其格式为 `username:password`，用户名需要同 `/etc/rsyncd.conf` 文件中定义的 `auth users` 一致，密码可以随便定义，同时需要把创建的密码文件权限设置为600，运行如下命令：

```bash
echo "aliyun:abc123" > /etc/rsyncd.passwd
chmod 600 /etc/rsyncd.passwd
```

### 运行命令

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

> 注意 `aliyun@104.128.82.150::www` 中的 `www` 为 `/etc/rsyncd.conf` 配置文件中添加的 `模块名称- www`


### 参数说明

```
-v,  --verbose 详细模式输出。
-q,  --quiet 精简输出模式。
-c,  --checksum 打开校验开关，强制对文件传输进行校验。
-a,  --archive 归档模式，表示以递归方式传输文件，并保持所有文件属性，等于-rlptgoD。
-r,  --recursive 对子目录以递归模式处理。
-R,  --relative 使用相对路径信息。
-b,  --backup 创建备份，也就是对于目的已经存在有同样的文件名时，将老的文件重新命名为~filename。
可以使用--suffix选项来指定不同的备份文件前缀。
--backup-dir 将备份文件(如~filename)存放在在目录下。
-suffix=SUFFIX 定义备份文件前缀。
-u,  --update 仅仅进行更新，也就是跳过所有已经存在于DST，并且文件时间晚于要备份的文件，不覆盖更新的文件。
-l,  --links 保留软链结。
-L,  --copy-links 想对待常规文件一样处理软链结。
--copy-unsafe-links 仅仅拷贝指向SRC路径目录树以外的链结。
--safe-links 忽略指向SRC路径目录树以外的链结。
-H,  --hard-links 保留硬链结。
-p,  --perms 保持文件权限。
-o,  --owner 保持文件属主信息。
-g,  --group 保持文件属组信息。
-D,  --devices 保持设备文件信息。
-t,  --times 保持文件时间信息。
-S,  --sparse 对稀疏文件进行特殊处理以节省DST的空间。
-n,  --dry-run现实哪些文件将被传输。
-w,  --whole-file 拷贝文件，不进行增量检测。
-x,  --one-file-system 不要跨越文件系统边界。
-B,  --block-size=SIZE 检验算法使用的块尺寸，默认是700字节。
-e,  --rsh=command 指定使用rsh、ssh方式进行数据同步。
--rsync-path=PATH 指定远程服务器上的rsync命令所在路径信息。
-C,  --cvs-exclude 使用和CVS一样的方法自动忽略文件，用来排除那些不希望传输的文件。
--existing 仅仅更新那些已经存在于DST的文件，而不备份那些新创建的文件。
--delete 删除那些DST中SRC没有的文件。
--delete-excluded 同样删除接收端那些被该选项指定排除的文件。
--delete-after 传输结束以后再删除。
--ignore-errors 及时出现IO错误也进行删除。
--max-delete=NUM 最多删除NUM个文件。
--partial 保留那些因故没有完全传输的文件，以是加快随后的再次传输。
--force 强制删除目录，即使不为空。
--numeric-ids 不将数字的用户和组id匹配为用户名和组名。
--timeout=time ip超时时间，单位为秒。
-I,  --ignore-times 不跳过那些有同样的时间和长度的文件。
--size-only 当决定是否要备份文件时，仅仅察看文件大小而不考虑文件时间。
--modify-window=NUM 决定文件是否时间相同时使用的时间戳窗口，默认为0。
-T--temp-dir=DIR 在DIR中创建临时文件。
--compare-dest=DIR 同样比较DIR中的文件来决定是否需要备份。
-P 等同于--partial。
--progress 显示备份过程。
-z,  --compress 对备份的文件在传输时进行压缩处理。
--exclude=PATTERN 指定排除不需要传输的文件模式。
--include=PATTERN 指定不排除而需要传输的文件模式。
--exclude-from=FILE 排除FILE中指定模式的文件。
--include-from=FILE 不排除FILE指定模式匹配的文件。
--version 打印版本信息。
--address 绑定到特定的地址。
--config=FILE 指定其他的配置文件，不使用默认的rsyncd.conf文件。
--port=PORT 指定其他的rsync服务端口。
--blocking-io 对远程shell使用阻塞IO。
-stats 给出某些文件的传输状态。
--progress 在传输时现实传输过程。
--log-format=formAT 指定日志文件格式。
--password-file=FILE 从FILE中得到密码。
--bwlimit=KBPS 限制I/O带宽，KBytes per second。
-h,  --help 显示帮助信息。
```

## 通过 ssh 方式来运行rsync

这也是此次数据迁移中，用到的主要方式，无需任何配置，直接运行如下命令：

```bash
rsync -avz --progress --delete root@47.95.247.149:/opt/www/ /opt/www
```

如果没有配置过免密登录，则需要输入远程服务器 `ssh` 登录密码。



## 总结

原来服务器间数据传输，还有很多方式，比如： `nc`、`ftp`、`scp`、`nfs`，之后自己参考 [scp命令参考文档](http://man.linuxde.net/scp)，尝试用 `scp` 传输也成功了，但是在数据同步备份上，还是 `rsync` 更加高效，因为 `rsync` 可以增量传输。当然我只是用到 `rsync` 命令的一个很小的功能，感兴趣的朋友，可以深入研究下。

## 相关文章

* http://man.linuxde.net/rsync