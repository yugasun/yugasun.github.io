---
title: Git-为不同分支配置不同远程仓库
date: 2017-03-10 13:59:17
tags: Git
---

假设你从 [Github](https://github.com) 上克隆下来一份别人的优秀代码，然后自己有做了相应的二次开发，但是你又想同时保持源码，并需要做定期的 `pull` 操作。
并希望能将源码新的 `commit` 合并到自己修改后的源码中。而你二次开发的代码存储在自己的私有仓库 `git.mydomain.com` 中。结构如下：

## 逻辑视图

```bazaar
Repo       Branch      Remote Location    (Purpose)
------------------------------------------------------------
myrepo --> private --> git.mydomain.com  (Incremental work)
  |
  +------> public  --> github.com        (Public releases)
```

而且这两份代码是相对独立的，可以做你想要的git操作。

## 实现过程

  1.添加不同的源：

```git
git remote add github git://github.com/foo/myrepo.git
git remote add mydomain git://git.mydomain.com/foo/myrepo.git
```

  2.为不同的分支设置不同的 push 源。  

```git
git branch -u github/public public
git branch -u mydomain/private private
```

两步操作完成后，你就可以使用不同的分支，向不同的远程仓库操作代码了。

注：
当你`checkout public` 分支时，你的 `git` 操作针对的就是 `github.com`  
当你`checkout private` 分支时，你的 `git` 操作针对的就是 `git.mydomain.com`

## 相关文章
* [Git - Different Remote for each Branch](http://stackoverflow.com/questions/15775183/git-different-remote-for-each-branch)





