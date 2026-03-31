import { ref, computed, nextTick, watch, onMounted, inject, getCurrentInstance } from 'vue'
import { getToken } from '@/assets/api/api_im'
import { useUserStore } from '@/stores/user'
import { CbEvents } from '@openim/wasm-client-sdk'
import axios from 'axios'
import type { ObjectLiteralElementLike } from 'typescript'

// 类型定义
interface User {
  id: string
  name: string
  status: string
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  type: string
  content: string
  time: string
  status: string
}

interface Conversation {
  conversationID: string
  userID: string
  showName: string
  conversationType: number
  latestMsg: string
  latestMsgSendTime: number
  faceURL: string
  participants: string[]
  status: string
}

interface Group {
  groupID: string
  groupName: string
  members: Array<{
    userID: string
    nickname: string
  }>
  // 可扩展其他字段：创建时间、群主ID等
}

export function usePage() {
  // 当前激活的标签页
  const activeTab = ref('chats')
  const loading = ref(false)
  const userStore = useUserStore()
  const showCreateGroupModal = ref(false) // 新建群组弹窗显示状态
  const showErrorInfo = ref(false) // 错误信息弹窗显示状态
  const errorType = ref(null) //请求错误的原因
  const newGroupName = ref('') // 新群组名称
  const selectedUserIds = ref<string[]>([]) // 选中的用户ID列表

  // 所有可选用户（这里复用contacts，你可以根据实际需求替换为全量用户列表）
  const allUsers = computed(() => {
    // 排除当前用户自己
    return contacts.value.filter((user) => user.userID !== currentUser.id)
  })

  // 新增：切换用户选择状态
  const toggleSelectUser = (userId: string) => {
    if (selectedUserIds.value.includes(userId)) {
      selectedUserIds.value = selectedUserIds.value.filter((id) => id !== userId)
    } else {
      selectedUserIds.value.push(userId)
    }
  }

  // 新增：重置创建群组表单
  const resetCreateGroupForm = () => {
    newGroupName.value = ''
    showCreateGroupModal.value = false
    selectedUserIds.value = []
  }

  // 新增：确认创建群组（核心逻辑，需对接实际的创建接口）
  const confirmCreateGroup = () => {
    if (!newGroupName.value.trim() || selectedUserIds.value.length === 0) {
      alert('请输入群组名称并至少选择一名群成员！')
      return
    }

    console.log('创建群组参数：', newGroupName.value, selectedUserIds.value)

    globalSDK
      .createGroup({
        groupInfo: {
          groupName: newGroupName.value.trim(),
          groupType: 2,
        },
        memberUserIDs: selectedUserIds.value,
      })
      .then(() => {
        // 调用成功
        alert(`群组「${newGroupName.value}」创建成功！`)
        showCreateGroupModal.value = false
        resetCreateGroupForm()
        getGroupList()
      })
      .catch(({ errCode, errMsg }) => {
        // 调用失败
        console.error('群组创建失败', errCode, errMsg)
      })
  }
  // 用户信息
  const users = ref<Record<string, User>>({
    user1: { id: 'user1', name: '张三', status: '在线' },
    user2: { id: 'user2', name: '李四', status: '在线' },
    user3: { id: 'user3', name: '王五', status: '离线' },
    user4: { id: 'user4', name: '赵六', status: '忙碌' },
    user5: { id: 'user5', name: '孙七', status: '在线' },
    user6: { id: 'user6', name: '周八', status: '离开' },
    user7: { id: 'user7', name: '吴九', status: '在线' },
    user8: { id: 'user8', name: '郑十', status: '离线' },
  })

  // 当前用户信息
  const currentUser = ref<User>({})
  const globalSDK = inject<any>('globalIMSDK')

  if (globalSDK) {
    //监听消息
    globalSDK.on(CbEvents.OnRecvNewMessages, ({ data: messages }: { data: any[] }) => {
      messages.forEach((msg: any) => {
        console.log('📩 收到新消息:', msg)
        getconversations()
        unreadCounts.value[msg.sendID] = 1
        //  console.log(currentConversation.value.userID, msg.sendID)
        if (currentConversation.value && currentConversation.value.userID == msg.sendID) {
          //如果当前选中并打开的的会话就是新消息的发送人，则需要更新会话内容页面
          currentMessages.value.push(msg)
          nextTick(() => {
            scrollToBottom()
          })
        }
        if (currentGroup.value && currentGroup.value.groupID == msg.groupID) {
          groupMessages.value.push(msg)
          nextTick(() => {
            scrollToBottom()
          })
        }
      })
    })
  }

  async function ImLogin(uid: string, token: string) {
    if (!globalSDK) {
      console.error('🚫 globalSDK 未初始化')
      return
    }
    await globalSDK
      .login({
        userID: uid,
        token: token,
        platformID: 5, // Web 端为 5
        apiAddr: 'http://szcg.feicheng.online:6229', //'http://gz.gisocn.com:12004',
        wsAddr: 'ws://szcg.feicheng.online:6228', //'ws://gz.gisocn.com:12003',
      })
      .then(() => {
        console.log('🎉 登录成功')
        errorType.value = ''
        getContacts()
        getconversations()
        getGroupList()
      })
      .catch(({ errCode, errMsg }: { errCode: number; errMsg: string }) => {
        console.log('🚫 登录失败', errCode, errMsg)
        loading.value = false
        showErrorInfo.value = true //打开错误信息弹窗
        errorType.value = errCode
      })
  }
  async function getContacts() {
    if (!globalSDK) {
      console.error('🚫 globalSDK 未初始化')
      return
    }
    const offset = 0
    const count = 100
    await globalSDK
      .getFriendListPage({ offset, count })
      .then(({ data }) => {
        // 调用成功
        console.log('通讯录：', data)
        if (data.length > 0) contacts.value = data //根据实际接口返回值，目前为空
      })
      .catch(({ errCode, errMsg }) => {
        // console.log(errCode, errMsg)
        console.log('获取通讯录失败：', errCode, errMsg)
        //如果获取失败，则需要重新发起登录请求
        showErrorInfo.value = true //打开错误信息弹窗
        errorType.value = errCode
        //ImLogin(userStore.getuserID, userStore.getToken)
      })
  }
  // 重新发送登录请求
  const resetSendLogin = () => {
    console.log('重新发送请求', errorType.value)
    showErrorInfo.value = false
    //重新发起登录请求
    if (errorType.value == '1004') ImLogin(userStore.getuserID, userStore.getToken)
    else {
      getContacts()
      getconversations()
      getGroupList()
    }
  }

  async function getconversations() {
    if (!globalSDK) {
      console.error('🚫 globalSDK 未初始化')
      return
    }
    await globalSDK
      .getAllConversationList()
      .then(({ data }: { data: any }) => {
        console.log('对话列表', data)
        //conversations.value = data
        //关闭loadding
        console.log('关闭loading')
        loading.value = false
        conversations.value = data.filter((item) => item.conversationType != 3)
        //如果对话列表为空，则需要重新发起登录请求
      })
      .catch(({ errCode, errMsg }: { errCode: number; errMsg: string }) => {
        console.log('获取对话列表失败：', errCode, errMsg)
      })
  }

  // 联系人列表
  const contacts = ref<User[]>([])

  // 对话列表
  const conversations = ref<Conversation[]>([])

  // 消息数据
  const messages = ref<Record<string, Message[]>>({})

  // 未读消息计数
  const unreadCounts = ref<Record<string, number>>({})
  const userRecvID = ref('')
  // 封装获取消息的异步函数
  const fetchConversationMessages = async () => {
    if (!currentConversation.value) {
      currentMessages.value = []
      return
    }

    try {
      const { data } = await globalSDK.getAdvancedHistoryMessageList({
        viewType: 0,
        count: 100,
        startClientMsgID: '',
        conversationID: currentConversation.value.conversationID,
      })
      console.log('会话内容', data)
      // currentMessages.value = data.messageList || [] // 将数据赋值给响应式变量
      currentMessages.value = data ? data.messageList.filter((item) => item.contentType == 101) : [] //过滤掉空的消息
      userRecvID.value = getRecvId(data.messageList[0]) //获取消息接收人id
    } catch (error) {
      const { errCode, errMsg } = error
      console.error('会话内容获取失败', errCode, errMsg)
      currentMessages.value = [] // 失败时清空数据
    }
  }

  // 获取群聊记录
  const getGroupHistoryMessage = async (groupID: '') => {
    //先获取群聊的会话id
    console.log(groupID)
    const conversation = await globalSDK
      .getOneConversation({
        sourceID: groupID,
        sessionType: 3, //3 群聊  1 单聊  4  通知
      })
      .then(({ data }) => {
        // 调用成功
        return data?.conversationID
      })
      .catch(({ errCode, errMsg }) => {
        // 调用失败
        console.log('获取群聊会话id失败', errCode, errMsg)
      })

    // if (!currentGroup.value) {
    //   groupMessages.value = []
    //   return
    // }
    console.log('当前群聊的会话id是:', conversation)
    try {
      const { data } = await globalSDK.getAdvancedHistoryMessageList({
        viewType: 0,
        count: 100,
        startClientMsgID: '',
        conversationID: conversation,
      })
      console.log('群聊内容', data)
      groupMessages.value = data ? data.messageList.filter((item) => item.contentType == 101) : [] // 将数据赋值给响应式变量
      // userRecvID.value = getRecvId(data.messageList[0]) //获取消息接收人id

      // 消息加载完成后滚动到底部
      nextTick(() => {
        scrollToBottom()
      })
    } catch (error) {
      const { errCode, errMsg } = error
      console.error('群聊内容获取失败', errCode, errMsg)
      groupMessages.value = [] // 失败时清空数据
    }
  }

  // 当前选中的对话
  const currentConversation = ref<Conversation | null>(null)
  // 当前选中的联系人
  const selectedContact = ref<User | null>(null)
  // 当前对话的消息
  const currentMessages = ref([])

  // 新消息输入
  const newMessage = ref('')
  // 搜索查询
  const searchQuery = ref('')
  // 过滤后的对话列表
  const filteredConversations = computed(() => {
    if (!searchQuery.value) return conversations.value
    return conversations.value.filter((conv) =>
      conv.showName.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  })
  // 过滤后的联系人列表
  const filteredContacts = computed(() => {
    if (!searchQuery.value) return contacts.value
    return contacts.value.filter((contact) =>
      contact.nickname.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  })

  // 通话状态
  const isInCall = ref(false)
  const callType = ref('') // 'audio' 或 'video'
  const isMuted = ref(false)

  // 图片选择器
  const showImagePicker = ref(false)
  const sampleImages = [
    'https://fuss10.elemecdn.com/a/3f/3302e58f9a181d2509f3dc0fa68b0jpeg.jpeg',
    'https://fuss10.elemecdn.com/1/34/19aa98b1fcb2781c4fba33d850549jpeg.jpeg',
    'https://fuss10.elemecdn.com/0/6f/e35ff375812e6b0020b6b4e8f9583jpeg.jpeg',
    'https://fuss10.elemecdn.com/9/bb/e27858e973f5d7d3904835f46abbdjpeg.jpeg',
    'https://fuss10.elemecdn.com/d/e6/c4d93a3805b3ce3f323f7974e6f78jpeg.jpeg',
    'https://fuss10.elemecdn.com/3/28/bbf893f792f03a54408b3b7a7ebf0jpeg.jpeg',
    'https://fuss10.elemecdn.com/2/11/6535bcfb26e4c79b48ddde44f4b6fjpeg.jpeg',
  ]

  //获取当前消息发送的对象id
  const getRecvId = (data: Object) => {
    return data.recvID == currentUser.value.id ? data.sendID : data.recvID
  }

  // 检查是否是当前用户
  const isCurrentUser = (senderId: string) => {
    return senderId === currentUser.value.id
  }

  // 获取发送者姓名
  const getSenderName = (senderId: string) => {
    const user = users.value[senderId]
    return user ? user.name : '未知用户'
  }

  // 获取未读消息数量
  const getUnreadCount = (convId: string) => {
    return unreadCounts.value[convId] || 0
  }

  // 选择对话
  const selectConversation = (conv: Conversation) => {
    activeTab.value = 'chats'
    currentConversation.value = conv
    selectedContact.value = null
    currentGroup.value = null

    // 清除未读消息计数
    if (unreadCounts.value[conv.userID]) {
      unreadCounts.value[conv.userID] = 0
    }
  }

  // 选择联系人
  const selectContact = (contact: User) => {
    activeTab.value = 'contacts'
    selectedContact.value = contact
    currentConversation.value = null
    currentGroup.value = null
  }

  // 删除对话
  const deleteConversation = (convId: string) => {
    // 询问确认
    if (confirm('确定要删除这个会话吗？')) {
      // 从对话列表中移除
      const index = conversations.value.findIndex((c) => c.userID === convId)
      if (index !== -1) {
        conversations.value.splice(index, 1)
      }

      // 移除消息记录
      delete messages.value[convId]

      // 移除未读计数
      delete unreadCounts.value[convId]

      // 如果删除的是当前对话，则清空当前对话
      if (currentConversation.value && currentConversation.value.conversationID === convId) {
        currentConversation.value = null
      }
    }
  }

  // 创建与联系人的对话
  const createConversationWithContact = () => {
    if (!selectedContact.value) return

    const contact = selectedContact.value
    console.log('当前选中的联系人：', contact)
    // 检查是否已存在对话
    const existingConv = conversations.value.find((c) => c.userID == contact.userID)

    if (existingConv) {
      selectConversation(existingConv)
      //待优化，跳转到消息页面，需要定位到当前选中的联系人的位置
      return
    }

    // // 创建新对话
    // const newConv: Conversation = {
    //   id: `conv_${Date.now()}`,
    //   name: contact.name,
    //   isGroup: false,
    //   lastMessage: '',
    //   lastTime: formatTime(new Date()),
    //   participants: [currentUser.value.id, contact.id],
    //   status: contact.status,
    // }

    // conversations.value.push(newConv)
    // messages.value[newConv.id] = [] // 初始化消息数组
    // unreadCounts.value[newConv.id] = 0 // 初始化未读计数
    // selectConversation(newConv)
  }

  // 发送消息
  // const sendMessage = () => {
  //   if (!newMessage.value.trim() || !currentConversation.value) return

  //   const message = {
  //     id: `msg_${Date.now()}`,
  //     senderId: currentUser.value.id,
  //     receiverId: currentConversation.value.id,
  //     type: 'text',
  //     content: newMessage.value,
  //     time: formatTime(new Date()),
  //     status: 'sent',
  //   }

  //   // 添加到当前对话的消息列表
  //   if (!messages.value[currentConversation.value.id]) {
  //     messages.value[currentConversation.value.id] = []
  //   }
  //   messages.value[currentConversation.value.id].push(message)

  //   // 更新对话列表中的最后消息
  //   const convIndex = conversations.value.findIndex((c) => c.id === currentConversation.value.id)
  //   if (convIndex !== -1) {
  //     conversations.value[convIndex].lastMessage = newMessage.value
  //     conversations.value[convIndex].lastTime = formatTime(new Date())
  //   }

  //   // 清空输入框
  //   newMessage.value = ''

  //   // 滚动到底部
  //   nextTick(() => {
  //     scrollToBottom()
  //   })
  // }

  //发送消息
  async function sendMessage() {
    console.log('要发送的消息是：', newMessage.value)
    if (!newMessage.value.trim() || !currentConversation.value || !globalSDK) return

    const message = (await globalSDK.createTextMessage(newMessage.value.trim()))?.data
    console.log('message:', message)

    globalSDK
      .sendMessage({
        recvID: userRecvID.value,
        groupID: '',
        message,
      })
      .then(() => {
        // Message sent successfully ✉️
        console.log('✅ 发送成功')

        currentMessages.value.push(message)
        // 清空输入框
        newMessage.value = ''
        getconversations() //重新获取一下对话列表
        // 滚动到底部
        nextTick(() => {
          scrollToBottom()
        })
      })
      .catch((err: any) => {
        // Failed to send message ❌
        console.log('🚫 发送失败', err)
        //修改发送按钮样式
      })
  }

  // 发送图片
  const sendImage = (imageUrl: string) => {
    if (!currentConversation.value) return

    const message: Message = {
      id: `img_${Date.now()}`,
      senderId: currentUser.value.id,
      receiverId: currentConversation.value.id,
      type: 'image',
      content: imageUrl,
      time: formatTime(new Date()),
      status: 'sent',
    }

    const convId = currentConversation.value.id
    if (!messages.value[convId]) {
      messages.value[convId] = []
    }
    const messageList = messages.value[convId]
    if (messageList) {
      messageList.push(message)
    }

    // 更新对话列表中的最后消息
    const convIndex = conversations.value.findIndex((c) => c.id === convId)
    if (convIndex !== -1) {
      const conv = conversations.value[convIndex]
      if (conv) {
        conv.lastMessage = '[图片]'
        conv.lastTime = formatTime(new Date())
      }
    }

    showImagePicker.value = false

    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  }

  const groupNewMessage = ref('')

  const groupMessages = ref([])

  // 获取群列表
  async function getGroupList() {
    if (!globalSDK) {
      console.error('🚫 globalSDK 未初始化')
      return
    }
    await globalSDK
      .getJoinedGroupList()
      .then(({ data }) => {
        console.log('群列表', data)

        groups.value = data.filter((item) => item.status != 2) //2 解散   0 正常   1 封禁  3 禁言
      })
      .catch(({ errCode, errMsg }) => {
        console.error('获取群列表失败：', errCode, errMsg)
      })
  }

  async function sendGroupMessage() {
    if (!groupNewMessage.value.trim() || !currentGroup.value) return

    // 模拟发送群消息（实际需调用SDK发送群消息接口）
    const message = (await globalSDK.createTextMessage(groupNewMessage.value.trim()))?.data
    console.log('群聊消息：', message)
    await globalSDK
      .sendMessage({
        recvID: '',
        groupID: currentGroup.value.groupID, // 群ID
        message,
      })
      .then(() => {
        console.log('群消息发送成功')
        getGroupHistoryMessage(currentGroup.value.groupID) // 重新获取群消息
        groupNewMessage.value = ''
        groupMessages.value.push(message)
      })
      .catch((err) => {
        console.error('🚫 群消息发送失败', err)
      })

    // 滚动到底部
    nextTick(() => {
      const container = document.querySelector('.group-chat-container .chat-messages')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    })
  }

  const groups = ref<Group[]>([])

  const groupUnreadCounts = ref<Record<string, number>>({})

  // 获取群组未读消息数
  function getGroupUnreadCount(groupID: string) {
    return groupUnreadCounts.value[groupID] || 0
  }
  //当前选中的群组
  const currentGroup = ref<Group | null>(null)

  // 新增：过滤群组列表
  const filteredGroups = computed(() => {
    if (!searchQuery.value) return groups.value || []
    const query = searchQuery.value.toLowerCase()
    return groups.value.filter((group) => group.groupName.toLowerCase().includes(query))
  })

  // 选中群组
  const selectGroup = (group: any) => {
    activeTab.value = 'group'
    currentGroup.value = group
    // currentConversation.value = null
    selectedContact.value = null

    if (groupUnreadCounts.value[group.groupID]) {
      groupUnreadCounts.value[group.groupID] = 0
    }
    //滚动到底部
    // nextTick(() => {
    //   const container = document.querySelector('.group-chat-container .chat-messages')
    //   if (container) {
    //     container.scrollTop = container.scrollHeight
    //   }
    // })
  }

  const currentGroupUserlist = ref([])
  const showGroupSidePanel = ref(false) // 侧边栏显示控制
  const isGroupOwner = ref(false) // 是否群主

  const openGroupSidePanel = () => {
    if (!currentGroup.value) return
    showGroupSidePanel.value = true
    // 获取群成员 + 角色权限
    getGroupMemberListWithRole()
  }

  const closeGroupSidePanel = () => {
    showGroupSidePanel.value = false
  }

  // 获取群成员 + 判断是否群主
  const getGroupMemberListWithRole = async () => {
    try {
      const { data } = await globalSDK.getGroupMemberOwnerAndAdmin(currentGroup.value.groupID)
      console.log('获取群主', data)
      currentGroupUserlist.value = data
      const groupOwner = data.filter((item) => item.roleLevel === 100) //100 群主 20 普通成员 60 管理员
      isGroupOwner.value = groupOwner[0].userID === currentUser.value.id
      // // 判断当前用户是不是群主
    } catch (err) {
      console.error('获取群成员失败', err)
    }
  }

  // 退出群聊
  const handleQuitGroup = async () => {
    if (!confirm('确定要退出该群聊吗？')) return

    try {
      await globalSDK.quitGroup(currentGroup.value.groupID)
      alert('已退出群聊')
      closeGroupSidePanel()
      getGroupList() // 刷新群列表
      currentGroup.value = null
    } catch (err) {
      console.error('退出失败', err)
    }
  }

  // 解散群组（群主权限）
  const handleDissolveGroup = async () => {
    if (!confirm('解散后无法恢复，确定解散？')) return

    try {
      await globalSDK.dismissGroup(currentGroup.value.groupID)
      alert('群组已解散')
      currentGroup.value = null
      closeGroupSidePanel()
      getGroupList()
    } catch (err) {
      console.error('解散失败', err)
    }
  }

  // 新增：和群成员单独发消息
  const chatWithGroupMember = (member: any) => {
    // 找到该成员的会话，切换到消息标签页并选中
    const memberConv = conversations.value.find((conv) => conv.userID === member.userID)
    if (memberConv) {
      activeTab.value = 'chats'
      selectConversation(memberConv)
    } else {
      // 无会话时创建并切换
      selectedContact.value = member
      activeTab.value = 'contacts'
    }
  }
  // 开始视频通话
  const startVideoCall = () => {
    if (!currentConversation.value) return
    isInCall.value = true
    callType.value = 'video'
  }

  // 开始语音通话
  const startAudioCall = () => {
    if (!currentConversation.value) return
    isInCall.value = true
    callType.value = 'audio'
  }

  // 结束通话
  const endCall = () => {
    isInCall.value = false
    callType.value = ''
    isMuted.value = false
  }

  // 切换静音
  const toggleMute = () => {
    isMuted.value = !isMuted.value
  }

  // 切换摄像头
  const switchCamera = () => {
    // 模拟切换摄像头
    console.log('切换摄像头')
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString()
    }
  }

  // 获取头像首字母
  const getAvatarInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : ''
  }

  // 滚动到底部
  const scrollToBottom = () => {
    // 优先选择群聊消息容器，如果不存在则选择普通聊天容器
    let container = document.querySelector('.group-chat-container .chat-messages')
    if (!container) {
      container = document.querySelector('.chat-messages')
    }
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }
  // const getCookie = (name: string) => {
  //   const value = `; ${document.cookie}`
  //   const parts = value.split(`; ${name}=`)
  //   if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '')
  //   return null
  // }
  watch(
    () => currentGroup.value?.groupID,
    () => {
      if (currentGroup.value) {
        console.log('当前选中的群组是:', currentGroup.value)
        getGroupHistoryMessage(currentGroup.value.groupID)
      }
    },
    { immediate: true },
  )
  // 监听消息变化，自动滚动
  watch(currentMessages, () => {
    nextTick(() => {
      scrollToBottom()
    })
  })

  // 监听群聊消息变化，自动滚动
  watch(groupMessages, () => {
    nextTick(() => {
      scrollToBottom()
    })
  })
  // 监听会话变化，触发消息请求
  watch(
    () => currentConversation.value?.conversationID, // 监听会话ID变化
    () => {
      if (currentConversation.value) {
        console.log('当前选中的会话id是:', currentConversation.value.conversationID)
        fetchConversationMessages() // 会话变化时重新请求数据
      }
    },
    { immediate: true }, // 立即执行一次（页面初始化时获取默认会话）
  )

  onMounted(async () => {
    loading.value = true
    let names = new URLSearchParams(window.location.search).get('name')
    //let names = window.sessionStorage.getItem('imUserNames')
    // let names = getCookie('imUserNames')
    console.log('浏览器里存的用户名抓到了吗：', names)
    if (!names) {
      names = 'black'
    }

    try {
      const response = await getToken(`${names}`)
      console.log(response)
      // 在这里处理你的数据
      if (response.success) {
        console.log('去登录')
        ImLogin(response.userId, response.userToken)
        userStore.setuserID(response.userId)
        userStore.setToken(response.userToken)
        // const result = await getUserInfo(response.userId)
        // getUserInfo(response.userId)
        // console.log('用户信息：', result)
        currentUser.value = { id: response.userId, name: response.username, status: '在线' }
      }
    } catch (error) {
      console.error('请求失败:', error)
    }
  })

  // 初始化第一个对话
  if (conversations.value.length > 0 && conversations.value[0]) {
    currentConversation.value = conversations.value[0]
  }
  return {
    activeTab,
    currentUser,
    conversations,
    contacts,
    currentConversation,
    selectedContact,
    currentMessages,
    newMessage,
    searchQuery,
    filteredConversations,
    filteredContacts,
    unreadCounts,
    isInCall,
    callType,
    isMuted,
    showImagePicker,
    sampleImages,
    loading,
    showErrorInfo,
    resetSendLogin,
    isCurrentUser,
    getSenderName,
    getUnreadCount,
    selectConversation,
    selectContact,
    deleteConversation,
    createConversationWithContact,
    sendMessage,
    sendImage,
    startVideoCall,
    startAudioCall,
    endCall,
    toggleMute,
    switchCamera,
    getAvatarInitials,
    groups,
    currentGroup,
    showGroupSidePanel,
    openGroupSidePanel,
    closeGroupSidePanel,
    isGroupOwner,
    handleQuitGroup,
    handleDissolveGroup,
    chatWithGroupMember,
    selectGroup,
    filteredGroups,
    groupMessages,
    groupNewMessage,
    sendGroupMessage,
    getGroupUnreadCount,
    currentGroupUserlist,
    showCreateGroupModal,
    newGroupName,
    selectedUserIds,
    allUsers,
    toggleSelectUser,
    resetCreateGroupForm,
    confirmCreateGroup,
  }
}
