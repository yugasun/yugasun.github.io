---
title: Git配置多个SSH-Key
date: 2017-02-14 16:00:49
reward: true
tags: Git
---

我们在日常工作中会遇到公司有个gitlab，还有些自己的一些项目放在github上。
这样就导致我们要配置不同的 SSH KEY 对应不同的环境。下面我们来看看具体的操作.

<!-- more --> 

## 生成一个公司用的SSH-Key

```
ssh-keygen -t rsa -C 'youremail@yourcompany.com' -f ~/.ssh/id-rsa
```

在`~/.ssh/`目录会生成 `id-rsa` 和 `id-rsa.pub` 私钥和公钥。 我们将 `id-rsa.pub` 中的内容粘贴到公司github服务器的SSH-Key的配置中。

## 生成一个github用的SSH-Key

```
$ ssh-keygen -t rsa -C "youremail@your.com” -f ~/.ssh/github-rsa
```

在`~/.ssh/`目录会生成 `github-rsa` 和 `github-rsa.pub` 私钥和公钥。 我们将 `github-rsa.pub` 中的内容粘贴到公司github服务器的SSH-Key的配置中。

## 添加私钥

```
$ ssh-add ~/.ssh/id_rsa 
$ ssh-add ~/.ssh/github_rsa
```

如果执行ssh-add时提示`"Could not open a connection to your authentication agent"`，可以现执行命令：

```
$ ssh-agent bash
```

然后再运行ssh-add命令。可以通过 `ssh-add -l` 来确私钥列表, 可以通过 `ssh-add -D` 来清空私钥列表


## 修改配置文件

在 `~/.ssh` 目录下新建一个config文件

```
$ touch config

```

添加内容：

```    
# gitlab
HostName gitlab.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_rsa
# github
HostName github.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/github_rsa 
```


## 目录结构

cd进入 `~/.ssh` 目录结构如下：

```
    .
    ├── config
    ├── id_rsa
    ├── id_rsa.pub
    ├── id_rsa_ghub
    ├── id_rsa_ghub.pub
    └── known_hosts

```

## 测试

打开终端输入：

```
$ ssh -T git@github.com
```

输出：

```
Hi yugasun! You've successfully authenticated, but GitHub does not provide shell access.
```

就表示成功的链接上github了， 也可以试试链接公司的gitlab.
