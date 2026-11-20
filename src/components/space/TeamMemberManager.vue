<template>
  <a-drawer
    :open="open"
    :title="`成员管理 · ${spaceName || '团队空间'}`"
    :width="drawerWidth"
    destroy-on-close
    @close="emit('close')"
  >
    <section class="add-member-panel" aria-label="添加成员">
      <div>
        <h3>添加成员</h3>
        <p>成员添加后将立即加入团队，无需对方确认。</p>
      </div>
      <div class="add-member-form">
        <a-select
          v-model:value="selectedUserId"
          show-search
          allow-clear
          placeholder="按用户昵称搜索"
          :options="userOptions"
          :filter-option="false"
          :loading="searchingUsers"
          :not-found-content="searchKeyword ? '没有找到匹配用户' : '暂无可添加用户'"
          @search="searchUsers"
          @dropdown-visible-change="handleDropdownVisibleChange"
        />
        <a-select
          v-model:value="newMemberRole"
          aria-label="新成员角色"
          :options="SPACE_ROLE_OPTIONS"
        />
        <a-button
          type="primary"
          :disabled="!selectedUserId"
          :loading="addingMember"
          @click="addMember"
        >
          添加成员
        </a-button>
      </div>
    </section>

    <a-alert v-if="loadError" type="error" show-icon class="member-alert">
      <template #message>{{ loadError }}</template>
      <template #action>
        <a-button size="small" @click="loadMembers">重试</a-button>
      </template>
    </a-alert>

    <div class="members-heading">
      <h3>团队成员</h3>
      <a-tag>{{ members.length }} 人</a-tag>
    </div>
    <a-spin :spinning="loading">
      <a-list
        v-if="members.length"
        class="member-list"
        :data-source="members"
        :split="false"
        item-layout="horizontal"
      >
        <template #renderItem="{ item }">
          <a-list-item class="member-item">
            <a-list-item-meta>
              <template #avatar>
                <a-avatar :src="item.user?.userAvatar">
                  {{ (item.user?.userName || '成员').slice(0, 1) }}
                </a-avatar>
              </template>
              <template #title>
                <span class="member-name">{{ item.user?.userName || '未命名用户' }}</span>
                <a-tag v-if="isOwner(item)" color="gold">空间所有者</a-tag>
              </template>
              <template #description>
                {{ item.user?.userAccount || `用户 ID ${item.userId ?? '未知'}` }}
              </template>
            </a-list-item-meta>
            <div class="member-actions">
              <a-select
                :value="item.spaceRole"
                :options="SPACE_ROLE_OPTIONS"
                :disabled="isOwner(item) || isBusy(item)"
                :aria-label="`${item.user?.userName || '成员'}的角色`"
                @change="updateRole(item, $event)"
              />
              <a-popconfirm
                title="确定移除该成员吗？"
                ok-text="移除"
                cancel-text="取消"
                :disabled="isOwner(item) || isBusy(item)"
                @confirm="removeMember(item)"
              >
                <a-button
                  danger
                  type="text"
                  :disabled="isOwner(item) || isBusy(item)"
                  :loading="isBusy(item)"
                >
                  移除
                </a-button>
              </a-popconfirm>
            </div>
          </a-list-item>
        </template>
      </a-list>
      <a-empty v-else-if="!loading" description="还没有其他成员，添加一位成员开始协作" />
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { message } from 'ant-design-vue'
import {
  addSpaceUserUsingPost,
  deleteSpaceUserUsingPost,
  editSpaceUserUsingPost,
  listCandidateUserUsingPost,
  listSpaceUserUsingPost,
} from '@/api/spaceUserController'
import { SPACE_ROLE_ENUM, SPACE_ROLE_OPTIONS } from '@/constants/space'

const props = defineProps<{
  open: boolean
  spaceId?: number | string
  spaceName?: string
  spaceOwnerId?: number | string
}>()
const emit = defineEmits<{
  close: []
  changed: []
}>()

const members = ref<API.SpaceUserVO[]>([])
const loading = ref(false)
const loadError = ref('')
const selectedUserId = ref<string>()
const newMemberRole = ref(SPACE_ROLE_ENUM.VIEWER)
const addingMember = ref(false)
const busyMemberIds = ref<Set<string>>(new Set())
const userOptions = ref<{ label: string; value: string }[]>([])
const searchingUsers = ref(false)
const searchKeyword = ref('')
const drawerWidth = computed(() => (window.innerWidth < 720 ? '100%' : 640))
let loadGeneration = 0
let searchGeneration = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const isOwner = (member: API.SpaceUserVO) =>
  props.spaceOwnerId != null &&
  member.userId != null &&
  String(member.userId) === String(props.spaceOwnerId)
const isBusy = (member: API.SpaceUserVO) =>
  member.id != null && busyMemberIds.value.has(String(member.id))

