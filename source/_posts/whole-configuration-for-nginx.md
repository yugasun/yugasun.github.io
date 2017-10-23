---
title: 本博客 Nginx 配置完整篇
desc: 本博客有关nginx服务器配置介绍，包括https和http2相关介绍
reward: true
date: 2017-08-19 15:06:36
tags:
  - Nginx
  - HTTPS
  - HTTP2
---

最近在进行博客升级HTTPS和HTTP2的时候遇到了各种问题，于是卸载了nginx，重新进行了安装，并参考 [@Jerry Qu](https://imququ.com) 博客完整配置的文章 [本博客 Nginx 配置之完整篇](https://imququ.com/post/my-nginx-conf.html)，由于屈大大的博客服务器是Ubuntu的，本人使用的是一台VPS，系统是Centos6.5，所以很多配置参数需要做相应的修改，其中也遇到了不同的问题，并一一解决了，因此本篇在屈大大原文的基础上进行了相关修改。最终博客实现了全站HTTPS，并升级HTTP1.1到HTTP2。

再次感谢屈大大的博文指引我顺利的完成了Nginx、HTTPS、HTTP2的所有配置。

<!-- more  -->

## 安装依赖

我的 `VPS` 系统是 `Centos6.5`，所有命令均使用 `root` 用户安装，所以省去了 `sudo`, 如果你使用的是其它发行版，与包管理有关的命令请自行调整。

```bash
yum -y install build-essential libpcre3 libpcre3-dev zlib1g-dev unzip git
```

## 获取必要组件

### nginx-ct

`nginx-ct` 模块用于启用 [Certificate Transparency](https://imququ.com/post/certificate-transparency.html) 功能。直接从 Github 上获取源码：

```bash
cd ~
wget -O nginx-ct.zip -c https://github.com/grahamedgecombe/nginx-ct/archive/v1.3.2.zip
unzip
```

### ngx_brotli

本站支持Google开发的 [Brotli](https://github.com/google/brotli) 压缩格式，它通过内置分析大量网页得出的字典，实现了更高的压缩比率，同时几乎不影响压缩/解压速度。

以下就是让 Nginx 支持 Brotli 所需准备工作，这些工作是一次性的。首先安装 libbrotli:

```bash
yum -y install autoconf libtool automake

git clone https://github.com/bagder/libbrotli
cd libbrotli

# 如果提示 error: C source seen but 'CC' is undefined，可以在 configure.ac 最后加上 AC_PROG_CC
./autogen.sh

./configure
make
sudo make install

cd  ../
```

默认 libbrotli 装在 `/usr/local/lib/libbrotlienc.so.1`，如果后续启动 Nginx 时提示找不到这个文件，那么可以把它软链到 `/lib` 或者 `/usr/lib` 目录。如果还有问题，请[参考这篇文章](https://wangqiliang.com/qi-yong-brotli-ya-suo-suan-fa-ti-gao-xing-neng/)查找解决方案。

接下来获取 [ngx_brotli](https://github.com/google/ngx_brotli)源码：

```bash
git clone https://github.com/google/ngx_brotli.git
cd ngx_brotli

git submodule update --init

cd ../
```

### Cloudflare 补丁

本站主要使用了 Cloudflare 的 ChaCha20/Poly1305 for OpenSSL 补丁，以及 Dynamic TLS Records for Nginx 补丁。先来获取补丁文件：

```bash
git clone https://github.com/cloudflare/sslconfig.git
```

### OpenSSL

由于系统自带的 OpenSSL 库往往不够新，推荐在编译 Nginx 时指定 OpenSSL 源码目录，而不是使用系统自带的版本，这样更可控。

本站目前使用 OpenSSL 1.0.2k：

```bash
wget -O openssl.tar.gz -c https://github.com/openssl/openssl/archive/OpenSSL_1_0_2k.tar.gz
tar zxf openssl.tar.gz
mv openssl-OpenSSL_1_0_2k/ openssl
```

打上 ChaCha20/Poly1305 补丁：

```bash
cd openssl
patch -p1 < ../sslconfig/patches/openssl__chacha20_poly1305_draft_and_rfc_ossl102j.patch

cd ../
```

### 添加 `echo-nginx-module`

`echo-nginx-module` 模块为nginx服务，扩展了 `echo`, `sleep`, `time`, `exec` 等非常不错的 `shell` 风格的功能，她提供了各种工具帮助测试和调试nginx服务，项目地址：https://github.com/openresty/echo-nginx-module

```
wget -c https://github.com/openresty/echo-nginx-module/archive/v0.61.tar.gz -O echo-nginx-module.tar.gz
tar zxf echo-nginx-module.tar.gz
```

## 编译并安装Nginx

接着就可以获取Nginx源码，并打上 Dynamic TLS Records 补丁：

```bash
wget -c https://nginx.org/download/nginx-1.12.1.tar.gz
tar zxf nginx-1.12.1.tar.gz

cd nginx-1.12.1/
patch -p1 < ../sslconfig/patches/nginx__1.11.5_dynamic_tls_records.patch

cd ../
```

编译和安装：

```bash
cd nginx-1.12.1/
./configure --add-module=../echo-nginx-module --add-module=../ngx_brotli --add-module=../nginx-ct-1.3.2 --with-openssl=../openssl --with-http_v2_module --with-http_ssl_module --with-http_gzip_static_module

make
make install
```

除了 `http_v2` 和 `http_ssl` 这两个 HTTP/2 必备模块之外，我还额外启用了 `http_gzip_static`，需要启用哪些模块需要根据自己实际情况来决定（注：从 Nginx 1.11.5 开始，`ipv6` 模块已经内置，故 `--with-ipv6` 配置项已被移除）。
以上步骤会把 Nginx 装到 `/usr/local/nginx/` 目录，如需更改路径可以在 configure 时指定。

## 管理脚本与自启动

为了方便管理 Nginx 服务，需要创建一个管理脚本：

```bash
vim /etc/init.d/nginx
```

输入以下内容，这里重新参考了 [Nginx官方管理脚本](https://www.nginx.com/resources/wiki/start/topics/examples/redhatnginxinit/)

```bash
#!/bin/sh
#
# nginx - this script starts and stops the nginx daemon
#
# chkconfig:   - 85 15
# description:  NGINX is an HTTP(S) server, HTTP(S) reverse \
#               proxy and IMAP/POP3 proxy server
# processname: nginx
# config:      /etc/nginx/nginx.conf
# config:      /etc/sysconfig/nginx
# pidfile:     /var/run/nginx.pid

# Source function library.
. /etc/rc.d/init.d/functions

# Source networking configuration.
. /etc/sysconfig/network

# Check that networking is up.
[ "$NETWORKING" = "no" ] && exit 0

nginx="/usr/local/nginx/sbin/nginx"
prog=$(basename $nginx)

NGINX_CONF_FILE="/usr/local/nginx/conf/nginx.conf"

[ -f /etc/sysconfig/nginx ] && . /etc/sysconfig/nginx

lockfile=/var/lock/subsys/nginx

make_dirs() {
   # make required directories
   user=`$nginx -V 2>&1 | grep "configure arguments:.*--user=" | sed 's/[^*]*--user=\([^ ]*\).*/\1/g' -`
   if [ -n "$user" ]; then
      if [ -z "`grep $user /etc/passwd`" ]; then
         useradd -M -s /bin/nologin $user
      fi
      options=`$nginx -V 2>&1 | grep 'configure arguments:'`
      for opt in $options; do
          if [ `echo $opt | grep '.*-temp-path'` ]; then
              value=`echo $opt | cut -d "=" -f 2`
              if [ ! -d "$value" ]; then
                  # echo "creating" $value
                  mkdir -p $value && chown -R $user $value
              fi
          fi
       done
    fi
}

start() {
    [ -x $nginx ] || exit 5
    [ -f $NGINX_CONF_FILE ] || exit 6
    make_dirs
    echo -n $"Starting $prog: "
    daemon $nginx -c $NGINX_CONF_FILE
    retval=$?
    echo
    [ $retval -eq 0 ] && touch $lockfile
    return $retval
}

stop() {
    echo -n $"Stopping $prog: "
    killproc $prog -QUIT
    retval=$?
    echo
    [ $retval -eq 0 ] && rm -f $lockfile
    return $retval
}

restart() {
    configtest || return $?
    stop
    sleep 1
    start
}

reload() {
    configtest || return $?
    echo -n $"Reloading $prog: "
    killproc $nginx -HUP
    RETVAL=$?
    echo
}

force_reload() {
    restart
}

configtest() {
  $nginx -t -c $NGINX_CONF_FILE
}

rh_status() {
    status $prog
}

rh_status_q() {
    rh_status >/dev/null 2>&1
}

case "$1" in
    start)
        rh_status_q && exit 0
        $1
        ;;
    stop)
        rh_status_q || exit 0
        $1
        ;;
    restart|configtest)
        $1
        ;;
    reload)
        rh_status_q || exit 7
        $1
        ;;
    force-reload)
        force_reload
        ;;
    status)
        rh_status
        ;;
    condrestart|try-restart)
        rh_status_q || exit 0
            ;;
    *)
        echo $"Usage: $0 {start|stop|status|restart|condrestart|try-restart|reload|force-reload|configtest}"
        exit 2
esac
```

增加执行权限：

```bash
chmod a+x /etx/init.d/nginx
```

现在管理Nginx只需使用以下命令即可：

```bash
service nginx start|stop|status|restart|condrestart|try-restart|reload|force-reload|configtest
```

设置开机自启动 Nginx：

```bash
chkconfig --add /etc/init.d/nginx
chkconfig nginx on
```

## Nginx 全局配置

到此为止，Nginx 已经安装完毕。再来修改一下它的全局配置，打开 `/usr/local/nginx/conf/nginx.conf`，新增或修改以下内容：

```nginx
# 进程用户
user  nginx;
worker_processes  1;

error_log  /var/log/nginx/yugasun.com/last/error.default.log warn;
pid        /var/run/nginx.pid;


events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"';

    log_format  nginx_cache  '{"remote_addr":"$remote_addr","time_local":"$time_local","request_method":"$request_method","request_uri":"$request_uri","status":"$status","http_referer":"$http_referer","http_user_agent":"$http_user_agent","cache_status":"$upstream_cache_status"}';

    log_format  nodelog  '{"remote_addr":"$remote_addr","time_local":"$time_local","request_method":"$request_method","request_uri":"$request_uri","status":"$status","http_referer":"$http_referer","http_user_agent":"$http_user_agent","cache_status":"$upstream_cache_status"}';

    # 默认编码
    charset  utf-8;

    # 默认日志
    access_log  /var/log/nginx/yugasun.com/last/access.default.log  main;
   
    open_log_file_cache max=1000 inactive=60s;

    sendfile        on;
    tcp_nopush     on;
    tcp_nodelay		on;

    keepalive_timeout  65;

    gzip               on;
    gzip_vary          on;
    gzip_comp_level    6;
    gzip_buffers       16 8k;
    gzip_min_length    1000;
    gzip_proxied       any;
    gzip_disable       "msie6";
    gzip_http_version  1.0;
    gzip_types         text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript image/svg+xml;
    
    # 如果编译时添加了 ngx_brotli 模块，需要增加 brotli 相关配置
    brotli             on;
    brotli_comp_level  6;
    brotli_types       text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript image/svg+xml;


    include vhost/*.conf;
}
```

最后的 `include` 用来加载我个人目录下的配置文件。

要让网站支持浏览器通过 `HTTP/2` 访问必须先部署 `HTTPS`，要部署 `HTTPS` 必须先有合法的证书。本博客目前使用 [Let's Encrypt](http://www.letsencrypt.org/) 的免费证书就足够了，还可以节省一笔开销。

要申请 Let's Encrypt 证书，推荐使用 [Neilpang/acme.sh](https://github.com/Neilpang/acme.sh) 这个小巧无依赖的命令行工具，或者参考屈大大的这篇文章：[Let's Encrypt，免费好用的 HTTPS 证书](https://imququ.com/post/letsencrypt-certificate.html)。

## Web 站点配置

在 `vhost` 目录下新建 `yugasun.com.conf`, 配置如下：

```nginx
server {
    server_name yugasun.com www.yugasun.com;
    root /opt/www/blog/public;
    set $node_port 8360;
    index index.html index.htm;

    # 加载ssl证书
    listen                    	443 ssl http2;

    server_tokens			off;

    # Certificate Transparency
    ssl_ct                      	on;
    ssl_ct_static_scts          	/usr/local/nginx/conf/scts;

    # certs sent to the client in SERVER HELLO are concatenated in ssl_certificate
    ssl_certificate             	/usr/local/nginx/conf/ssl/fullchain.pem;
    ssl_certificate_key         	/usr/local/nginx/conf/ssl/privkey.pem;
    ssl_session_cache          	shared:SSL:50m;
    ssl_session_timeout        	1d;
    ssl_session_tickets		off;

    # intermediate configuration. tweak to your needs.
    ssl_protocols              	TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers                	EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers  	on;

    # OCSP Stapling ---
    # fetch OCSP records from URL in ssl_certificate and cache them
    ssl_stapling               	on;
    ssl_stapling_verify        	on;

    # verify chain of trust of OCSP response using Root CA and Intermediate certs
    ssl_trusted_certificate    	/usr/local/nginx/conf/ssl/root_ca_cert_plus_intermediates.pem;

    # nginx dns resolver
    resolver                   114.114.114.114 valid=300s;
    resolver_timeout           10s;

    # 404重写
    error_page 404 = /404.html;
    
    error_log   /var/log/nginx/yugasun.com/last/error.log   warn;
    access_log  /var/log/nginx/yugasun.com/last/access.log  nginx_cache;

    # 禁止访问admin
    location ^~ /admin {
        return 403;
    }

    if ( $host != 'yugasun.com' ){
        rewrite ^/(.*)$ https://yugasun.com/$1 permanent;
    }

    # 拒绝访问根目录下的js配置
    location ~* ^/[^\/]+\.js$ {
        return 403;
    }

    if ($request_method !~ ^(GET|HEAD|POST|OPTIONS)$ ) {
        return           444;
    }

    etag on;
    gzip on;

    # 静态文件
    location ^~ /static/ {
        add_header                  Access-Control-Allow-Origin *;      
        expires                     max;
    }

    location / {

        proxy_http_version   1.1;

        add_header           Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
        add_header           X-Frame-Options deny;
        add_header           X-Content-Type-Options nosniff;
        #add_header          Content-Security-Policy "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: https: https://yugasun.disqus.com; img-src data: https: http://static.yugasun.com; style-src 'unsafe-inline' https:; child-src https:; connect-src 'self' ws://ai.yugasun.com wss://ai.yugasun.com  https://translate.googleapis.com https://*.disqus.com; frame-src https://disqus.com https://www.slideshare.net; font-src 'self' data: https: https://static.yugasun.com";
        add_header           Public-Key-Pins 'pin-sha256="YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg="; pin-sha256="aef6IF2UF6jNEwA2pNmP7kpgT6NFSdt7Tqf5HzaIGWI="; max-age=2592000; includeSubDomains';


    	proxy_hide_header    Vary;
    	proxy_hide_header    X-Powered-By;

        proxy_set_header     X-Via           Yuga.Sun;
        proxy_set_header     Connection     "upgrade";
        proxy_set_header     Host            $host;
        proxy_set_header     X-Real_IP       $remote_addr;
        proxy_set_header     Upgrade     	$http_upgrade;
        proxy_set_header     X-Forwarded-For $proxy_add_x_forwarded_for;

	    proxy_redirect		off;
    }
    # hexo blog auto build
    location /auto_build {
        proxy_pass http://127.0.0.1:6666;
    }
}

server {
    listen      80;
    server_name yugasun.com www.yugasun.com;

    include 	inc/acme-challenge.conf;

    access_log  off;
    error_log   off;

    add_header strict-transport-security 'max-age=31536000; includeSubDomains; preload';

    location / {
        rewrite ^(.*) https://yugasun.com$1 permanent;
    }
}
```

## 日志自动切分

上一节中，我在 Nginx 的站点配置中通过 `access_log` 指定了访问日志的存放位置。Nginx 启动后，会持续往这个文件写入访问日志。如果网站访问量很大，最好能按照指定大小或者时间间隔切分日志，便于后期管理和排查问题。

虽然本站访问量不大，但我也使用了 `logrotate` 工具对访问日志进行了按天切分。
大多数 Linux 发行版都内置了 `logrotate`，只需新建一个配置文件即可，例如：

```bash
vim /etc/logrotate.d/nginx

# 这里的 /opt/www/nginx_log/ 是站点配置中的 `access_log` 指定存放位置
# nginx.pid 的路径 全局配置 /usr/local/nginx/conf/nginx.conf 中的pid 字段，默认为 /usr/local/nginx/logs/nginx.pid
/opt/www/nginx_log/*.log {
    daily
    rotate 5
    missingok
    notifempty
    sharedscripts
    dateext
    postrotate
        if [ -f /usr/local/nginx/logs/nginx.pid ]; then
            kill -USR1 `cat /usr/local/nginx/logs/nginx.pid`
        fi
    endscript
}
```

配置中的具体指令的含义可以查看 [linux手册](http://www.linuxcommand.org/man_pages/logrotate8.html)。配置好后可以手动执行下，检查是否正常：

```bash
/usr/sbin/logrotate -f /etc/logrotate.d/nginx
```

如果一切无误，后续 Nginx 的访问日志就会自动按天切分，并以年月日作为文件后缀，一目了然。



## 安全测试和评分

一切配置成功后，推荐使用以下两个在线服务来检测站点HTTPS配置：

1. Qualys SSL Labs's SSL Server Test

测试地址：[https://www.ssllabs.com/ssltest/index.html](https://www.ssllabs.com/ssltest/index.html)，以下是本博客测试结果截图：
![ssl-test](https://static.yugasun.com/ssltest.png)
[查看完整测试结果 »](https://www.ssllabs.com/ssltest/analyze.html?d=yugasun.com)


2. HTTP Security Report

测试地址：[https://httpsecurityreport.com/](https://httpsecurityreport.com/)，以下是本博客测试结果截图：
![security-test](https://static.yugasun.com/securitytest.png)
[查看完整测试结果 »](https://httpsecurityreport.com/?report=yugasun.com)

## 参看文献

* [https://imququ.com/post/my-nginx-conf.html](https://imququ.com/post/my-nginx-conf.html)