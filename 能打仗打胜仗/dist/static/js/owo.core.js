// Sun Mar 05 2023 16:00:01 GMT+0800 (中国标准时间)
var owo = {tool: {},state: {},event: {}};
/* 方法合集 */
var _owo = {
  isIE: (window.navigator.userAgent.indexOf("MSIE") >= 1),
  owoPC: navigator.userAgent.toLowerCase().indexOf('electron') >= 0,
  // 支持IE的事件绑定
  addEventListener: function (dom, name, func) {
    if (_owo.isIE) {
      dom.attachEvent('on' + name, func);      
    } else {
      dom.addEventListener(name, func, false);
    }
  }
}

/* 运行页面初始化方法 */
_owo.runCreated = function (pageFunction) {
  // 如果dom已经被删掉那么不会运行对应的方法
  if (!pageFunction.$el) {
    console.info('dom元素不存在!')
    return;
  }
  try {
    // console.log(pageFunction)
    if (pageFunction.show) {pageFunction.show.apply(pageFunction)}
    if (pageFunction["_isCreated"]) return
    // 确保created事件只被执行一次
    pageFunction._isCreated = true
    if (pageFunction.created) {pageFunction.created.apply(pageFunction)}
  } catch (e) {
    console.error(e)
  }
}

_owo.getFuncformObj = function (pageFunction, pathStr) {
  if (!pageFunction) {
    return false
  }
  var pointFunc = pageFunction
  var pathList = pathStr.split('.')
  for (var ind = 0; ind < pathList.length; ind++) {
    var path = pathList[ind];
    if (pointFunc[path]) pointFunc = pointFunc[path]
    else {
      return false
    }
  }
  return pointFunc
}

_owo._run = function (eventFor, event, newPageFunction) {
  // 复制eventFor防止污染
  var eventForCopy = eventFor
  // 待优化可以单独提出来
  // 取出参数
  var parameterArr = []
  var parameterList = eventForCopy.match(/[^\(\)]+(?=\))/g)
  
  if (parameterList && parameterList.length > 0) {
    // 参数列表
    parameterArr = parameterList[0].split(',')
    // 进一步处理参数
    
    for (var i = 0; i < parameterArr.length; i++) {
      var parameterValue = parameterArr[i].replace(/(^\s*)|(\s*$)/g, "")
      // console.log(parameterValue)
      // 判断参数是否为一个字符串
      
      if (parameterValue.charAt(0) === '"' && parameterValue.charAt(parameterValue.length - 1) === '"') {
        parameterArr[i] = parameterValue.substring(1, parameterValue.length - 1)
      }
      if (parameterValue.charAt(0) === "'" && parameterValue.charAt(parameterValue.length - 1) === "'") {
        parameterArr[i] = parameterValue.substring(1, parameterValue.length - 1)
      }
      // console.log(parameterArr[i])
    }
  }
  eventForCopy = eventFor.replace(/\([\d\D]*\)/, '')
  // console.log(newPageFunction, eventForCopy)
  // 如果有方法,则运行它
  newPageFunctionTemp = _owo.getFuncformObj(newPageFunction, eventForCopy)
  if (newPageFunctionTemp) {
    // 绑定window.owo对象
    newPageFunction.$event = event
    newPageFunction.$target = event.target
    newPageFunctionTemp.apply(newPageFunction, parameterArr)
  } else {
    shaheRun.apply(newPageFunction, [eventFor])
  }
}

_owo.bindEvent = function (eventName, eventFor, tempDom, moudleScript) {
  switch (eventName) {
    case 'tap':
      // 变量
      var startTime = 0
      var isMove = false
      tempDom.ontouchstart = function () {
        startTime = Date.now();
      }
      tempDom.ontouchmove = function () {
        isMove = true
      }
      tempDom.ontouchend = function (event) {
        if (Date.now() - startTime < 300 && !isMove) {_owo._run(eventFor, event || this, moudleScript)}
        // 清零
        startTime = 0;
        isMove = false
        event.preventDefault()
      }
      break;
  
    default:
      // 防止重复绑定
      if (tempDom['owo_bind_' + eventName] !== eventFor) {
        tempDom['owo_bind_' + eventName] = eventFor
        _owo.addEventListener(tempDom, eventName, function(event) {
          _owo._run(eventFor, event || this, moudleScript)
        })
      }
      break;
  }
}

