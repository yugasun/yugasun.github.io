---
title: 傻瓜式部署nodejs开发环境
reward: true
date: 2017-04-30 14:39:24
tags: Nojejs
---

一些

1. 全局更新: yum update -y
2. 安装git,nodejs: yum -y install git nodejs
3. 安装zsh: sudo yum -y install zsh
4. 安装oh-my-zsh: sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

5. 安装nvm, 用来管理node版本：curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.1/install.sh | bash

The script clones the nvm repository to ~/.nvm and adds the source line to your profile (~/.bash_profile, ~/.zshrc, ~/.profile, or ~/.bashrc).

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm

6. 安装nrm，管理npm源： npm i -g nrm
7. 安装yarn 用来管理npm包


