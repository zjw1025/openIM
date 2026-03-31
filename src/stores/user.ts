import { defineStore } from 'pinia'

interface UserState {
  userID: string
  token: string
}

// export const useUserStore = defineStore('user', () => {
//   const userID = ref('')
//   const token = ref('')

//   return { userID, token }
// })

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    userID: '',
    token: '',
  }),
  persist: true,
  getters: {
    getuserID(): string {
      return this.userID
    },
    getToken(): string {
      return this.token
    },
  },
  actions: {
    setuserID(id: string): void {
      this.userID = id
    },
    setToken(token: string): void {
      this.token = token
    },
  },
})