// 处理dom的owo事件
_owo.addEvent = function (tempDom, moudleScript) {
  if (tempDom.attributes) {
    for (var ind = 0; ind < tempDom.attributes.length; ind++) {
      var attribute = tempDom.attributes[ind]
      // ie不支持startsWith
      var eventFor = attribute.textContent || attribute.value
      eventFor = eventFor.replace(/ /g, '')
      // 判断是否为owo的事件
      if (attribute.name.slice(0, 2) == 'o-') {
        var eventName = attribute.name.slice(2)
        switch (eventName) {
          case 'if':
          case 'hover':
            break
          case 'tap': {
            // 根据手机和PC做不同处理
            // electron需要特殊处理
            if (_owo.isMobi && !_owo.owoPC) _owo.bindEvent('tap', eventFor, tempDom, moudleScript)
            else _owo.bindEvent('click', eventFor, tempDom, moudleScript)
            break
          }
          // 处理o-value
          case 'value': {
            var value = shaheRun.apply(moudleScript, [eventFor])
            function inputEventHandle (e) {
              var eventFor = e.target.getAttribute('o-value')
              shaheRun.apply(moudleScript, [eventFor + '="' + e.target.value + '"'])
            }
            switch (tempDom.tagName) {
              case 'INPUT':
                switch (tempDom.getAttribute('type')) {
                  case 'number':
                    if (value == undefined) value = ''
                    tempDom.value = value
                    tempDom.oninput = function (e) {
                      var eventFor = e.target.getAttribute('o-value')
                      var value = e.target.value
                      if (value == '') value = '""'
                      shaheRun.apply(moudleScript, [eventFor + '=' + value])
                    }
                    break;
                  case 'color':
                  case 'password':
                  case 'text':
                    if (value == undefined) value = ''
                    tempDom.value = value
                    tempDom.oninput = inputEventHandle
                    break;
                  case 'checkbox':
                    tempDom.checked = Boolean(value)
                    tempDom.onclick = function (e) {
                      var eventFor = e.target.getAttribute('o-value')
                      shaheRun.apply(moudleScript, [eventFor + '=' + e.target.checked])
                    }
                    break;
                  
                }
                break;
              case 'TEXTAREA':
                if (value == undefined) value = ''
                tempDom.value = value
                tempDom.onchange = function (e) {
                  var eventFor = e.target.getAttribute('o-value')
                  var value = e.target.value
                  value = value.replace(/\"/g, '\\"')
                  value = value.replace(/\r/g, '')
                  value = value.replace(/\n/g, '')
                  shaheRun.apply(moudleScript, [eventFor + '="' + value + '"'])
                }
                break;
              case 'SELECT':
                if (value == null || value == undefined) value = ''
                var activeOpt = tempDom.querySelector('[value="' + value + '"]')
                if (activeOpt) {
                  activeOpt.setAttribute('selected', 'selected')
                } else {
                  console.error('找不到应该活跃的选项: ' + value + '\r\nDOM元素为: ', tempDom);
                }
                tempDom.onchange = inputEventHandle
                break;
              default:
                tempDom.innerHTML = value
                break;
            }
            break
          }   
          default: {
            
            _owo.bindEvent(eventName, eventFor, tempDom, moudleScript)
          }
        }
      } else if (attribute.name == 'view') {
        viewName = eventFor
      } else if (attribute.name == 'route') {
        routeName = eventFor
      }
    }
  }
}






_owo.cutString = function (original, before, after, index) {
  index = index || 0
  if (typeof index === "number") {
    var P = original.indexOf(before, index)
    if (P > -1) {
      if (after) {var f = original.indexOf(after, P + before.length)
        // console.log(P, f)
        // console.log(original.slice(P + before.toString().length, f))
        return (f>-1)? original.slice(P + before.toString().length, f) : ''
      } else {
        return original.slice(P + before.toString().length);
      }
    } else {
      return ''
    }
  } else {
    console.error("owo [sizeTransition:" + index + "不是一个整数!]")
  }
}
_owo.cutStringArray = function (original, before, after, index, inline) {
  var aa=[], ab=0;
  index = index || 0
  
  while(original.indexOf(before, index) > 0) {
    var temp = this.cutString(original, before, after, index)
    if (temp !== '') {
      if (inline) {
        if (temp.indexOf('\n') === -1) {
          aa[ab] = temp
          ab++
        }
      } else {
        aa[ab] = temp
        ab++
      }
    }
    // console.log(before)
    index = original.indexOf(before, index) + 1
  }
  return aa;
}




// 页面切换






// 判断是否为手机
_owo.isMobi = navigator.userAgent.toLowerCase().match(/(ipod|ipad|iphone|android|coolpad|mmp|smartphone|midp|wap|xoom|symbian|j2me|blackberry|wince)/i) != null
// 向各个组件发送通知，暂时不支持参数
owo.notice = function (str) {
  function check (el) {
    for (var key in el) {
      if (Object.hasOwnProperty.call(el, key)) {
        const element = el[key];
        if (element.notice && element.notice[str]) {
          element.notice[str].apply(element)
        }
        if (element.template) check(element.template)
        if (element.view) {
          for (var tempKey in element.view) {
            if (Object.hasOwnProperty.call(element.view, tempKey)) {
              check(element.view[tempKey])
            }
          }
        }
      }
    }
  }
  check(owo.script)
}
function Page(pageScript, parentScript) {
  for (var key in pageScript) {
    this[key] = pageScript[key]
  }
  
  // 处理页面引用的模板
  for (var key in pageScript.template) {
    pageScript.template[key].$el = pageScript.$el.querySelector('[template="' + key + '"]')
    pageScript.template[key] = new Page(pageScript.template[key])
  }
  if (parentScript) {
    this._parent = parentScript
  }
}

function owoPageInit () {
  _owo.runCreated(this)
  // 递归处理
  function recursion (entry) {
    for (var key in entry.template) {
      var templateScript = entry.template[key]
      _owo.runCreated(templateScript)
      recursion(templateScript)
    }
  }
  recursion(this)
  
  
}

_owo.recursion = function (tempDom, callBack) {
  if (!callBack || callBack(tempDom)) {
    return
  }
  // 判断是否有子节点需要处理
  if (tempDom.children) {
    // 递归处理所有子Dom结点
    for (var i = 0; i < tempDom.children.length; i++) {
      // 获取子节点实例
      var childrenDom = tempDom.children[i]
      if (!childrenDom.hasAttribute('template') && !childrenDom.hasAttribute('view')) {
        _owo.recursion(childrenDom, callBack)
      }
    }
  } else {
    console.info('元素不存在子节点!')
    console.info(tempDom)
  }
}

/* owo事件处理 */
// 参数1: 当前正在处理的dom节点
// 参数2: 当前正在处理的模块名称
function handleEvent (moudleScript, enterDom) {
  var moudleScript = moudleScript || this
  var enterDom = enterDom || moudleScript.$el
  // 判断是否是继承父元素方法
  if (moudleScript._inherit){
    moudleScript = moudleScript._parent
  }
  if (!enterDom) return
  var tempDom = enterDom
  
  
  
  _owo.recursion(tempDom, function (childrenDom) {
    if (childrenDom.hasAttribute('o-for')) return true
    
    _owo.addEvent(childrenDom, moudleScript)
  })
  // 递归处理子模板
  for (var key in moudleScript.template) {
    moudleScript.template[key].$el = tempDom.querySelector('[template="' + key + '"]')
    moudleScript.template[key].$parent = moudleScript
    handleEvent(moudleScript.template[key])
  }
}

Page.prototype.owoPageInit = owoPageInit
Page.prototype.handleEvent = handleEvent
Page.prototype.query = function (str) {
  return this.$el.querySelector(str)
}
Page.prototype.queryAll = function (str) {
  return this.$el.querySelectorAll(str)
}
// 快速选择器
owo.query = function (str) {
  return document.querySelectorAll('.page[template=' + owo.activePage +'] ' + str)
}
_owo.addHTMLElementFun = function (name, func) {
  if (window.HTMLElement) {
    HTMLElement.prototype[name] = func
  } else {
    for (var ind=0; ind < document.all.length; ind++) {
      document.all[ind][name] = func
    }
  }
}
_owo.addHTMLElementFun('query', function(str) {
  return this.querySelector(str)
})




owo.go = function (aniStr) {
  // 判断是否正在忙碌
  if (owo.state.routeBusy) {
    setTimeout(() => {
      owo.go(aniStr)
      return
    }, 100);
  }
  owo.state.routeBusy = true
  if (!aniStr || typeof aniStr !== 'string')  {
    console.error('owo.go的正确使用方法为: owo.go("页面名/URL参数/入场动画/离场动画/是否允许返回/返回入场动画/返回离场动画")')
    return
  }
  var target = aniStr.split('/')
  var config = {
    page: target[0],
    paramString: target[1],
    inAnimation: target[2],
    outAnimation: target[3],
    noBack: target[4],
    backInAnimation: target[5],
    backOutAnimation: target[6],
  }
  var paramString = ''
  var pageString = '#' + owo.activePage
  var activePageName = config.page || owo.activePage
  
  // 处理动画缩写
  if (config['ani']) {
    var temp = config['ani'].split('/')
    config.inAnimation = temp[0]
    config.outAnimation = temp[1]
  }
  // 待优化 不需要这段代码的情况不打包这段代码
  if (!config.inAnimation && !config.outAnimation) {
    if (owo.globalAni) {
      if (owo.globalAni["in"]) config.inAnimation =  owo.globalAni["in"]
      if (owo.globalAni.out) config.outAnimation = owo.globalAni.out
      if (owo.globalAni["backIn"]) config.backInAnimation = owo.globalAni["backIn"]
      if (owo.globalAni["backOut"]) config.backOutAnimation = owo.globalAni["backOut"]
    }
    if (owo.pageAni && owo.pageAni[activePageName]) {
      if (owo.pageAni[activePageName]["in"]) config.inAnimation = owo.pageAni[activePageName]["in"]
      if (owo.pageAni[activePageName]["out"]) config.outAnimation = owo.pageAni[activePageName]["out"]
      if (owo.pageAni[activePageName]["backIn"]) config.backInAnimation = owo.globalAni["backIn"]
      if (owo.pageAni[activePageName]["backOut"]) config.backOutAnimation = owo.globalAni["backOut"]
    }
  }
  if (config.inAnimation && config.outAnimation) {
    owo.state._animation = {
      "in": config.inAnimation,
      "out": config.outAnimation,
      "backIn": config.backInAnimation,
      "backOut": config.backOutAnimation,
      "forward": true
    }
  }
  if (config.page) {
    if (!owo.script[config.page]) {console.error("导航到不存在的页面: " + config.page); return}
    if (config.page != owo.activePage) pageString = '#' + config.page
  }
  if (config.paramString) {
    var search = _owo.getQueryVariable()
    var addSEarch = config.paramString.split('=')
    search[addSEarch[0]] = addSEarch[1]
    paramString = '?'
    for (var key in search) {
      var value = search[key]
      if (value) paramString += (paramString == '?' ?  '' : '&') + key + '=' + value
    }
  }
  // 防止在同一个页面刷新
  if (!paramString && !pageString) return
  // owo.state._animation = null
  // 判断是否支持history模式
  if (window.history && window.history.pushState) {
    if (config.noBack) {
      window.history.replaceState({
        url: window.location.href
      }, '', paramString + pageString)
    } else {
      window.history.pushState({
        url: window.location.href
      }, '', paramString + pageString)
    }

    if (config.page) _owo.hashchange()
    if (config.paramString) _owo.getViewChange()
  } else {
    if (config.noBack) {
      location.replace(paramString + pageString)
    } else {
      window.location.href = paramString + pageString
    }
  }
  setTimeout(() => {
    owo.state.routeBusy = false
  }, 500);
}


// 待修复 跳转返回没有了
var toList = document.querySelectorAll('[go]')
for (var index = 0; index < toList.length; index++) {
  var element = toList[index]
  element.onclick = function () {
    owo.go(this.attributes['go'].value)
  }
}

// 沙盒运行
function shaheRun (code) {
  try {
    return eval(code)
  } catch (error) {
    console.error(error)
    console.log('执行代码: ' + code)
    console.log('运行环境: ', this)
    return undefined
  }
}


/*
 * 传递函数给whenReady()
 * 当文档解析完毕且为操作准备就绪时，函数作为document的方法调用
 */
_owo.ready = (function() {               //这个函数返回whenReady()函数
  var funcs = [];             //当获得事件时，要运行的函数
  
  //当文档就绪时,调用事件处理程序
  function handler(e) {
    //如果发生onreadystatechange事件，但其状态不是complete的话,那么文档尚未准备好
    if(e.type === 'onreadystatechange' && document.readyState !== 'complete') {
      return
    }
    // 确保事件处理程序只运行一次
    if(window.owo.state.isRrady) return
    window.owo.state.isRrady = true
    
    // 运行所有注册函数
    for(var i=0; i<funcs.length; i++) {
      funcs[i].call(document);
    }
    funcs = null;
  }
  //为接收到的任何事件注册处理程序
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', handler, false)
    document.addEventListener('readystatechange', handler, false)            //IE9+
    window.addEventListener('load', handler, false)
  } else if(document.attachEvent) {
    document.attachEvent('onreadystatechange', handler)
    window.attachEvent('onload', handler)
  }
  //返回whenReady()函数
  return function whenReady (fn) {
    if (window.owo.state.isRrady) {
      fn.call(document)
    } else {
      funcs.push(fn)
    }
  }
})()


