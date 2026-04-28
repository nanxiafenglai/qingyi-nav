import { createApp, computed, ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js'

const iconText = { Code2: '⌘', Cloud: '☁', ShieldCheck: '◈', Sparkles: '✦', Gauge: '▣', Palette: '✿' }

createApp({
  setup() {
    const site = ref({ title: '清漪导航' })
    const categories = ref([])
    const links = ref([])
    const activeCategory = ref('全部')
    const draggingId = ref(null)
    const dragOverId = ref(null)
    const savedText = ref('')
    const editingId = ref(null)
    const categoryEditingId = ref(null)
    const form = ref({ category_id: '', name: '', url: '', icon: 'Sparkles', color: '#4f8cff', description: '', visible: 1, visibility: 'public' })
    const categoryForm = ref({ name: '', sort: 99, visible: 1 })
    const siteForm = ref({ title: '', subtitle: '', logo_text: '清', footer: '', admin_path: '/admin' })
    const passwordForm = ref({ oldPassword: '', newPassword: '' })
    const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('nav_token') || ''}` })
    const authJsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() })

    async function adminFetch(url, options = {}) {
      const res = await fetch(url, options)
      if (res.status === 401) { localStorage.removeItem('nav_token'); location.href = '/login.html'; throw new Error('未登录') }
      return res
    }


    const allCategories = computed(() => [{ id: 0, name: '全部' }, ...categories.value])
    const visibleLinks = computed(() => links.value.filter((item) => activeCategory.value === '全部' || item.category === activeCategory.value))

    if (!localStorage.getItem('nav_token')) location.href = '/login.html'

    async function load() {
      const res = await fetch('/api/nav', { headers: authHeaders() })
      const data = await res.json()
      site.value = data.site
      siteForm.value = { ...data.site }
      categories.value = data.categories
      links.value = data.links
      if (!form.value.category_id && data.categories[0]) form.value.category_id = data.categories[0].id
    }
    async function saveSort() {
      await adminFetch('/api/admin/links/sort', {
        method: 'PUT', headers: authJsonHeaders(),
        body: JSON.stringify({ ids: visibleLinks.value.map((item) => item.id) })
      })
      savedText.value = '排序已保存'
      setTimeout(() => (savedText.value = ''), 1600)
    }
    async function moveLink(targetId) {
      if (!draggingId.value || draggingId.value === targetId) return
      const from = links.value.findIndex((item) => item.id === draggingId.value)
      const to = links.value.findIndex((item) => item.id === targetId)
      if (from < 0 || to < 0) return
      const next = [...links.value]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      links.value = next
      await saveSort()
    }
    function resetForm() {
      editingId.value = null
      form.value = { category_id: categories.value[0]?.id || '', name: '', url: '', icon: 'Sparkles', color: '#4f8cff', description: '', visible: 1, visibility: 'public' }
    }
    function editLink(item) {
      editingId.value = item.id
      form.value = { category_id: item.category_id, name: item.name, url: item.url, icon: item.icon, color: item.color, description: item.description, visible: 1, visibility: item.visibility || 'public' }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    async function submitLink() {
      const payload = { ...form.value, category_id: Number(form.value.category_id), visible: Number(form.value.visible) }
      const url = editingId.value ? `/api/admin/links/${editingId.value}` : '/api/admin/links'
      await adminFetch(url, { method: editingId.value ? 'PUT' : 'POST', headers: authJsonHeaders(), body: JSON.stringify(payload) })
      savedText.value = editingId.value ? '入口已更新' : '入口已新增'
      resetForm()
      await load()
      setTimeout(() => (savedText.value = ''), 1600)
    }
    async function deleteLink(id) {
      if (!confirm('确定删除这个入口吗？')) return
      await adminFetch(`/api/admin/links/${id}`, { method: 'DELETE', headers: authHeaders() })
      savedText.value = '入口已删除'
      await load()
      setTimeout(() => (savedText.value = ''), 1600)
    }
    function resetCategoryForm() {
      categoryEditingId.value = null
      categoryForm.value = { name: '', sort: 99, visible: 1 }
    }
    function editCategory(cat) {
      categoryEditingId.value = cat.id
      categoryForm.value = { name: cat.name, sort: cat.sort ?? 99, visible: 1 }
    }
    async function submitCategory() {
      const payload = { ...categoryForm.value, sort: Number(categoryForm.value.sort), visible: Number(categoryForm.value.visible) }
      const url = categoryEditingId.value ? `/api/admin/categories/${categoryEditingId.value}` : '/api/admin/categories'
      await adminFetch(url, { method: categoryEditingId.value ? 'PUT' : 'POST', headers: authJsonHeaders(), body: JSON.stringify(payload) })
      savedText.value = categoryEditingId.value ? '分类已更新' : '分类已新增'
      resetCategoryForm()
      await load()
      setTimeout(() => (savedText.value = ''), 1600)
    }
    async function deleteCategory(id) {
      if (!confirm('确定删除这个分类吗？分类下有入口时不能删除。')) return
      const res = await adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) return alert(data.message || '删除失败')
      savedText.value = '分类已删除'
      if (activeCategory.value !== '全部' && !categories.value.find((cat) => cat.name === activeCategory.value)) activeCategory.value = '全部'
      await load()
      setTimeout(() => (savedText.value = ''), 1600)
    }
    async function submitSite() {
      await adminFetch('/api/admin/site-config', { method: 'PUT', headers: authJsonHeaders(), body: JSON.stringify(siteForm.value) })
      savedText.value = '站点配置已保存'
      await load()
      setTimeout(() => (savedText.value = ''), 1600)
    }

    async function changePassword() {
      if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 6) return alert('新密码至少 6 位')
      const res = await adminFetch('/api/admin/password', { method: 'PUT', headers: authJsonHeaders(), body: JSON.stringify(passwordForm.value) })
      const data = await res.json()
      if (!res.ok) return alert(data.message || '修改失败')
      alert('密码已修改，请重新登录')
      localStorage.removeItem('nav_token')
      location.href = '/login.html'
    }
    async function logout() {
      await adminFetch('/api/admin/logout', { method: 'POST', headers: authHeaders() })
      localStorage.removeItem('nav_token')
      location.href = '/login.html'
    }


    onMounted(load)
    return { site, categories, links, activeCategory, allCategories, visibleLinks, draggingId, dragOverId, savedText, iconText, moveLink, form, editingId, submitLink, editLink, deleteLink, resetForm, categoryForm, categoryEditingId, submitCategory, editCategory, deleteCategory, resetCategoryForm, siteForm, submitSite, passwordForm, changePassword, logout }
  },
  template: `
  <main class="admin-shell">
    <aside class="admin-sidebar">
      <div class="brand"><div class="logo">清</div><div><strong>{{ site.title }}</strong><span>Admin Console</span></div></div>
      <button class="side-item active">入口管理</button>
      <button class="side-item active muted">分类管理</button>
      <button class="side-item active muted">站点配置</button>
      <a class="back-home" href="/">← 返回前台</a>
      <button class="side-item logout" @click="logout">退出登录</button>

    </aside>
    <section class="admin-main">
      <div class="admin-head">
        <div><p>后台配置</p><h1>拖拽入口卡片，调整前台展示顺序</h1></div>
        <span>{{ savedText || '松手后自动保存' }}</span>
      </div>
      <form class="site-form" @submit.prevent="submitSite">
        <div class="form-title"><strong>站点配置</strong><span>后台路径默认 /admin，保存后用新路径访问</span></div>
        <label>站点标题<input v-model="siteForm.title" required /></label>
        <label>Logo 字<input v-model="siteForm.logo_text" maxlength="2" /></label>
        <label>后台路径<input v-model="siteForm.admin_path" required placeholder="/admin" /></label>

        <label class="wide">副标题<input v-model="siteForm.subtitle" /></label>
        <label class="wide">页脚<input v-model="siteForm.footer" /></label>
        <button class="submit-btn" type="submit">保存站点配置</button>
      </form>
      <form class="password-form" @submit.prevent="changePassword">
        <div class="form-title"><strong>修改密码</strong><span>修改后需重新登录</span></div>
        <label>旧密码<input v-model="passwordForm.oldPassword" type="password" required /></label>
        <label>新密码<input v-model="passwordForm.newPassword" type="password" required /></label>
        <button class="submit-btn" type="submit">修改密码</button>
      </form>

      <form class="link-form" @submit.prevent="submitLink">
        <div class="form-title"><strong>{{ editingId ? '编辑入口' : '新增入口' }}</strong><button v-if="editingId" type="button" @click="resetForm">取消编辑</button></div>
        <label>名称<input v-model="form.name" required placeholder="例如 GitHub" /></label>
        <label>链接<input v-model="form.url" required placeholder="https://example.com" /></label>
        <label>分类<select v-model="form.category_id" required><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option></select></label>
        <label>图标<select v-model="form.icon"><option>Code2</option><option>Cloud</option><option>ShieldCheck</option><option>Sparkles</option><option>Gauge</option><option>Palette</option></select></label>
        <label>颜色<input v-model="form.color" type="color" /></label>
        <label>可见范围<select v-model="form.visibility"><option value="public">公开</option><option value="private">仅自己可见</option></select></label>

        <label class="wide">描述<input v-model="form.description" placeholder="一句话说明这个入口" /></label>
        <button class="submit-btn" type="submit">{{ editingId ? '保存修改' : '新增入口' }}</button>
      </form>
      <section class="category-manager">
        <form class="category-form" @submit.prevent="submitCategory">
          <div class="form-title"><strong>{{ categoryEditingId ? '编辑分类' : '新增分类' }}</strong><button v-if="categoryEditingId" type="button" @click="resetCategoryForm">取消编辑</button></div>
          <label>分类名<input v-model="categoryForm.name" required placeholder="例如 常用工具" /></label>
          <label>排序<input v-model="categoryForm.sort" type="number" /></label>
          <button class="submit-btn" type="submit">{{ categoryEditingId ? '保存分类' : '新增分类' }}</button>
        </form>
        <div class="category-list">
          <article v-for="cat in categories" :key="cat.id" class="category-row">
            <strong>{{ cat.name }}</strong><span>排序 {{ cat.sort }}</span>
            <button @click="editCategory(cat)" type="button">编辑</button>
            <button class="danger" @click="deleteCategory(cat.id)" type="button">删除</button>
          </article>
        </div>
      </section>


      <div class="admin-cats">
        <button v-for="cat in allCategories" :key="cat.id" :class="{ active: activeCategory === cat.name }" @click="activeCategory = cat.name">{{ cat.name }}</button>
      </div>
      <div class="sort-list">
        <article
          v-for="(item, index) in visibleLinks"
          :key="item.id"
          draggable="true"
          :class="['sort-card', { dragging: draggingId === item.id, over: dragOverId === item.id }]"
          @dragstart="draggingId = item.id"
          @dragover.prevent="dragOverId = item.id"
          @dragleave="dragOverId = null"
          @drop.prevent="moveLink(item.id); dragOverId = null"
          @dragend="draggingId = null; dragOverId = null"
        >
          <span class="sort-no">{{ index + 1 }}</span>
          <span class="drag-grip">⋮⋮</span>
          <div class="sort-icon" :style="{ '--accent': item.color }">{{ iconText[item.icon] || '✦' }}</div>
          <div class="sort-info"><strong>{{ item.name }}</strong><p>{{ item.description }}</p></div>
          <span class="sort-tag">{{ item.category }}</span>
          <span v-if="item.visibility === 'private'" class="sort-private">私密</span>
          <div class="row-actions">
            <button @click="editLink(item)" type="button">编辑</button>
            <button class="danger" @click="deleteLink(item.id)" type="button">删除</button>
          </div>
        </article>
      </div>
    </section>
  </main>`
}).mount('#admin-app')
