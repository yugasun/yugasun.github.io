---
title: Git 快速上手教程
date: 2017-02-14 15:27:41
reward: true
tags: Git
---


Git是个了不起但却复杂的源代码管理系统。它能支持复杂的任务，却因此经常被认为太过复杂而不适用于简单的日常工作。让我们诚实一记吧：Git是复杂的，我们不要装作它不是。但我仍然会试图教会你用（我的）基本的Git和远程代码库干活的工作步骤，在15分钟内。

<!-- more -->

## 安装Git

在大多数*nix系统（Linux、OS X）上，Git已经被安装了。你通过发送下面的命令，可以通过Git自身，把它更新到最新的的开发版本（不推荐）。

```bash
git clone https://github.com/git/git
```

在Windows上，你可以在这里下载Git的安装程序。如果你真的需要其他系统的安装程序，Mac OSX安装文件在这里，Linux的操作指导在这里。


## 创建一个远程代码库

直接在[Github](https://github.com 'GitHub')注册账号。

## 设置Git

在我们能用Git工作之前，我们需要做个一次性的配置。为了Git能跟踪到谁做了修改，我们需要设置你的用户名(GitHub 账号)。

```bash
git config --global user.name "your_username"
git config --global user.email your_email@domain.com
```

我们也会设定推送*push*的默认值为`simple`。要了解这是什么意思，快速阅读我之前发布的关于推送的默认值（非必须）。发送这条命令：

```bash
git config --global push.default simple
```

我们都设好了。你无需在你的机器上再重复这些配置，但如果你在另一台机器上工作的话，不要忘记这些配置。如果你忘记做初始的配置，Git不会允许你提交任何东西，这会让你困扰。


## 创建一个本地代码库

作为例子，我们会假装我们有一个网站（无所谓技术）存在于我们机器上的`workspace`文件夹下的`my_site`文件夹内。在命令行中，去到你的站点的根文件夹。在Mac和Linux上：

```bash
cd ~/workspace/my_site/
```

在Windows上：

```bash
cd c:\workspace\my_site
```

我们首先需要告诉Git这个文件夹是我们需要跟踪的项目。所以我们发送这个命令来初始化一个新的本地Git代码库 

```bash
git init
```

Git会在my_site文件夹内创建一个名为.git的隐藏文件夹，那就是你的本地代码库。


## 加载（Stage）文件

我们现在需要命令Git我们需要加载`stage`所有项目文件。发送：

```bash
git add .
```

最后的`.`符号的意思是`所有文件、文件夹和子文件夹`。假如我们只想要把特定文件添加到源代码控制中去，我们可以指定它们：

```bash
git add my_file, my_other_file
```


## 提交文件

现在，我们想要提交已加载 `staged` 的文件。阅读 *添加一个时间点，在这里你的文件处在一个可还原的状态* 。我们提交我们的文件时，总是附带着有意义的注释，描述了它们现在的状态。我一直用`initial commit`来作为第一个提交的注释。

```bash
git commit -m "initial commit"
```

就这样。现在你随时都可以回滚到这个提交状态。如果你有需要检查你现在的已加载 `staged` 和未加载 `unstaged` 文件的状态、提交等，你可以询问git的状态：

```bash
git status
```


## 创建分支

建立分支是你创建代码的独立版本的动作，独立于你的主干分支。默认地，每次你提交到Git的文件都会被储存到 *master(主干)* 分支。 
现在我们来说说，你想要向项目里添加一个功能，但你想要能够回滚到现在版本，以防出现差错，或者你决定要放弃这个功能。这就是你创建分支的时候了。创建并同时切换到你新建的分支，发送： 

```bash
git checkout -b new_feature
```

或者，你可以先创建一个分支然后手动切换，就像这样：

```bash
git branch new_featuregit checkout new_feature
```

要看你现在项目下所有的分支，发送这个：

```bash
git branch
```

现在你可以在你的项目上无所顾忌地做任何你想做的：任何时候，你都可以回到你创建分支前的状态。注意，你同时可以有多个分支，甚至可以从一个分支上再创建一个分支。


## 从远程分支创建本地不存在分支

```bash
git fetch
git checkout -b branch_name <remote_name>/branch_name
```

## 合并分支

当你对你的新功能满意了的时候，你想要把它加到主干分支上。当你在你的新功能分支上时，你首先需要加载`stage`并且提交你的文件：

```bash
git add .git commit -m "adds my new feature"
```

然后你移到你的主干分支：

```bash
git checkout master
```

像这样合并：

```bash
git merge new_feature
```

此时，你的主干分支和你的新功能分支会变成一样的了。

## 丢弃分支

相反，如果你打算丢弃你在分支里做的修改，你首先需要加载`stage`你的文件并且在分支里提交：

```bash
git add .git commit -m "feature to be discarded"
```

然后，你移到主干分支：

```bash
git checkout master
```

现在，你的代码处于你创建分支之前的状态了。

## 切换分支

切换自己想要的分支：

```bash
git checkout my_branch
```

现在使用分支为my_branch

## 删除一个分支

如果你要把你的分支合并到主干分支，从主干 *master* 分支上发送：

```bash
git branch -d new_feature
```

假如修改已经合并了，它只会删除分支。假如分支没有合并，你会得到一个错误信息。删除一个未合并的分支（通常你不想保留的修改），你需要发送一样的命令附带一个大写D。意思是 _强制删除分支，无论如何我不想要它了_ .

```bash
git branch -D new_feature
```

## 删除一个远程分支

`branch_name`为远程分支名称

```bash
git push origin --delete branch_name
```


## 回滚到之前的提交状态

在某些时候，你可能想要回到之前的代码版本。首先，你需要找到你想回到哪个版本。要看所有的完成了的提交，发送：

```bash
git log
```

这会输出你的提交的历史记录，像这样：

```bash
commit 50edd24f4c2b0494ebc5119d169dbfa2d6cf0e0c
Author: Yuga Sun <yuga_sun@163.com>
Date:   Thu Jan 26 11:35:00 2017 +0800

    add site local search feature

commit f77ad969a306b12ac002c5fed27748a96c28e8d0
Author: Yuga Sun <yuga_sun@163.com>
Date:   Thu Jan 26 11:19:08 2017 +0800

    update git ignore

```

如果你想回到`adds my new feature`这个提交，简单地用提交的ID做迁出（checkout）（我通常只用到ID开头的9个字符）

```bash
git checkout 50edd24f4
```

你也可以迁出到一个新的分支，像这样：

```bash
git checkout -b my_previous_version 085bb3bcb
```

只是别太疯狂了！你的分支越复杂，就越难确定你真正在做什么。


## 推送到远程代码库

在第一次你想推送一个本地代码库到远程代码库时，你需要把它添加到你的项目配置里。像这样做：

```bash
git remote add origin https://github.com/your_username/name_of_remote_repository.git
```

注意这里的`origin`只是一个习惯。它是你的远程代码库的别名，但是你可以用其他任何你喜欢的词。你甚至可以有多个远程代码库，你只需要给它们起不同的别名。 
之后，你想要推送你的本地代码库的主干分支到你的远程代码库：

```bash
git push origin master
```


## 取得远程代码库的一份本地拷贝

如果你还没有一份远程代码库的本地版本（例如，如果你在另一台机器上开始工作，这台机器上还没有用过这个项目），你首先需要拷贝`clone`它。去到你的代码库想要拷贝到的文件夹下，并发送：

```bash
git clone https://github.com/your_username/name_of_remote_repository.git
```

另一方面，如果你已经在本地的项目上工作了，只是想从远程代码库上取得它最新的版本，移动到项目的根目录下，并发送：

```bash
git pull origin master
```

## 别名

Git允许你为你常用的命令创建快捷方式（别名）。例如，如果你不想每次都输入`git commit -m 'some comment'`，而是输入`git c 'some comment'`，你可以向你的git全局配置里添加一个别名来实现，像这样：

```bash
git config --global alias.c 'commit -m'
```

这是我使用的别名列表：

```bash
git config --global alias.gc 'git commit -m'
git config --global alias.gco 'git checkout'
git config --global alias.gcob 'git checkout -b'
git config --global alias.gbr 'git branch'
git config --global alias.gmg 'git merge'
git config --global alias.gaa 'git add .'
git config --global alias.gss 'git status'
git config --global alias.gdbr 'git branch -d'
```

## 将项目子目录发布为Github Pages

`dist`为需要发布的目录

```bash
git subtree push —prefix dist origin gh-pages
```