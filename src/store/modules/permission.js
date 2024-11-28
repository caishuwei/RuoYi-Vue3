import auth from '@/plugins/auth'
import router, { constantRoutes, dynamicRoutes } from '@/router'
import { getRouters } from '@/api/menu'
import Layout from '@/layout/index'
import ParentView from '@/components/ParentView'
import InnerLink from '@/layout/components/InnerLink'

// 匹配views里面所有的.vue文件
//import.meta.glob是vite的方法，用于动态导入多个模块
//.代表当前文件夹，..表示上级目录，接着进入views目录，**表示匹配中间任意多级目录，*.vue表示任意名称的vue文件
const modules = import.meta.glob('./../../views/**/*.vue')

const usePermissionStore = defineStore(
  'permission',
  {
    state: () => ({
      routes: [],//constantRoutes+后台返回的路由展开成最多嵌套两层
      addRoutes: [],//后台返回的路由展开成最多嵌套两层
      defaultRoutes: [],//constantRoutes+后台返回的路由
      topbarRouters: [],//后台返回的路由
      sidebarRouters: []//constantRoutes+后台返回的路由
    }),
    actions: {
      setRoutes(routes) {
        this.addRoutes = routes
        this.routes = constantRoutes.concat(routes)
      },
      setDefaultRoutes(routes) {
        this.defaultRoutes = constantRoutes.concat(routes)
      },
      setTopbarRoutes(routes) {
        this.topbarRouters = routes
      },
      setSidebarRouters(routes) {
        this.sidebarRouters = routes
      },
      generateRoutes(roles) {
        return new Promise(resolve => {
          // 向后端请求路由数据，这些路由并没有经过权限筛选，想来是后台在返回时已经根据用户的权限和角色进行过滤了吧，由前端过滤的话确实不安全
          getRouters().then(res => {
            const sdata = JSON.parse(JSON.stringify(res.data))
            const rdata = JSON.parse(JSON.stringify(res.data))
            const defaultData = JSON.parse(JSON.stringify(res.data))
            //type传true，会解析三级菜单并将其平铺到二级菜单末尾，也就是说这个会变成只有2级的结构
            const rewriteRoutes = filterAsyncRouter(rdata, false, true)
            //这两个只是正常的转换组件名称为vue组件
            const sidebarRoutes = filterAsyncRouter(sdata)
            const defaultRoutes = filterAsyncRouter(defaultData)
            //动态路由用于控制一些配置页面的权限，因为这些页面不在菜单中而是选中某个对象对其进行配置时的权限
            //控制，目前有用户的角色配置、反过来给角色配置用户、字典配置、定时任务调度日志、数据库表生成配置页面
            //这些动态路由目前都配置了权限列表，没有配置角色列表，只要用户中有任意一个权限或者角色匹配上，该路由就可以用
            const asyncRoutes = filterDynamicRoutes(dynamicRoutes)
            //这里将具备权限的动态路由添加到vue-router
            asyncRoutes.forEach(route => { router.addRoute(route) })
            this.setRoutes(rewriteRoutes)
            this.setSidebarRouters(constantRoutes.concat(sidebarRoutes))
            this.setDefaultRoutes(sidebarRoutes)
            this.setTopbarRoutes(defaultRoutes)
            //显然这里返回了只有二级结构的数据
            resolve(rewriteRoutes)
          })
        })
      }
    }
  })

// 遍历后台传来的路由字符串，转换为组件对象
function filterAsyncRouter(asyncRouterMap, lastRouter = false, type = false) {
  return asyncRouterMap.filter(route => {
    if (type && route.children) {
      route.children = filterChildren(route.children)
    }
    if (route.component) {
      // Layout ParentView 组件特殊处理
      if (route.component === 'Layout') {
        route.component = Layout
      } else if (route.component === 'ParentView') {
        route.component = ParentView
      } else if (route.component === 'InnerLink') {
        route.component = InnerLink
      } else {
        route.component = loadView(route.component)
      }
    }
    if (route.children != null && route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children, route, type)
    } else {
      delete route['children']
      delete route['redirect']
    }
    return true
  })
}

function filterChildren(childrenMap, lastRouter = false) {
  var children = []
  childrenMap.forEach((el, index) => {
    if (el.children && el.children.length) {
      if (el.component === 'ParentView' && !lastRouter) {
        el.children.forEach(c => {
          c.path = el.path + '/' + c.path
          if (c.children && c.children.length) {
            children = children.concat(filterChildren(c.children, c))
            return
          }
          children.push(c)
        })
        return
      }
    }
    if (lastRouter) {
      el.path = lastRouter.path + '/' + el.path
      if (el.children && el.children.length) {
        children = children.concat(filterChildren(el.children, el))
        return
      }
    }
    children = children.concat(el)
  })
  return children
}

// 动态路由遍历，验证是否具备权限
export function filterDynamicRoutes(routes) {
  const res = []
  routes.forEach(route => {
    //路由可以同时配置权限和角色要求，但只要用户具备其中任何一个权限或者角色，就可以用
    if (route.permissions) {
      if (auth.hasPermiOr(route.permissions)) {
        res.push(route)
      }
    } else if (route.roles) {
      if (auth.hasRoleOr(route.roles)) {
        res.push(route)
      }
    }
  })
  return res
}

/**
 * 加载路由组件
 * @param view 后台用views下方所在的页面路径来作为组件配置
 * @returns vue组件
 */
export const loadView = (view) => {
  let res;
  for (const path in modules) {
    //这里遍历每个模块的路径，截取views/之后，.vue之前的字符串来与后台的页面路径相比较，
    //说实话感觉有点浪费性能啊，每次查找vue组件都得遍历截取，为啥不先处理好直接读取呢
    const dir = path.split('views/')[1].split('.vue')[0];
    if (dir === view) {
      res = () => modules[path]();
    }
  }
  return res;
}

export default usePermissionStore
