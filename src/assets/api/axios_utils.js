import axios from 'axios'
console.log('111', import.meta.env.BASE_URL)
console.log('222', import.meta.env.VITE_APP_DEV_WEB_URL)
console.log(window.baseURL)
import.meta.env.BASE_URL
const http = axios.create({
  baseURL: import.meta.env.VITE_APP_DEV_WEB_URL, //window.baseURL,
  timeout: 1000 * 10, // 请求超时时间10秒(单位：毫秒)
  validateStatus: function (status) {
    return status >= 200 && status <= 500 // 默认的
  },
  headers: {
    // 'Content-Type': 'application/json',
    // 'token':window.token,
  },
})

http.interceptors.request.use(
  (config) => {
    if (!window.loginUser) {
      let sysLoginUser = localStorage.getItem('sysLoginUser')
      if (sysLoginUser) {
        window.loginUser = JSON.parse(sysLoginUser) || {}
      } else {
        window.loginUser = null
      }
    }
    if (window.loginUser) {
      config.headers['UserId'] = window.loginUser.userid
      config.headers['Token-Key'] = window.loginUser['Token-Key']
      config.headers['Token-Value'] = window.loginUser['Token-Value']
    }

    return config
  },
  (err) => {
    return Promise.reject({
      code: 1,
      msg: err.message || '请求失败',
    })
  },
)

http.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      if (response.data.code === 2) {
        window.loginUser = null
        localStorage.setItem('sysLoginUser', '')
        window.location.href = '/login'
      }
      return response.data
    } else {
      return {
        code: 1,
        msg: '请求失败',
      }
    }
  },
  (error) => {
    return Promise.reject({
      code: 1,
      msg: error.message || '请求失败',
    })
  },
)

export default http
