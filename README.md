# Yuga Sun's Blog

个人博客，基于 [Hexo](https://hexo.io/) 框架开发，并基于主题 [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia) 二次开发。

## 添加文章

```bash
hexo new '文章标题'
```

## 生成静态文件

```bash
yarn gen
```

## mocha 测试

```bash
yarn test
```

## 发布博客

`master` 分支更新时会触发 `Webhook` 钩子，然后  在自己的服务器上自动构建部署，详见个人博文：[使用 Github 的 webhooks 进行网站自动化部署](https://yugasun.com/post/using-github-webhooks-auto-deploy-site.html)

## Feature

- [x] 新增 [腾讯公益 404 页面](http://www.qq.com/404/)
- [x] 锁定 `master` 分支，所有更新必须以 `Pull Request` 形式提交
- [x] 集成 [Travis CI](https://travis-ci.org)服务，对新提交的 `Pull Request` 进行检查
- [x] 新增 `mocha` 测试：对站点核心配置检查，对文章 `Front-matter` 相关变量检查

## License

MIT
