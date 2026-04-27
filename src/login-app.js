import { createApp, ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js'

createApp({
  setup() {
    const username = ref('admin')
    const password = ref('admin123')
    const error = ref('')
    async function login() {
      error.value = ''
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value, password: password.value })
      })
      const data = await res.json()
      if (!res.ok) { error.value = data.message || '登录失败'; return }
      localStorage.setItem('nav_token', data.token)
      location.href = '/admin.html'
    }
    return { username, password, error, login }
  },
  template: `
  <main class="login-shell">
    <form class="login-card" @submit.prevent="login">
      <div class="logo">清</div>
      <h1>清漪导航后台</h1>
      <p>请输入管理员账号，进入配置台。</p>
      <label>账号<input v-model="username" autocomplete="username" /></label>
      <label>密码<input v-model="password" type="password" autocomplete="current-password" /></label>
      <button type="submit">登录</button>
      <span v-if="error" class="login-error">{{ error }}</span>
      <small>默认账号：admin / admin123</small>
    </form>
  </main>`
}).mount('#login-app')
