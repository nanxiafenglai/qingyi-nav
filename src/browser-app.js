import { createApp, computed, ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js'

const iconText = { Code2: '⌘', Cloud: '☁', ShieldCheck: '◈', Sparkles: '✦', Gauge: '▣', Palette: '✿' }

createApp({
  setup() {
    const keyword = ref('')
    const activeCategory = ref('全部')
    const site = ref({ title: '清漪导航', subtitle: '加载中...', logo_text: '清' })
    const categories = ref([])
    const links = ref([])

    const allCategories = computed(() => [{ id: 0, name: '全部' }, ...categories.value])
    const filteredLinks = computed(() => {
      const word = keyword.value.trim().toLowerCase()
      return links.value.filter((item) => {
        const categoryMatched = activeCategory.value === '全部' || item.category === activeCategory.value
        const wordMatched = !word || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(word)
        return categoryMatched && wordMatched
      })
    })
    const categoryCount = (name) => name === '全部' ? links.value.length : links.value.filter((item) => item.category === name).length
    const openLink = (item) => window.open(`/go/${item.id}`, '_blank', 'noopener,noreferrer')

    onMounted(async () => {
      const res = await fetch('/api/nav')
      const data = await res.json()
      site.value = data.site
      categories.value = data.categories
      links.value = data.links
    })

    return { keyword, activeCategory, site, allCategories, links, filteredLinks, categoryCount, openLink, iconText }
  },
  template: `
  <main class="page-shell">
    <section class="hero-panel">
      <nav class="topbar">
        <div class="brand"><div class="logo">{{ site.logo_text }}</div><div><strong>{{ site.title }}</strong><span>Qingyi Nav</span></div></div>

      </nav>
      <div class="hero-content">
        <p class="eyebrow">✦ 为主人聚合常用入口</p>
        <h1>一处收藏万千路径，<br />把工具、文档与灵感安放妥帖。</h1>
        <p class="subtitle">{{ site.subtitle }}</p>
        <div class="search-box">🔍<input v-model="keyword" placeholder="搜索网站、工具、文档、AI..." /></div>
      </div>
    </section>
    <section class="content-grid">
      <aside class="category-card">
        <h3>分类</h3>
        <button v-for="cat in allCategories" :key="cat.id" :class="['category-item', { active: activeCategory === cat.name }]" @click="activeCategory = cat.name">
          <span>{{ cat.name }}</span><small>{{ categoryCount(cat.name) }}</small>
        </button>
      </aside>
      <section class="links-section">
        <div class="section-head"><div><p>当前展示</p><h2>{{ activeCategory }} · {{ filteredLinks.length }} 个入口</h2></div><span>SQLite 数据驱动</span></div>
        <div class="link-grid">
          <article v-for="item in filteredLinks" :key="item.id" class="link-card" @click="openLink(item)">
            <div class="icon-wrap" :style="{ '--accent': item.color }">{{ iconText[item.icon] || '✦' }}</div>
            <div class="card-body"><div class="card-title"><h3>{{ item.name }}</h3><span v-if="item.visibility === 'private'" class="private-badge">私密</span><span>↗</span></div><p>{{ item.description }}</p><span>{{ item.category }}</span></div>
          </article>
        </div>
        <div v-if="!filteredLinks.length" class="empty-state">没有找到匹配的入口，换个关键词试试看。</div>
      </section>
    </section>
    <footer class="site-footer">{{ site.footer }}</footer>

  </main>`
}).mount('#app')
