---
title: Webpack1 升级 Webpack2 指南
date: 2017-03-08 15:39:21
tags: 
 - Webpack
---

本文译自官方[英文文档](https://webpack.js.org/guides/migrating/)

本文更像是一篇Change Log介绍，不涉及的webpack2使用教程，感兴趣的可以自行谷歌。之所以直接翻译官方文档，因为只有掌握了Webpack2 之于 webpack1的区别和修改，才能更好地进行项目升级。
对于具体的项目升级实例，将会在后面的有关Vue项目介绍中提及。
Webpack2对于Webpack1相关配置修改如下：
<!-- more --> 
## `resolve.root`, `resolve.fallback`, `resolve.modulesDirectories`

这下配置被替代成单个配置项 `resolve.modules` . 更多细节请参考 [resolving](https://webpack.js.org/configuration/resolve)。

``` diff
  resolve: {
-   root: path.join(__dirname, "src")
+   modules: [
+     path.join(__dirname, "src"),
+     "node_modules"
+   ]
  }
```

## `resolve.extensions`

此配置项不再接受空字符串配置项了，而且相关配置被转移到 `resolve.enforceExtension` 中. 更多细节请参考 [resolving](https://webpack.js.org/configuration/resolve)。

## `resolve.*`

此配置项做了较多更改. 这里没用介绍过多细节，因为此配置项很少被用到. 更多细节请参考 [resolving](https://webpack.js.org/configuration/resolve)。

## `module.loaders` 更名为 `module.rules`

现在有个更加强大的规则系统来支撑旧的 `loader` 配置，它除了用来配置 `loaders` ,还有很多其他的功能。
为了向下兼容，旧的 `module.loaders` 语法仍然支持。 
新的命名规则也很好理解，因此升级到新的配置 `module.rules` 也很容易。

``` diff
  module: {
-   loaders: [
+   rules: [
      {
        test: /\.css$/,
-       loaders: [
-         "style-loader",
-         "css-loader?modules=true"
+       use: [
+         {
+           loader: "style-loader"
+         },
+         {
+           loader: "css-loader",
+           options: {
+             modules: true
+           }
+         }
        ]
      },
      {
        test: /\.jsx$/,
        loader: "babel-loader", // 这里不要使用 "use"
        options: {
          // ...
        }
      }
    ]
  }
```

## 链式 `loaders` 

在 Webpack v1 中，`loaders` 可以被链式的调用并在 `loader` 之间传递结果。使用 [rule.use](https://webpack.js.org/configuration/module#rule-use) 配置项，可以用来设置一系列的 `loader`.
在 webpack v1 中， `loader` 通常是通过 `` 来连接的。 这种写法现在仅在保留的参数`module.loaders` 中使用。

``` diff
  module: {
-   loaders: {
+   rules: [{
      test: /\.less$/,
-     loader: "style-loader!css-loader!less-loader"
+     use: [
+       "style-loader",
+       "css-loader",
+       "less-loader"
+     ]
    }]
  }
```

## 自动 `-loader` 模块命名补全功能已经被废弃了

现在配置 `loader` 不能省略后面的 `-loader`了。

``` diff
  module: {
    rules: [
      {
        use: [
-         "style",
+         "style-loader",
-         "css",
+         "css-loader",
-         "less",
+         "less-loader",
        ]
      }
    ]
  }
```

你也可以通过配置 `resolveLoader.moduleExtensions` 来省略 `-loader` 后缀，不过最好不要这么干。

``` diff
+ resolveLoader: {
+   moduleExtensions: ["-loader"]
+ }
```

参考 [#2986](https://github.com/webpack/webpack/issues/2986) ，你可以找到此项修改的原因。

## `json-loader` 不再需要配置了

现在 [`json-loader`](https://github.com/webpack/json-loader) 已经内置到 Webpack v2了，所以你不用再配置它了.

``` diff
  module: {
    rules: [
-     {
-       test: /\.json/,
-       loader: "json-loader"
-     }
    ]
  }
```

[我们这么做](https://github.com/webpack/webpack/issues/3363) 是为了减少消除 webpack, node.js 和 browserify 之间的差异.

##  关于 `loader` 在配置中相对于上下文来解析

Webpack 1 的 `loader` 在配置中是相对于文件来解析的。
现在 Webpack2 `loader` 在配置中是相对于上下文来解析。
这相更改也解决了 当使用 `npm link`时，`loader` 造成的重复模块的一些问题，当然对于相关模块不在上下文问题也得到了解决。
之前也许你需要做一些 hack 来解决此类问题。

``` diff
  module: {
    rules: [
      {
        // ...
-       loader: require.resolve("my-loader")
+       loader: "my-loader"
      }
    ]
  },
  resolveLoader: {
-   root: path.resolve(__dirname, "node_modules")
  }
```

## `module.preLoaders` 和 `module.postLoaders` 配置被废弃了

``` diff
  module: {
-   preLoaders: [
+   rules: [
      {
        test: /\.js$/,
+       enforce: "pre",
        loader: "eslint-loader"
      }
    ]
  }
```

## 关于 `UglifyJsPlugin` sourceMap 配置

现在 `UglifyJsPlugin` 的配置项 `sourceMap` 默认为 `false`(之前默认是`true`);
这就意味着，如果你想在压缩代码中使用源代码映射，或者想要知道 uglifyjs 插件警告的确切的行号，你就需要配置 `UglifyJsPlugin` 的 `sourceMap` 为 `true`;

``` diff
  devtool: "source-map",
  plugins: [
    new UglifyJsPlugin({
+     sourceMap: true
    })
  ]
```

## 关于`UglifyJsPlugin` 警告

现在`UglifyJsPlugin` 的配置项 `compress.warnings` 默认值从 `true` 修改为 `false`;
这就意味着如果你需要看到 uglifyjs 的警告，你就需要设置 `compress.warnings` 为 `true`;

``` diff
  devtool: "source-map",
  plugins: [
    new UglifyJsPlugin({
+     compress: {
+       warnings: true
+     }
    })
  ]
```

## 关于`UglifyJsPlugin` 最小化 loader

`UglifyJsPlugin` 现在不会自动切换 loader 到 最小化模式了。 需要配置 `minimize: true` 来完成。请参考官方有关 loader 相关配置文档。
loader 的最小化模式可能在今后的版本移除。
为了兼容旧的 `loader` 切换到最小化模式，可以通过配置 `LoaderOptionsPlugin` 插件。

``` diff
  plugins: [
+   new webpack.LoaderOptionsPlugin({
+     minimize: true
+   })
  ]
```

## `DedupePlugin` 已经被废弃了

`webpack.optimize.DedupePlugin` 已经被废弃了， 请从你的配置中移除。

## `BannerPlugin` - 部分修改

`BannerPlugin`  现在通过接受单个对象为配置项。

``` diff
  plugins: [
-    new webpack.BannerPlugin('Banner', {raw: true, entryOnly: true});
+    new webpack.BannerPlugin({banner: 'Banner', raw: true, entryOnly: true});
  ]
```

## `OccurrenceOrderPlugin` 默认集成

现在不必要在配置中特别制定了。

``` diff
  plugins: [
-   new webpack.optimize.OccurrenceOrderPlugin()
  ]
```

## `ExtractTextWebpackPlugin` - 部分修改

Webpack2 需要 [ExtractTextPlugin](https://github.com/webpack/extract-text-webpack-plugin) 版本2以上才可使用。

`npm install --save-dev extract-text-webpack-plugin`

此项配置的修改主要是在语法层的。

### 关于 `ExtractTextPlugin.extract`

```diff
module: {
  rules: [
    {
      test: /.css$/,
-      loader: ExtractTextPlugin.extract("style-loader", "css-loader", { publicPath: "/dist" })
+      use: ExtractTextPlugin.extract({
+        fallback: "style-loader",
+        use: "css-loader",
+        publicPath: "/dist"
+      })
    }
  ]
}
```

### 关于 `new ExtractTextPlugin({options})`

```diff
plugins: [
-  new ExtractTextPlugin("bundle.css", { allChunks: true, disable: false })
+  new ExtractTextPlugin({
+    filename: "bundle.css",
+    disable: false,
+    allChunks: true
+  })
]
```

## 现在默认不能完全动态加载


只有一个表达式的依赖（即`require（expr）`）现在将创建一个空上下文，而不是整个目录的上下文。
最好重构你的代码，如果它不兼容ES2015模块。如果实在没法重构，你可以使用 `ContextReplacementPlugin` 来提示编译器正确解析。

### 在CLI和配置中使用自定义参数

如果你在配置中滥用 CLI 自定义参数，如下：

`webpack --custom-stuff`

``` js
// webpack.config.js
var customStuff = process.argv.indexOf("--custom-stuff") >= 0;
/* ... */
module.exports = config;
```

你会发现这是不被允许的。现在CLI更加的严谨了。

当然有个接口可供配置CLI接受参数，最好使用下面的方案。

`webpack --env.customStuff`

``` js
module.exports = function(env) {
  var customStuff = env.customStuff;
  /* ... */
  return config;
};
```

参考 [CLI](https://webpack.js.org/api/cli).

## `require.ensure` 和 AMD `require` 是异步的

如果模块已经加载了，函数将不再是同步调用，而是异步执行

**nb `require.ensure` 现在是基于原生的 `Promise` 对象. 如果使用了 `require.ensure` 的执行环境中缺少 `Promise`对象，Promise polyfill. **

## 关于 `loader` 通过 `options` 来配置

现在没法在 `webpack.config.js` 中为一个 `loader` 配置自定义属性，必须通过 `options` 来完成。下面 `ts` 的配置将不再生效。 

```js
module.exports = {
  ...
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader'
    }]
  },
  // does not work with webpack 2
  ts: { transpileOnly: false }
}
```

### 什么是 `options`?

问得好！好吧，严格的讲，它是可能是两个事，都是来配置webpack loader的。webpack1 `options` 被称为 `query`，并且是一个可以附加到 loader 名称后的的字符串，更像是一个 功能更加强大的 `query` 字符串 - [greater powers](https://github.com/webpack/loader-utils#parsequery) :

```js
module.exports = {
  ...
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader?' + JSON.stringify({ transpileOnly: false })
    }]
  }
}
```

它也可以配置成 loader 的一个单独的特殊对象属性:

```js
module.exports = {
  ...
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader',
      options:  { transpileOnly: false }
    }]
  }
}
```

## 关于`LoaderOptionsPlugin` 执行环境

一些 loader 需要从配置中获得执行上下文相关信息的配置, 这将通过 loader 的 `options` 来配置。可自行查看相关文档。
当然也可以兼容旧的 loader 插件配置：

``` diff
  plugins: [
+   new webpack.LoaderOptionsPlugin({
+     options: {
+       context: __dirname
+     }
+   })
  ]
```

## 关于 `debug`

在webpack1中，`debug` 是用来配置 loader 为 调试模式的。webpack2中将使用通过 `loader` 的 `options` 来配置。
之后的版本将废弃 `loader` 的调试模式。

为了兼容旧的 loader 配置， 可以配置如下：

``` diff
- debug: true,
  plugins: [
+   new webpack.LoaderOptionsPlugin({
+     debug: true
+   })
  ]
```

## 使用ES2015拆分代码

在webpack1中，你可以使用[`require.ensure`](https://webpack.js.org/guides/code-splitting-require) 方法来懒加载模块。

```javascript
require.ensure([], function(require) {
  var foo = require("./module");
});
```

ES2015 loader 预定义 [`import()`](https://webpack.js.org/guides/code-splitting-import) 方法来在运行时动态加载 ES2015 模块。
webpack 以 `import()`  为分割点来分割 依赖模块 为不同的模块。
`import()` 使用模块名作为参数，并且返回一个 Promise 对象。

``` js
function onClick() {
  import("./module").then(module => {
    return module.default;
  }).catch(err => {
    console.log("Chunk loading failed");
  });
}
```

好消息：因为是基于 `Promise` 的，所以现在可以处理模块加载失败的问题。
警告：`require.ensure` 允许使用带有可选的第三个参数的模块命名， 但是 `import` API 还没发提供相关兼容性。如果你想继续起作用，可以像下面一样使用 `require.ensure`：

```javascript
require.ensure([], function(require) {
  var foo = require("./module");
}, "custom-chunk-name");
```

## 动态表达式

`import()`现在可以接受一个部分表达式作为参数。这跟 CommonJS (webpack 创建了一个处理所有文件的执行环境 [context](https://webpack.github.io/docs/context.html) ) 中使用的表达式处理方法类似。
`import()` 为每个可能的模块创建了一个独立的块。

``` js
function route(path, query) {
  return import(`./routes/${path}/route`)
    .then(route => new route.Route(query));
}
// This creates a separate chunk for each possible route
```

## ES2015中混合使用 AMD 和 CommonJS 

由于 AMD 和 CommonJS, 你可以自由的使用所有的第三方模块类型（甚至在同一个文件中）。webpack 这种处理方式跟 `babel` 和 `node-eps` 有点类似：

```javascript
// CommonJS consuming ES2015 Module
var book = require("./book");

book.currentPage;
book.readPage();
book.default === "This is a book";
```

```javascript
// ES2015 Module consuming CommonJS
import fs from "fs"; // module.exports map to default
import { readFileSync } from "fs"; // named exports are read from returned object+

typeof fs.readFileSync === "function";
typeof readFileSync === "function";
```

你需要 让 Babel 不要解析这些模块符号，这样webpack才能使用它们。你可以在你的 `.babelrc` 文件中设置如下：

**.babelrc**

```json
{
  "presets": [
    ["es2015", { "modules": false }]
  ]
}
```

### 关于模板字符串

webpack现在支持末班字符串表达式。这意味着你可以在你的 `webpack` 结构中使用了。

``` diff
- require("./templates/" + name);
+ require(`./templates/${name}`);
```

### 关于 Promise 配置

现在webpack支持从配置文件返回一个 `Promise` 对象。这这样允许你在配置文件中异步的执行某些操作。

**webpack.config.js**

``` js
module.exports = function() {
  return fetchLangs().then(lang => ({
    entry: "...",
    // ...
    plugins: [
      new DefinePlugin({ LANGUAGE: lang })
    ]
  }));
};
```

### 更加高级的 `loader` 匹配

webpack 现在支持更多的 `loader` 匹配方式

``` js
module: {
  rules: [
    {
      resource: /filename/, // matches "/path/filename.js"
      resourceQuery: /^\?querystring$/, // matches "?querystring"
      issuer: /filename/, // matches "/path/something.js" if requested from "/path/filename.js"
    }
  ]
}
```

### 更多的 CLI 配置项

有一些新的 CLI 配置项可供使用：

`--define process.env.NODE_ENV="production"` 参考 [`DefinePlugin`](https://webpack.js.org/plugins/define-plugin/).

`--display-depth`  显示每个模块到入口文件的距离

`--display-used-exports`  显示导出在模块中使用的有关信息。 

`--display-max-modules`  设置输出中现实的模块数（默认为15）

`-p`  可以定义 `process.env.NODE_ENV` 在 `"production"` 中.

## 关于 loader 修改

仅仅修改了一些相关loader的作者。

### 关于缓存功能

loader 现在都是默认可缓存的。 如果需要loader不可缓存，需要额外配置。

``` diff
  // Cacheable loader
  module.exports = function(source) {
-   this.cacheable();
    return source;
  }
```

``` diff
  // Not cacheable loader
  module.exports = function(source) {
+   this.cacheable(false);
    return source;
  }
```

### 多样化的配置

webpack1 仅仅支持 `JSON.stringify` 类型的配置。
webpack2 现在支持 任何 JS 对象作为loader配置。
使用多样化的配置仅有一个限制，你需要为 loader 的 `options` 属性配置一个 `ident` 属性，一遍被其他的 loader 引用。
添加 `ident` 配置在 `options` 中意味着能够在内联 loader 中引用此项配置，如下： 

`require("some-loader??by-ident!resource")`

``` js
{
  test: /.../,
  loader: "...",
  options: {
    ident: "by-ident",
    magic: () => return Math.random()
  }
}
```

通常情况下不推荐使用这种内联方式，但是 `loader` 生成的代码经常使用它。
例如，`style-loader` 生成一个依赖于剩余请求的模块（它会输出css）

``` js
// style-loader generated code (simplified)
var addStyle = require("./add-style");
var css = require("-!css-loader?{"modules":true}!postcss-loader??postcss-ident");

addStyle(css);
```

如果你使用了多样化的配置，请告诉你的用户关于 `ident` 配置。



