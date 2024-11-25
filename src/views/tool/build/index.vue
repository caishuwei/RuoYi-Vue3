<script setup>
const vfdRef = ref(null)
</script>
<template>
   <!-- <div> 表单构建 <svg-icon icon-class="build" /> </div> -->
   <!-- 这个表单构建页面目前作者还没有开发计划，gitee上有人推荐使用VForm 3，是一个可以拖拽生成表单的插件 -->
   <!-- https://gitee.com/vdpadmin/variant-form3-vite -->
   <v-form-designer ref="vfdRef"></v-form-designer>
</template>