import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Index from '../views/index.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), //import.meta.env.BASE_URL 是一个环境变量，用于部署到子路径时使用
  // history: createWebHistory(import.meta.env.MODE === 'production' ? '/fcim/' : '/'),
  routes: [
    {
      path: '/',
      name: 'Index',
      component: () => import('@/views/index.vue'),
      children: [
        {
          path: '/setting',
          name: '配置页',
          component: () => import('@/views/setting.vue'),
        },
      ],
    },
  ],
})

// router.beforeEach((to, from, next) => {
//   next()
// })
export default router
