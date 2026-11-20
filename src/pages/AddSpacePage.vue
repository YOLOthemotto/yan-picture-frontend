<template>
  <div id="addSpacePage">
    <header class="page-heading">
      <a-tag :color="isTeamSpace ? 'blue' : 'default'">
        <TeamOutlined v-if="isTeamSpace" />
        <UserOutlined v-else />
        {{ spaceTypeName }}
      </a-tag>
      <h1>{{ isEditing ? `修改${spaceTypeName}` : `创建${spaceTypeName}` }}</h1>
      <p>
        {{
          isTeamSpace
            ? '创建后可在空间内添加成员，并为他们指定浏览者、编辑者或管理员角色。'
            : '为自己的图片建立独立空间，容量与访问范围完全由您管理。'
        }}
      </p>
    </header>
    <a-form
      class="space-form"
      name="spaceForm"
      layout="vertical"
      :model="spaceForm"
      :rules="rules"
      @finish="handleSubmit"
    >
      <a-form-item name="spaceName" :label="`${spaceTypeName}名称`">
        <a-input
          v-model:value="spaceForm.spaceName"
          :placeholder="`请输入${spaceTypeName}名称`"
          :maxlength="32"
          show-count
          allow-clear
        />
      </a-form-item>
      <a-form-item name="spaceLevel" label="空间级别">
        <a-select
          v-model:value="spaceForm.spaceLevel"
          placeholder="请选择空间级别"
          style="min-width: 180px"
          allow-clear
          :options="SPACE_LEVEL_OPTIONS"
        />
      </a-form-item>
      <a-form-item>
        <div class="form-actions">
          <a-button @click="router.back()">取消</a-button>
          <a-button type="primary" html-type="submit" :loading="loading">
            {{ isEditing ? '保存修改' : `创建${spaceTypeName}` }}
          </a-button>
        </div>
      </a-form-item>
    </a-form>
    <a-card class="level-card" title="空间级别" :bordered="false">
      <a-typography-paragraph>
        目前仅支持开通普通版；如需升级，请联系
        <a href="mailto:smshcynpy@163.com">严某</a>。
      </a-typography-paragraph>
      <div class="level-list">
        <div v-for="spaceLevel in spaceLevelList" :key="spaceLevel.value" class="level-item">
          <strong>{{ spaceLevel.text }}</strong>
          <span>{{ spaceLevel.maxSize == null ? '容量待定' : formatSize(spaceLevel.maxSize) }}</span>
          <span>最多 {{ spaceLevel.maxCount ?? '—' }} 张</span>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { TeamOutlined, UserOutlined } from '@ant-design/icons-vue'
import {
  addSpaceUsingPost,
  getSpaceVoByIdUsingGet,
  listSpaceLevelUsingGet,
  updateSpaceUsingPost,
} from '@/api/spaceController.ts'
import { useRoute, useRouter } from 'vue-router'
import { SPACE_LEVEL_ENUM, SPACE_LEVEL_OPTIONS, SPACE_TYPE_ENUM } from '@/constants/space.ts'
import { formatSize } from '@/utils'
import { useTeamSpaceStore } from '@/stores/useTeamSpaceStore'

const route = useRoute()
const router = useRouter()
const teamSpaceStore = useTeamSpaceStore()
const space = ref<API.SpaceVO>()
const spaceLevelList = ref<API.SpaceLevel[]>()
const isTeamSpace = computed(() => {
  if (space.value?.spaceType != null) return space.value.spaceType === SPACE_TYPE_ENUM.TEAM
  return route.path === '/add_team_space'
})
const isEditing = computed(() => Boolean(route.query.id))
const spaceTypeName = computed(() => (isTeamSpace.value ? '团队空间' : '个人空间'))
const spaceForm = reactive<API.SpaceAddRequest>({
  spaceLevel: SPACE_LEVEL_ENUM.COMMON,
  spaceType: SPACE_TYPE_ENUM.PRIVATE,
})
const rules = {
  spaceName: [
    { required: true, message: '请输入空间名称' },
    { min: 2, max: 32, message: '空间名称长度应为 2 至 32 个字符' },
  ],
  spaceLevel: [{ required: true, message: '请选择空间级别' }],
}

const loading = ref(false)

/**
 * 提交表单
 */
const handleSubmit = async () => {
  const spaceId = space.value?.id
  loading.value = true
  try {
    let res
    if (spaceId) {
      res = await updateSpaceUsingPost({ ...spaceForm, id: spaceId })
    } else {
      res = await addSpaceUsingPost({
        ...spaceForm,
        spaceType: isTeamSpace.value ? SPACE_TYPE_ENUM.TEAM : SPACE_TYPE_ENUM.PRIVATE,
      })
    }
    // 操作成功
    if (res.data.code === 0 && res.data.data) {
      await message.success('操作成功')
      if (isTeamSpace.value) await teamSpaceStore.loadTeamSpaces(true)
      router.push({
        path: `/space/${spaceId ?? res.data.data}`,
      })
    } else {
      await message.error('操作失败: ' + res.data.message)
    }
  } catch (error) {
    console.error('保存空间失败:', error)
    message.error('保存失败，请检查网络后重试')
  } finally {
    loading.value = false
  }
}

const fetchSpaceLevelList = async () => {
  try {
    const res = await listSpaceLevelUsingGet()
    if (res.data.code === 0 && res.data.data) {
      spaceLevelList.value = res.data.data
    } else {
      message.error('获取空间级别列表失败: ' + res.data.message)
    }
  } catch (error) {
    console.error('获取空间级别失败:', error)
    message.error('获取空间级别失败，请检查网络后重试')
  }
}

onMounted(() => {
  fetchSpaceLevelList()
})

const getOldSpace = async () => {
  const id = route.query?.id
  if (id != null) {
    if (typeof id !== 'string' || !/^\d+$/.test(id) || !/[1-9]/.test(id)) {
      message.error('空间 ID 无效')
      return
    }
    try {
      const res = await getSpaceVoByIdUsingGet({ id })
      if (res.data.code === 0 && res.data.data) {
        const data = res.data.data
        space.value = data
        spaceForm.spaceName = data.spaceName
        spaceForm.spaceLevel = data.spaceLevel
        spaceForm.spaceType = data.spaceType
      } else {
        await message.error('获取空间信息失败: ' + res.data.message)
      }
    } catch (error) {
      console.error('获取空间信息失败:', error)
      message.error('获取空间信息失败，请检查网络后重试')
    }
  }
}

onMounted(() => {
  getOldSpace()
})
</script>

<style scoped>
#addSpacePage {
  width: min(100%, 880px);
  margin: 0 auto 32px;
}

.page-heading {
  margin-bottom: 24px;
}

.page-heading h1 {
  margin: 12px 0 8px;
  font-size: 28px;
}

.page-heading p {
  max-width: 70ch;
  margin: 0;
  color: #64748b;
}

.space-form,
.level-card {
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.space-form {
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.level-list {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.level-item {
  display: grid;
  gap: 4px;
  padding: 16px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
}

.level-item strong {
  color: #0f172a;
}

@media (max-width: 640px) {
  .space-form,
  .level-card {
    padding: 18px;
  }

  .level-list {
    grid-template-columns: 1fr;
  }

  .form-actions > * {
    flex: 1;
  }
}
</style>