const loadMembers = async () => {
  if (props.spaceId == null) return
  const generation = ++loadGeneration
  loading.value = true
  loadError.value = ''
  try {
    const res = await listSpaceUserUsingPost({ spaceId: props.spaceId })
    if (generation !== loadGeneration) return
    if (res.data.code !== 0 || !Array.isArray(res.data.data)) {
      loadError.value = res.data.message || '加载成员失败，请稍后重试'
      return
    }
    members.value = res.data.data
  } catch (error) {
    if (generation === loadGeneration) {
      console.error('加载团队成员失败:', error)
      loadError.value = '加载成员失败，请检查网络后重试'
    }
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}

const loadCandidateUsers = async (keyword: string) => {
  const generation = ++searchGeneration
  searchingUsers.value = true
  try {
    const res = await listCandidateUserUsingPost({
      userName: keyword || undefined,
      spaceId: props.spaceId,
      limit: 20,
    })
    if (generation !== searchGeneration) return
    if (res.data.code !== 0 || !Array.isArray(res.data.data)) {
      message.error('搜索用户失败：' + (res.data.message || '请稍后重试'))
      return
    }
    userOptions.value = res.data.data.flatMap((user) => {
      if (!user.id) return []
      return [
        {
          value: user.id,
          label: user.userName || '未命名用户',
        },
      ]
    })
  } catch (error) {
    if (generation === searchGeneration) {
      console.error('搜索候选用户失败:', error)
      message.error('搜索用户失败，请检查网络后重试')
    }
  } finally {
    if (generation === searchGeneration) searchingUsers.value = false
  }
}

const searchUsers = (keyword: string) => {
  searchKeyword.value = keyword.trim()
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadCandidateUsers(searchKeyword.value)
  }, 250)
}

const handleDropdownVisibleChange = (visible: boolean) => {
  if (visible && !userOptions.value.length && !searchingUsers.value) {
    void loadCandidateUsers(searchKeyword.value)
  }
}

const setMemberBusy = (id: number | string, busy: boolean) => {
  const next = new Set(busyMemberIds.value)
  if (busy) next.add(String(id))
  else next.delete(String(id))
  busyMemberIds.value = next
}

const addMember = async () => {
  if (props.spaceId == null || selectedUserId.value == null) return
  addingMember.value = true
  try {
    const res = await addSpaceUserUsingPost({
      spaceId: props.spaceId,
      userId: selectedUserId.value,
      spaceRole: newMemberRole.value,
    })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('添加成员失败：' + (res.data.message || '请稍后重试'))
      return
    }
    selectedUserId.value = undefined
    userOptions.value = []
    searchKeyword.value = ''
    message.success('成员已加入团队')
    await loadMembers()
    emit('changed')
  } catch (error) {
    console.error('添加团队成员失败:', error)
    message.error('添加成员失败，请检查网络后重试')
  } finally {
    addingMember.value = false
  }
}

const updateRole = async (member: API.SpaceUserVO, role: string) => {
  if (member.id == null || role === member.spaceRole || isOwner(member)) return
  setMemberBusy(member.id, true)
  try {
    const res = await editSpaceUserUsingPost({ id: member.id, spaceRole: role })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('修改角色失败：' + (res.data.message || '请稍后重试'))
      return
    }
    member.spaceRole = role
    message.success('成员角色已更新')
    emit('changed')
  } catch (error) {
    console.error('修改成员角色失败:', error)
    message.error('修改角色失败，请检查网络后重试')
  } finally {
    setMemberBusy(member.id, false)
  }
}

const removeMember = async (member: API.SpaceUserVO) => {
  if (member.id == null || isOwner(member)) return
  setMemberBusy(member.id, true)
  try {
    const res = await deleteSpaceUserUsingPost({ id: member.id })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('移除成员失败：' + (res.data.message || '请稍后重试'))
      return
    }
    members.value = members.value.filter((item) => item.id !== member.id)
    message.success('成员已移出团队')
    emit('changed')
  } catch (error) {
    console.error('移除团队成员失败:', error)
    message.error('移除成员失败，请检查网络后重试')
  } finally {
    setMemberBusy(member.id, false)
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      void loadMembers()
      void loadCandidateUsers('')
      return
    }
    clearTimeout(searchTimer)
    searchGeneration++
    searchingUsers.value = false
    selectedUserId.value = undefined
    userOptions.value = []
    searchKeyword.value = ''
  },
)

onBeforeUnmount(() => {
  loadGeneration++
  searchGeneration++
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.add-member-panel {
  padding: 20px;
  border-radius: 10px;
  background: #f1f6fc;
}

.add-member-panel h3,
.members-heading h3 {
  margin: 0;
  font-size: 16px;
}

.add-member-panel p {
  margin: 6px 0 16px;
  color: #64748b;
}

.add-member-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px auto;
  gap: 8px;
}

.members-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 8px;
}

.member-list {
  display: grid;
  gap: 8px;
}

.member-item {
  gap: 16px;
  padding: 14px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}

.member-name {
  margin-right: 8px;
  font-weight: 600;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-actions :deep(.ant-select) {
  width: 108px;
}

.member-alert {
  margin-top: 16px;
}

@media (max-width: 640px) {
  .add-member-form {
    grid-template-columns: 1fr;
  }

  .member-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .member-actions {
    width: 100%;
  }

  .member-actions :deep(.ant-select) {
    flex: 1;
    width: auto;
  }
}
</style>
