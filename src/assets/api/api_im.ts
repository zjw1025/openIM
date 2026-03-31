// 使用@ts-ignore忽略TypeScript对axios_utils.js的类型检查
// @ts-ignore
import request from './axios_utils.js'

//获取token

export function getToken(name: string) {
  return request({
    url: `/mobile/mobileIM.shtml?act=getToken&accountname=${name}`,
    method: 'get',
  }) as Promise<{
    success: boolean
    userId: string
    userToken: string
    [key: string]: any
  }>
}

// export function getUserInfo(uid: string) {
//   return request({
//     url: `/user/get_users_info`,
//     method: 'post',
//     data: {
//       userIDs: [uid],
//     },
//   })
// }
