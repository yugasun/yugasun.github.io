/**
 * Created Date: Monday, October 23rd 2017, 10:32:32 am
 * Author: yugasun
 * Email: yuga.sun.bj@gmail.com
 * -----
 * Last Modified: Mon Oct 23 2017
 * Modified By: yugasun
 * -----
 * Copyright (c) 2017 yugasun
 */

const expect = require('chai').expect
const data = require('../getJSON')()

/* eslint-disable */
describe('check site config', () => {
  it('meta', () => {
    expect(data.meta).to.be.a('object').and.not.undefined
  })

  it('config.title', () => {
    expect(data.meta.title).to.be.a('string').and.not.empty
  })

  it('config.subtitle', () => {
    expect(data.meta.subtitle).to.be.a('string').and.not.empty
  })

  it('config.description', () => {
    expect(data.meta.description).to.be.a('string').and.not.empty
  })

  it('config.author', () => {
    expect(data.meta.author).to.be.a('string').and.not.empty
  })

  it('config.url', () => {
    expect(data.meta.url).to.be.a('string').and.not.empty
  })
})