_owo.getarg = function (url) { // 获取URL #后面内容
  if (!url) return null
  var arg = url.split("#");
  return arg[1] ? arg[1].split('?')[0] : null
}

// 页面资源加载完毕事件
_owo.showPage = function() {
  var _index = 0
  for (var key in owo.script) {
    owo.script[key].$el = document.querySelector('.page[template="' + key + '"]')
    owo.script[key] = new Page(owo.script[key])
    owo.script[key]._index = _index++
    owo.script[key]._name = key
  }
  owo.entry = document.querySelector('[template]').getAttribute('template')
  // 取出URL地址判断当前所在页面
  var pageArg = _owo.getarg(window.location.hash)
  
  if (pageArg !== null) {
    window.location.href = ''
    return
  }
  
  

  // 从配置项中取出程序入口
  var page = pageArg ? pageArg : owo.entry
  if (page) {
    if (!owo.script[page] || !owo.script[page].$el) {
      console.error('入口文件设置错误,错误值为: ', page)
      page = owo.script[page].$el.getAttribute('template')
      window.location.replace('#' + page)
      return
    }
    // 显示主页面
    owo.script[page].$el.style.display = ''
    window.owo.activePage = page
    owo.script[page].owoPageInit()
    owo.script[page].handleEvent()
    // 处理插件
    var plugList = document.querySelectorAll('.owo-block')
    for (var ind = 0; ind < plugList.length; ind++) {
      var plugEL = plugList[ind]
      var plugName = plugEL.getAttribute('template')
      owo.script[plugName].$el = plugEL
      owo.script[plugName].owoPageInit()
      owo.script[plugName].handleEvent()
      plugEL.style.display = ''
    }
    
  } else {
    console.error('未设置程序入口!')
  }
  // 设置当前页面为活跃页面
  owo.state.newUrlParam = _owo.getarg(document.URL)
}

