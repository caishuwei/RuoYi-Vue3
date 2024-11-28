<template>
  <!-- vue component用于自定义标签，通过is来动态渲染组件 v-bind通过js设置标签属性-->
  <component :is="type" v-bind="linkProps()">
    <slot />
  </component>
</template>

<script setup>
import { isExternal } from '@/utils/validate'

//设置本组件定义的属性
const props = defineProps({
  to: {
    type: [String, Object],//类型是字符串或者对象
    required: true//必须设置这个属性
  }
})

//判断是否为外部链接
const isExt = computed(() => {
  return isExternal(props.to)
})

const type = computed(() => {
  //外部链接采用a标签
  if (isExt.value) {
    return 'a'
  }
  //内部routerPath则使用vue router-link标签，通过to属性指定跳转的路由地址
  return 'router-link'
})

function linkProps() {
  if (isExt.value) {
    //设置a标签属性，在新的标签页打开链接，并且通过noopener防止新网页通过windows.opener操作我们的页面数据和行为
    return {
      href: props.to,
      target: '_blank',
      rel: 'noopener'
    }
  }
  //设置router-link跳转的路由地址
  return {
    to: props.to
  }
}
</script>
