---
title: ES6 的扩展(spread)与剩余(rest)运算
reward: true
date: 2017-04-13 11:19:02
tags: Javascript
---


> **扩展语法** 允许在需要多个参数（用于函数调用）或多个元素（用于数组文本）或多个变量（用于解构分配）的位置扩展表达式.
> **剩余参数**（rest parameter）允许长度不确定的实参表示为一个数组。
> 扩展 - `spread` 运算符是三个点`...` 。它好比 剩余 - `rest` 参数的逆运算，将一个数组转为用逗号分隔的参数序列。

<!-- more -->

## 扩展语法 - spread

直接上代码：

```javascript
console.log(...[1,2,3]);  // 1 2 3

console.log(1, ...[2,3,4], 5); // 1 2 3 4 5

console.log([1, ...[2,3,4], 5]); // [1, 2, 3, 4, 5]
```

所以这里可以用来替换数组的 `concat` 函数，以往我们合并数组，需要 `var arr3 = arr1.concat(arr2)`, 如果使用扩展运算符，代码如下：

```javascript
var arr3 = [...arr1, ...arr2];
```

对数组的扩展运算，目前已经是 ES6 标准中，但是还有在 ES6 - stage3 中，对对象也做了相应的扩展, 方法跟数组类似

```javascript
let obj1 = {a:1, b:2};
let obj2 = {c:3,b:{e:4,f:5}};
let obj3 = { ...obj1, ...obj2 }; 
console.log(obj3); // // {a:1, b:{e:4,f:5}, c: 3}

obj3.b.e = 100; 
console.log(obj3); // {a:1, b:{ e:100, f:5 }, c:3}
console.log(obj2); // {c:3, b:{e:100, f:5}}
```

可以发现对对象进行 `扩展 - spread` 运算，实现的是对象的浅拷贝, 并且是复制的对象的可枚举的属性。

## 剩余参数 - rest

剩余参数（rest parameter）允许长度不确定的实参表示为一个数组或对象。

### 语法

如果一个函数的最后一个形参是以 ... 为前缀的，则在函数被调用时,该形参会成为一个数组,数组中的元素都是传递给该函数的多出来的实参的值。

```javascript
function(a, b, ...theArgs) {
  // ...
}
```

在上例中，theArgs 会包含传递给函数的从第三个实参开始到最后所有的实参 (第一个实参映射到 a, 第二个实参映射到 b)。

### 剩余参数和 **arguments** 对象的区别

* 剩余参数只包含那些没有对应形参的实参，而 arguments 对象包含了传给函数的所有实参。
* arguments 对象不是一个真实的数组,而剩余参数是真实的 Array实例，也就是说你能够在它上面直接使用所有的数组方法，比如 sort，map，forEach，pop。
* arguments 对象对象还有一些附加的属性 (比如callee属性)。

如果想在arguments对象上使用数组方法,你首先得将它转换为真实的数组,比如使用 [].slice.call(arguments)

### 实例

下例演示了你可以在剩余参数上使用任意的数组方法,而arguments对象不可以:

```javascript
let { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };
x; // 1
y; // 2
z; // { a: 3, b: 4 }

function sortRestArgs(...theArgs) {
  var sortedArgs = theArgs.sort();
  return sortedArgs;
}

console.log(sortRestArgs(5,3,7,1)); // [1,3,5,7]

function sortArguments() {
  var sortedArgs = arguments.sort();
  return sortedArgs; // 不会执行到这里
}

console.log(sortArguments(5,3,7,1)); // Uncaught TypeError: arguments.sort is not a function
```

语法知识点有点绕，这里尽量用实例代码来演示，因为目前浏览器的兼容性，所以这里编写完后，使用 [babel](https://babeljs.io/) 编译成 es5 语法后再在浏览器控制台运行了，可以直接使用 [Babel 在线编译工具](https://babeljs.io/repl/) 来进行 ES6 编译，因为本文涉及到ES6 stage-3 的内容，所以在使用 [Babel 在线编译工具](https://babeljs.io/repl/) 时，需要选择 stage-3。


## 相关文章

* [MDN 扩展语法](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Spread_operator)
* [MDN 剩余参数](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Rest_parameters)
* [Proposal: Object Rest/Spread Properties for ECMAScript](https://github.com/tc39/proposal-object-rest-spread)