// url发生改变事件
_owo.hashchange = function () {
  // 判断是否正在忙碌
  if (owo.state.hashchange) {
    setTimeout(function () {
      _owo.hashchange()
    }, 300);
    return
  }
  owo.state.hashchange = true
  // 这样处理而不是直接用event中的URL，是因为需要兼容IE
  owo.state.oldUrlParam = owo.state.newUrlParam;
  owo.state.newUrlParam = _owo.getarg(document.URL); 
  // console.log(owo.state.oldUrlParam, owo.state.newUrlParam)
  // 如果旧页面不存在则为默认页面
  if (!owo.state.oldUrlParam) owo.state.oldUrlParam = owo.entry;
  var newUrlParam = owo.state.newUrlParam;
  // 如果新页面和旧页面一样那么不执行跳转
  if (owo.state.oldUrlParam == newUrlParam) {
    owo.state.hashchange = false
    return
  }
  // 如果没有跳转到任何页面则跳转到主页
  if (newUrlParam === undefined) {
    newUrlParam = owo.entry;
  }

  // 如果没有发生页面跳转则不需要进行操作
  // 进行页面切换
  switchPage(owo.state.oldUrlParam, newUrlParam);
}

// 切换页面前的准备工作
function switchPage (oldUrlParam, newUrlParam) {
  
  var oldPage = oldUrlParam ? oldUrlParam.split('&')[0] : owo.entry
  var newPage = newUrlParam ? newUrlParam.split('&')[0] : owo.entry
  // 查找页面跳转前的page页(dom节点)
  var oldDom = document.querySelector('.page[template="' + oldPage + '"]')
  var newDom = document.querySelector('.page[template="' + newPage + '"]')
  
  if (!newDom) {console.error('页面不存在!'); return}

  setTimeout(function () {
    window.owo.activePage = newPage
    window.owo.script[newPage].$el = newDom
    window.owo.script[newPage].owoPageInit()
    window.owo.script[newPage].handleEvent()
    setTimeout(function () {
      owo.state.hashchange = false
    }, 1000);
    // 显示路由
    // if (window.owo.script[newPage].view) _owo.getViewChange()
  }, 0)
  // 离开事件
  if (window.owo.script[oldPage] && window.owo.script[oldPage].leave) {
    window.owo.script[oldPage].leave.call(window.owo.script[oldPage])
  }
  
  
  if (oldDom) {
    // 隐藏掉旧的节点
    oldDom.style.display = 'none'
  }
  // 查找页面跳转后的page
  newDom.style.display = ''
  
}

// 防止有些平台不支持onhashchange
if (window.onhashchange) {window.onhashchange = _owo.hashchange;} else {window.onpopstate = _owo.hashchange;}
// 执行页面加载完毕方法
_owo.ready(_owo.showPage)

