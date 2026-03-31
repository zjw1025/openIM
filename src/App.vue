<template>
  <RouterView />
</template>

<style scoped></style>

<script setup lang="ts">
import { onMounted, getCurrentInstance } from 'vue'
import { RouterView } from 'vue-router'
import { getToken } from '@/assets/api/api_im'
import { useUserStore } from '@/stores/user'

onMounted(async () => {
  // const appContext = getCurrentInstance()
  // // 拿到全局挂载的 $imLogin 方法（如果是挂载在 app.config.globalProperties 上）
  // const $imLogin = appContext?.appContext.config.globalProperties.$imLogin
  // const userStore = useUserStore()
  // try {
  //   //balck ,需要从上一级页面或者登录接口获取
  //   const response = await getToken('black')
  //   console.log(response)
  //   // 在这里处理你的数据
  //   if (response.success) {
  //     $imLogin(response.userId, response.userToken)
  //     await userStore.setuserID(response.userId)
  //     await userStore.setToken(response.userToken)
  //   }
  // } catch (error) {
  //   console.error('请求失败:', error)
  // }
})
</script>
