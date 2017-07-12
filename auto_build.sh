#! /bin/bash
SITE_PATH='/opt/www/blog'

cd $SITE_PATH
git reset --hard origin/hexo
git clean -f
git pull
git checkout hexo
hexo g