import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { getSDK, CbEvents } from '@openim/wasm-client-sdk'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import '@/assets/font/iconfont.css'
const app = createApp(App)
//匹配项目子路径
const base = import.meta.env.BASE_URL.replace(/\/$/, '') + '/'
console.log('当前路径', `${base}openIM.wasm`)
const IMSDK = getSDK({
  coreWasmPath: `${base}openIM.wasm`,
  sqlWasmPath: `${base}sql-wasm.wasm`,
  debug: false,
})

IMSDK.on(CbEvents.OnConnecting, () => console.log('⏳ 连接中...'))
IMSDK.on(CbEvents.OnConnectSuccess, () => console.log('✅ 连接成功'))
IMSDK.on(CbEvents.OnConnectFailed, (e) => console.error('❌ 连接失败', e))
IMSDK.on(CbEvents.OnUserTokenExpired, () => console.warn('⚠️ Token 已过期'))

app.provide('globalIMSDK', IMSDK)

// app.config.globalProperties.$imLogin = function (uid: string, token: string) {
//   // 登录
//   IMSDK.login({
//     userID: uid,
//     token: token,
//     platformID: 5, // Web 端为 5
//     apiAddr: 'http://gz.gisocn.com:12004',
//     wsAddr: 'ws://gz.gisocn.com:12003',
//   })
//     .then(() => console.log('🎉 登录成功'))
//     .catch(({ errCode, errMsg }) => console.error('🚫 登录失败', errCode, errMsg))
// }

// app.use(createPinia())
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)

app.mount('#app')
