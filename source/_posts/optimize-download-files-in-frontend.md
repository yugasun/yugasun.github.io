---
title: 前端js下载文件方案探索
desc: 前端js下载文件方案探索
date: 2017-12-13 20:25:12
reward: true
tags: 
    - Javascript
    - File Download
---

## 前言

我们知道，下载文件是一个非常常见的需求，但通常只能通过访问某个文件的 url 来实现下载功能，但是这种用户体验非常不好。幸好，HTML 5 里面为 `<a>` 标签添加了一个 [download](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/a) 的属性，来方便我们下载文件。但是最近一个需求，迫使我不得不寻求新的下载方案，于是便有了更新后的此文。

<!--more--> 

下面将介绍几种文件下载方案。

## 创建新窗口请求

直接通过 `window.open` 方式来独立打开一个tab窗口，发起该请求，当请求完成后，该界面会自动关闭。代码如下：

```html
<button class="download-btn" type="primary" onclick="downloadFile">下载数据</button>
<script>
function downloadFile() {
    window.open('http://xxx/download?param=1&param2', '_blank', 'fullscreen=no,width=400,height=300');
}
</script>
```

## 创建隐藏form表单提交

代码如下：

```html
<button class="download-btn" type="primary" onclick="downloadFile">下载数据</button>
<script>
function downloadFile() {
    var form = document.createElement('form')
    form.setAttribute('action', 'http://xxx/download?param=1&param2')
    form.setAttribute('method', 'get')
    form.setAttribute('target', '_blank')
    form.setAttribute('style', 'display:none')
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form)
}
</script>
```

当然也可以通过动态创建 `iframe` 访问 url的方式，实现效果类似。

## A标签 `download` 属性 - 方法1

由于以上方案均会打开一个新的窗口，影响用户视觉体验，而且新窗口界面很难自定义UI。

于是HTML5 里面为 `<a>` 标签添加了一个 [download](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/a) 的属性，来方便我们下载文件。

> 此属性指示浏览器下载URL而不是导航到URL，将提示用户将其保存为本地文件。

利用此属性可以不用打开新窗口，也可以请求URL下载文件，很好地弥补上面提到的缺陷。

代码如下：

```html
<a href="http://xxx/download?param1=xxx&param2=yyy" download="download.xlsx">下载数据</a>
```

浏览器兼容性如下：

| Feature   | Chrome   | Firefox |      IE     |   Opera   |   Safari   |
|---------- | -------- | ------  | ----------- | --------- |  --------- |   
| download  |    14    |  20.0   |   Edge 13   |    15     |   未实现    |

## A标签 `download` 属性 - 方法2

虽然 `方法1` 实现了静默下载，但是没法监听到文件下载完成事件，没法很好地通过UI提示的方式来告知用户下载完成事件。于是对 `<a>` 标签做了进一步改进，监听点击事件，然后在点击的时候在URL请求上添加唯一 `token`，传递到服务器端，当服务器端文件生成功后，将 `token` 写入 `cookie`，前端通过定时器定时检测 `cookie` 中的 `token`值，如果和 `请求时提交的token` 一致，则提示用户下载成功。

代码如下：

```html
<a class="download-btn" onclick="handleClick" href="http://xxx/download?param1=xxx&param2=yyy" download="学生数据.xlsx">下载数据</a>
<script>
function handleClick(e){
    let btn = $(e.currentTarGET);
    let now_token = Date.now();
    let oldHref = btn.attr('href')
    btn.attr('href', `${oldHref}&token=${now_token}`)
    btn.addClass('disabled').html('下载中...');
    let timer = setInterval(function () {
        let cookie_token =  $.cookie('token')
        if( now_token == cookie_token ){
            clearInterval(timer);
            timer = null;
            $.removeCookie('token'); // 清除cookie
            btn.removeClass('disabled').html('下载数据');
        }
    }, 1000);
}
</script>
```

