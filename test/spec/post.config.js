/**
 * Created Date: Monday, October 23rd 2017, 10:32:14 am
 * Author: yugasun
 * Email:  yuga.sun.bj@gmail.com
 * -----
 * Last Modified: Mon Oct 23 2017
 * Modified By: yugasun
 * -----
 * Copyright (c) 2017 yugasun
 */

const expect = require('chai').expect
const posts = require('../getJSON')().posts

/* eslint-disable */
describe('check post config', () => {
  posts.forEach(post => {
    describe(`check in ${post.path}`, () => {
      it(`post.title`, () => {
        expect(post.title).to.be.a('string').and.not.empty
      })

      it(`post.desc`, () => {
        expect(post.desc).to.be.a('string').and.not.empty
      })

      it(`<!--more-->`, () => {
        expect(post.excerpt).to.be.a('string').and.not.empty
      })
    })
  })
})
