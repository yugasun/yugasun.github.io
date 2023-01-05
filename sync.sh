#!/bin/bash

set -e

rsync -av --progress ./public aliyun:/opt/www/blog