此方案的确很不错，基本可以满足大部分需求了，但是最近项目做了更新后，不能下载了，经过排查发现 `<a>` 标签请求的 URL 由于加了很多过滤参数，使得URL超过了 `nginx` 请求头的buffer限制，甚至超过了浏览器限制的最大长度，因此不得不将 GET URL 的方式修改为 Ajax POST的方式，于是才有了下面的新方案。

## Ajax `POST` 方式

刚开始想通过动态创建 form 表单，然后发起 POST 请求，但是这种方式又回归打开新窗口的用户不友好方式......o(╯□╰)o。

于是想是否可以通过ajax POST获取数据，然后在客户端生成 Excel 文件呢？

通过搜索，发现可以借助js处理 Excel 文件的开源项目 [js-xlsx](https://github.com/SheetJS/js-xlsx)，她可以作为各种 Excel 文件的解析器和写入器。

思路如下：

> 1. 通过ajax POST 方式获取json数据
> 2. 通过 js-xlsx 工具创建 Excel `workbook`， 并将 json 数据转化为 Excel 的 `worksheet`。
> 3. 通过 js-xlsx 生成字节流，然后通过 [FileSaver](https://github.com/eligrey/FileSaver.js/) 工具存储为 `.xlsx` 文件。

实现代码如下：

```html
<button class="download-btn" type="primary" onclick="downloadFile">下载数据</button>
<script type="text/javascript" src="/path/to/shim.js"></script>
<script src="/path/to/xlsx.full.min.js"></script>
<script src="/path/to/FileSaver.min.js"></script>
<script>
/**
 * axios POST 方式下载存储为 .xlsx 文件
 */
function downloadFile () {
    const btn = $('.download-btn')
    btn.addClass('disabled').html('下载中...');

    axios.post('http://xxx/download', {
        param1: 'xxx',
        param2: 'yyy'
    }).then((res) => {
        const data = XLSX.utils.json_to_sheet(res.data)
        var workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, data, 'string')

        var wbout = XLSX.write(workbook, { bookType: 'xlsx', bookSST: false, type: 'binary' })

        saveAs(new Blob([s2ab(wbout)], {type: 'application/octet-stream'}), `download.xlsx`)

        btn.removeClass('disabled').html('下载数据');
    }).catch((e) => {
        console.log(e)
    })
}

/**
 * 将 binary string 转化为 array buffer
 */
function s2ab (s) {
    var buf = new ArrayBuffer(s.length)
    var view = new Uint8Array(buf)
    for (var i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF
    return buf
}
</script>
```

由于 [FileSaver](https://github.com/eligrey/FileSaver.js/) 利用了HTML5新特性 [Blob](https://developer.mozilla.org/zh-CN/docs/Web/API/Blob) ，随意存在兼容性，官方支持浏览器如下：

| Browser        | Constructs as | Filenames    | Max Blob Size | Dependencies |
| -------------- | ------------- | ------------ | ------------- | ------------ |
| Firefox 20+    | Blob          | Yes          | 800 MiB       | None         |
| Firefox < 20   | data: URI     | No           | n/a           | [Blob.js](https://github.com/eligrey/Blob.js) |
| Chrome         | Blob          | Yes          | [500 MiB][3]  | None         |
| Chrome for Android | Blob      | Yes          | [500 MiB][3]  | None         |
| Edge           | Blob          | Yes          | ?             | None         |
| IE 10+         | Blob          | Yes          | 600 MiB       | None         |
| Opera 15+      | Blob          | Yes          | 500 MiB       | None         |
| Opera < 15     | data: URI     | No           | n/a           | [Blob.js](https://github.com/eligrey/Blob.js) |
| Safari 6.1+*   | Blob          | No           | ?             | None         |
| Safari < 6     | data: URI     | No           | n/a           | [Blob.js](https://github.com/eligrey/Blob.js) |
| Safari 10.1+   | Blob          | Yes          | n/a           | None         |


## 总结

前端下载文件方案主要分为 `GET` 和 `POST` 两种方式，`GET` 方式相对简洁，但是对 `url` 长度有限制，`POST` 则没有，但是浏览器需要支持相关API。实际开发中，可以视项目需求而定。

如果你有更好的方式，欢迎发邮件或评论，一起讨论学习~
