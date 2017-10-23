/**
 * Created Date: Monday, October 23rd 2017, 10:31:56 am
 * Author: yugasun
 * Email: yuga.sun.bj@gmail.com
 * -----
 * Last Modified: Mon Oct 23 2017
 * Modified By: yugasun
 * -----
 * Copyright (c) 2017 yugasun
 */

const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const jsonPath = path.join(__dirname, '..', 'public/content.json')

module.exports = () => {
  if (!fs.existsSync(jsonPath)) {
    console.log(chalk.bgRed.black(' ERROR ') + chalk.red(` '${jsonPath}' is not a file!`))
    process.exit(1)
  }

  let data

  try {
    data = require(jsonPath)
  } catch (e) {
    console.log(chalk.bgRed.black(' ERROR ') + chalk.red(` ${e}`))
    process.exit(1)
  }

  return data
}
