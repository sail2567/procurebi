<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { USING_MOCK } from '../api'
import PasswordInput from '../components/PasswordInput.vue'
import { safeRedirect } from '../router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码。'
    return
  }

  try {
    await auth.login(username.value, password.value)
    await router.replace(safeRedirect(route.query.redirect) ?? '/chat')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-shell">
      <section class="login-brand">
        <div class="brand-mark login-mark">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19V9" />
            <path d="M10 19V5" />
            <path d="M16 19v-6" />
            <path d="M22 19H2" />
          </svg>
        </div>
        <h1 class="login-name">ProcureBI</h1>
        <p class="login-lead">大模型采购的成本与用量分析</p>
      </section>

      <section class="login-panel">
        <div class="login-panel-head">
          <h2>登录</h2>
        </div>

        <form class="login-form" @submit.prevent="submit">
          <label class="field">
            <span>用户名</span>
            <input
              v-model="username"
              class="input"
              type="text"
              autocomplete="username"
              placeholder="请输入用户名"
              autofocus
            />
          </label>
          <label class="field">
            <span>密码</span>
            <PasswordInput
              v-model="password"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
          </label>

          <p v-if="error || auth.error" class="inline-error">{{ error || auth.error }}</p>

          <button class="btn btn-primary login-submit" type="submit" :disabled="auth.loading">
            {{ auth.loading ? '登录中…' : '登录' }}
          </button>
        </form>

        <div v-if="USING_MOCK" class="login-demo">
          <span class="tag">Mock 演示</span>
          <p>管理员：admin / admin123456</p>
          <p>普通用户：viewer / viewer123456</p>
        </div>
        <p v-else class="login-foot">没有账号？请联系管理员开通。</p>
      </section>
    </div>
  </div>
</template>
