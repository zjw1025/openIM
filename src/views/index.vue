<template>
  <div id="app">
    <div v-if="loading" class="loading-container"></div>
    <div class="tabs">
      <div class="avatar">{{ getAvatarInitials(currentUser.name) }}</div>
      <ul>
        <li>
          <div
            class="bg"
            @click="activeTab = 'chats'"
            :class="activeTab == 'chats' ? 'actaside' : ''"
          >
            <i class="iconfont icon-huihua-copy"></i>
            <p>消息</p>
          </div>
        </li>
        <li>
          <div
            class="bg"
            @click="activeTab = 'group'"
            :class="activeTab == 'group' ? 'actaside' : ''"
          >
            <i class="iconfont icon-bg-group"></i>
            <p>群组</p>
          </div>
        </li>
        <li>
          <div
            class="bg"
            @click="activeTab = 'contacts'"
            :class="activeTab == 'contacts' ? 'actaside' : ''"
          >
            <i class="iconfont icon-bg-maillist"></i>
            <p>通讯录</p>
          </div>
        </li>
      </ul>
    </div>

    <div class="sidebar">
      <!-- <div class="header">
        <div class="avatar">{{ getAvatarInitials(currentUser.name) }}</div>
        <div class="user-info">
          <div class="username">{{ currentUser.name }}</div>
        </div>
      </div> -->

      <div class="search-bar">
        <input
          type="text"
          class="search-input"
          :placeholder="
            activeTab === 'chats'
              ? '搜索会话...'
              : activeTab === 'group'
                ? '搜索群组...'
                : '搜索联系人...'
          "
          v-model="searchQuery"
        />
      </div>

      <div v-if="activeTab === 'group'" class="group-actions">
        <button class="create-group-btn" @click="showCreateGroupModal = true">
          <i class="iconfont icon-add"></i> 新建群组
        </button>
      </div>

      <div class="content-area">
        <div v-if="activeTab === 'chats'" class="conversation-list">
          <div
            v-for="conv in filteredConversations"
            :key="conv.userID"
            :class="['conversation-item', { active: currentConversation?.userID === conv.userID }]"
            @click="selectConversation(conv)"
          >
            <div class="conv-avatar" v-if="conv.conversationType != 3">
              {{ getAvatarInitials(conv.showName) }}
              <div v-if="getUnreadCount(conv.userID) > 0" class="unread-dot"></div>
            </div>
            <div class="conv-avatar" v-if="conv.conversationType == 3">
              <i class="iconfont icon-bg-group" style="font-size: 22px"></i>
              <div v-if="getUnreadCount(conv.userID) > 0" class="unread-dot"></div>
            </div>
            <div class="conv-info">
              <div class="conv-name">
                {{ conv.showName }}
                <span v-if="conv.conversationType == 3" class="group-indicator">群组</span>
              </div>
              <div class="conv-preview">
                {{ JSON.parse(conv.latestMsg).textElem?.content.replace(/\\"/g, '') }}
              </div>
            </div>
            <div class="conv-actions">
              <div class="conv-time">
                {{
                  `${new Date(conv.latestMsgSendTime).getHours().toString().padStart(2, '0')}:${new Date(conv.latestMsgSendTime).getMinutes().toString().padStart(2, '0')}`
                }}
              </div>
              <button class="delete-btn" @click.stop="deleteConversation(conv.userID)">✕</button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'group'" class="group-list">
          <div
            v-for="group in filteredGroups"
            :key="group.groupID"
            :class="['group-item', { active: currentGroup?.groupID === group.groupID }]"
            @click="selectGroup(group)"
          >
            <!-- 头像：和会话列表头像结构一致 -->
            <div class="group-avatar">
              <i class="iconfont icon-bg-group"></i>
              <!-- 如需显示未读消息红点，可保留 -->
              <div v-if="getGroupUnreadCount(group.groupID) > 0" class="unread-dot"></div>
            </div>

            <!-- 信息区域：和会话列表信息结构一致 -->
            <div class="group-info">
              <div class="group-name">
                <span class="name" :title="group.groupName">{{ group.groupName }}</span>
                <!-- 如需显示群组标识，可保留 -->
                <span class="group-indicator">群组</span>
              </div>
              <div class="group-member-count">群成员：{{ group.memberCount }}人</div>
            </div>

            <!-- 操作区域：和会话列表结构一致（隐藏，如需显示可调整） -->
            <!-- <div class="item-actions">
              <div class="item-time"></div>
              <button class="delete-btn" @click.stop="deleteGroup(group.groupID)">✕</button>
            </div> -->
          </div>
        </div>

        <div v-if="activeTab === 'contacts'" class="contacts-list">
          <div
            v-for="contact in filteredContacts"
            :key="contact.userID"
            class="contact-item"
            @click="selectContact(contact)"
          >
            <div class="contact-avatar">{{ getAvatarInitials(contact.nickname) }}</div>
            <div class="contact-info">
              <div class="contact-name">{{ contact.nickname }}</div>
              <!-- <div class="contact-status">{{ contact.status }}</div> -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content" v-if="activeTab === 'chats' && currentConversation">
      <div class="chat-header">
        <div class="chat-avatar">
          {{ getAvatarInitials(currentConversation?.showName || '') }}
        </div>
        <div>
          <div class="chat-title">{{ currentConversation?.showName }}</div>
          <!-- <div class="chat-status">{{ currentConversation?.status }}</div> -->
        </div>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(msg, index) in currentMessages"
          :key="msg.clientMsgID || index"
          :class="['message', msg.sendID === currentUser.id ? 'sent' : 'received']"
        >
          <div class="message-header" v-if="!isCurrentUser(msg.sendID)">
            {{ msg.senderNickname }}
          </div>
          <div class="message-bg">
            <div v-if="msg.contentType === 101">{{ msg.textElem.content }}</div>
            <!-- <div v-else-if="msg.contentType === 102">
            <img :src="msg.content" alt="图片消息" class="message-image" />
          </div> -->
            <div class="message-time">
              {{
                `${(new Date(msg.createTime).getMonth() + 1).toString().padStart(2, '0')}-${new Date(msg.createTime).getDate().toString().padStart(2, '0')} ${new Date(msg.createTime).getHours().toString().padStart(2, '0')}:${new Date(msg.createTime).getMinutes().toString().padStart(2, '0')}`
              }}
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <!-- <div class="input-tools">
          <button class="tool-btn" @click="showImagePicker = true">🖼️</button>
          <button class="tool-btn" @click="startVideoCall">🎥</button>
          <button class="tool-btn" @click="startAudioCall">🎤</button>
        </div> -->

        <textarea
          class="message-input"
          v-model="newMessage"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="sendMessage"
        ></textarea>

        <button class="send-btn" @click="sendMessage">发送</button>
      </div>
    </div>

    <div class="main-content" v-else-if="activeTab === 'contacts' && selectedContact">
      <div class="chat-header">
        <div class="chat-avatar">{{ getAvatarInitials(selectedContact?.nickname || '') }}</div>
        <div>
          <div class="chat-title">{{ selectedContact?.nickname }}</div>
          <!-- <div class="chat-status">{{ selectedContact?.status }}</div> -->
        </div>
      </div>

      <div class="chat-messages">
        <p style="text-align: center; color: #7f8c8d; margin-top: 50px">点击下方按钮开始聊天</p>
      </div>

      <div class="chat-input-area">
        <button class="send-btn" @click="createConversationWithContact">开始聊天</button>
      </div>
    </div>
    <div class="main-content" v-else-if="activeTab === 'group'">
      <!-- 未选中群组 -->
      <div
        v-if="!currentGroup"
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #7f8c8d;
        "
      >
        <div style="text-align: center">
          <h3>选择一个群组开始聊天</h3>
          <p>从左侧列表中选择群组进行群聊</p>
        </div>
      </div>

      <!-- 选中群组：群组聊天界面（参考单聊样式） -->
      <div v-else class="group-chat-container">
        <!-- 群组聊天头部（增加查看群成员按钮） -->
        <div class="chat-header">
          <div class="chat-avatar">{{ getAvatarInitials(currentGroup.groupName) }}</div>
          <div style="flex: 1">
            <div class="chat-title">{{ currentGroup.groupName }}</div>
          </div>
          <!-- 查看群成员按钮移到这里 -->
          <!-- <button class="member-btn" @click.stop="showGroupMembers(currentGroup)">
            👥 查看群成员
          </button> -->
          <button class="more-btn" @click.stop="openGroupSidePanel">...</button>
        </div>

        <!-- 群组聊天消息区域 -->
        <div class="chat-messages" ref="groupMessagesContainer">
          <!-- 模拟群聊消息（实际需对接SDK获取群消息） -->
          <div
            v-for="(msg, index) in groupMessages"
            :key="index"
            :class="['message', msg.sendID === currentUser.id ? 'sent' : 'received']"
          >
            <!-- 所有消息都显示发送者名称（群聊特性） -->
            <div class="message-header">
              {{ msg.senderNickname }}
            </div>
            <div class="message-bg">
              <div v-if="msg.contentType === 101">{{ msg.textElem.content }}</div>
              <div class="message-time">
                {{
                  `${(new Date(msg.createTime).getMonth() + 1).toString().padStart(2, '0')}-${new Date(msg.createTime).getDate().toString().padStart(2, '0')} ${new Date(msg.createTime).getHours().toString().padStart(2, '0')}:${new Date(msg.createTime).getMinutes().toString().padStart(2, '0')}`
                }}
              </div>
            </div>
          </div>
        </div>

        <!-- 群组消息输入区域 -->
        <div class="chat-input-area">
          <textarea
            class="message-input"
            v-model="groupNewMessage"
            placeholder="输入群消息..."
            @keydown.enter.exact.prevent="sendGroupMessage"
          ></textarea>
          <button class="send-btn" @click="sendGroupMessage">发送</button>
        </div>
      </div>
    </div>

    <div class="main-content" v-else-if="activeTab === 'chats' && !currentConversation">
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #7f8c8d;
        "
      >
        <div style="text-align: center">
          <h3>选择一个会话开始聊天</h3>
          <p>从左侧列表中选择一个会话或联系人开始对话</p>
        </div>
      </div>
    </div>

    <div class="main-content" v-else-if="activeTab === 'contacts' && !selectedContact">
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #7f8c8d;
        "
      >
        <div style="text-align: center">
          <h3>选择一个联系人查看详细信息</h3>
          <p>从左侧通讯录中选择一个联系人开始对话</p>
        </div>
      </div>
    </div>

    <!-- 视频通话界面 -->
    <div class="video-call-overlay" v-if="isInCall">
      <h2>
        {{ callType === 'video' ? '视频通话' : '语音通话' }} -
        {{ currentConversation?.showName || '未知' }}
      </h2>

      <div class="video-container" v-if="callType === 'video'">
        <div class="local-video">
          <div>本地视频</div>
        </div>
        <div class="remote-video">
          <div>对方视频</div>
        </div>
      </div>

      <div class="call-controls">
        <button class="call-btn mute-call" @click="toggleMute">
          {{ isMuted ? '🎤' : '🔇' }}
        </button>
        <button class="call-btn end-call" @click="endCall">📞</button>
        <button class="call-btn switch-camera" @click="switchCamera" v-if="callType === 'video'">
          🔄
        </button>
      </div>
    </div>

    <!-- 图片选择器 -->
    <div v-if="showImagePicker" class="video-call-overlay">
      <h2>选择图片发送</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px">
        <div
          v-for="(img, idx) in sampleImages"
          :key="idx"
          :style="{
            backgroundImage: `url('${img}')`,
            backgroundSize: 'cover',
            width: '120px',
            height: '120px',
            cursor: 'pointer',
            borderRadius: '10px',
          }"
          @click="sendImage(img)"
        ></div>
      </div>
      <button class="send-btn" @click="showImagePicker = false">取消</button>
    </div>

    <div class="modal-error" v-if="showErrorInfo">
      <div class="modal-content">
        <div class="modal-header">
          <h3>错误提示</h3>
          <button class="close-modal" @click="showErrorInfo = false">✕</button>
        </div>
        <p style="height: 160px; padding: 30px 22px 16px 22px">
          通讯服务加载失败，点击确定重新发起请求
        </p>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="showErrorInfo = false">取消</button>
        <button class="confirm-btn" @click="resetSendLogin()">确定</button>
      </div>
    </div>

    <div class="modal-overlay" v-if="showCreateGroupModal">
      <div class="modal-content create-group-modal">
        <div class="modal-header">
          <h3>创建新群组</h3>
          <button class="close-modal" @click="showCreateGroupModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- 群组名称输入 -->
          <div class="form-item">
            <label>群组名称：</label>
            <input
              type="text"
              v-model="newGroupName"
              class="group-name-input"
              placeholder="请输入群组名称"
            />
          </div>

          <!-- 成员选择列表 -->
          <div class="member-select-title">选择群成员：</div>
          <div class="member-select-list">
            <div v-for="user in allUsers" :key="user.userID" class="member-select-item">
              <label :for="`user-${user.userID}`" class="member-label">
                <input
                  type="checkbox"
                  :id="`user-${user.userID}`"
                  :checked="selectedUserIds.includes(user.userID)"
                  @change="toggleSelectUser(user.userID)"
                  @click.stop
                />
                <div class="member-avatar">{{ getAvatarInitials(user.nickname) }}</div>
                <div class="member-name">{{ user.nickname }}</div>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="resetCreateGroupForm()">取消</button>
          <button
            class="confirm-btn"
            @click="confirmCreateGroup()"
            :disabled="selectedUserIds.length === 0 || !newGroupName.trim()"
          >
            确定创建
          </button>
        </div>
      </div>
    </div>
    <!-- 群信息右侧侧边栏 -->
    <div class="group-side-overlay" v-if="showGroupSidePanel" @click="closeGroupSidePanel">
      <div class="group-side-panel" @click.stop>
        <div class="side-header">
          <h3>群信息</h3>
          <button class="close-btn" @click="closeGroupSidePanel">✕</button>
        </div>

        <!-- 群基础信息 -->
        <div class="group-info-section">
          <div class="group-avatar-large">{{ getAvatarInitials(currentGroup.groupName) }}</div>
          <div class="group-name-text">{{ currentGroup.groupName }}</div>
          <div class="group-desc">共 {{ currentGroupUserlist.length }} 位成员</div>
        </div>

        <!-- 群成员列表 -->
        <div class="member-section">
          <div class="section-title">群成员</div>
          <div class="member-list">
            <div v-for="member in currentGroupUserlist" :key="member.userID" class="member-item">
              <div class="member-avatar">{{ getAvatarInitials(member.nickname) }}</div>
              <div class="member-info">
                <div class="member-name">{{ member.nickname }}</div>
                <div class="member-role" v-if="member.roleLevel == 1">[群主]</div>
                <div class="member-role" v-else-if="member.roleLevel == 2">[管理员]</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="action-section">
          <!-- 群主显示解散群组 -->
          <button v-if="isGroupOwner" class="dissolve-btn" @click="handleDissolveGroup">
            解散群组
          </button>

          <!-- 所有人显示退出群组 -->
          <button class="quit-btn" @click="handleQuitGroup">退出群聊</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import './index.less'
import { usePage } from './index'
const {
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
  resetSendLogin,
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
  getGroupUnreadCount,
  sendGroupMessage,
  groupMessages,
  groupNewMessage,
  currentGroupUserlist,
  showCreateGroupModal,
  newGroupName,
  selectedUserIds,
  allUsers,
  toggleSelectUser,
  resetCreateGroupForm,
  confirmCreateGroup,
} = usePage()
</script>
