---
title: 前端请求下载文件方案探索
desc: 前端请求下载文件方案探索
date: 2017-03-14 16:25:12
reward: true
tags: Javascript
---

## 前言

Web应用有时需要基于某些用户输入创建文档（PDF, Excel, Word等)。在大多数情况下，这些文档相当简单和快速的创建，允许我们在内存中创建文档，然后再HTTP响应中使用 `Content Disposition: attachment` 将它们发送回请求用户。这导致浏览器文件下载机制允许用户保存或打开生成的PDF。这种方法非常有效。
但是，生成文件有时可能需要几秒钟。这个短的时间端不足以分离到单独的进程，但是这个时间已经足够让等待的用户认为网络出现了问题，并尝试再次点击下载按钮。虽然可以通过屏蔽按钮的方式，避免用户重复点击，但是我们该在什么时候取消按钮屏蔽呢？
<!--more--> 
不幸的是，我不知道任何有关javascript检测文件下载状态的功能。无法监听下载完成事件，按钮将永远被阻止，迫使用户关闭并重新打开该界面。虽然你可以使用某种超时时间来自动取消阻止该按钮，但大多数情况下，可能太早或太晚。

## 方案1

直接通过 `window.open` 方式来独立打开一个tab窗口，发起该请求，当请求完成后，该界面会自动关闭。代码如下：

```javascript
window.open('http://xxx.xxx.xxx/download.xlsx', '_blank', 'fullscreen=no,width=400,height=300');
```

缺点： 虽然可以实现下载功能，但是会打开一个新的界面，影响用户视觉体验，而且新窗口界面很难自定义UI。

## 方案2

通过 a 标签的 `download` 属性， 代码如下：

```html
<a href="http://xxx.xxx.xxx/download.xlsx" download="download.xlsx">下载数据</a>
```

然后点击按钮后，将按钮禁用，防止多次点击，通过超时来取消禁用。

缺点： 虽然实现了静默下载，但是没法监听到文件下载完成事件，不知道何时取消按钮禁用。

## 方案3

其实方案2已经不错了，但是唯一的痛点是 **何时取消按钮禁用?** ，vue中项目代码如下：

模板片段：
```html
<a class="download-btn" @click="handleDownloadAClick" :href="downloadUrl" :download="'学生数据-' + course_id + '-' + group_key">下载数据</a>
```

js片段：
```javascript
export default {
    data: {
      API: {...},
      downloadToken: '',
      downloadFormat: 'xlsx'
    },
    computed:{
        downloadUrl(){
            return `${this.API.downloadUrl}file_format=${this.downloadFormat}&downloadToken=${this.downloadToken}`;
        }
    },
    methods: {
        handleDownloadAClick(e){
            let self = this;
        
            let btn = $(e.currentTarget);
            let now_token = Date.now();
            this.downloadToken = now_token;
            btn.addClass('disabled').html('下载中...');
            let timer = setInterval(function () {
              let token =  $.cookie('downloadToken')
              if( token == now_token ){
                clearInterval(timer);
                timer = null;
                $.removeCookie('downloadToken'); // 清除cookie
                btn.removeClass('disabled').html('下载数据');
              }
            }, 1000);
        
        },
    }
}
```

实现原理是：当客户端发起下载请求的时候，客户端会将当前时间作为get参数传递给服务器端, 然后通过 `setInterval`每 *1000* 毫秒(这个间隔可以自己设置) 会查询 `cookie` 中的 `downloadToken` 参数， 服务收到请求处理完逻辑后，会写一个 `cookie` 字段为 `downloadToken`, 然后返回请求。
因此当客户端检测到 `cookie` 字段 `downloadToken` 的值为发起请求的时间戳时，就表示文件下载请求完成了，此时取消按钮禁用就可以了。

## 总结

方案三灵活的运用了 `cookie` 来交换服务器端和客户端的相关状态（前提是无法通过ajax方式来实现）。  
当然 `a` 标签的 `download` 属性兼容性是需要你关注的，因为本人系统不需要考虑IE低版本。

如果你有更好的方案，欢迎给我发邮件，以便更好的补充，谢谢~

浏览器兼容性如下, [MDN链接](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/a)：

| Feature   | Chrome   | Firefox |      IE     |   Opera   |   Safari   |
|---------- | -------- | ------  | ----------- | --------- |  --------- |   
| download  |    14    |  20.0   |   Edge 13   |    15     |   未实现    |
