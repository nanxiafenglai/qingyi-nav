<script setup>
import { computed, ref } from 'vue'
import { Search, Sparkles, ShieldCheck, Gauge, Cloud, Code2, Palette, Settings2, ExternalLink } from 'lucide-vue-next'

const keyword = ref('')
const activeCategory = ref('全部')

const categories = ['全部', '常用工具', '开发文档', 'AI 助手', '服务器', '设计灵感']

const links = [
  { name: 'GitHub', url: 'https://github.com', icon: Code2, category: '常用工具', desc: '代码托管与协作平台', color: '#24292f' },
  { name: 'Vercel', url: 'https://vercel.com', icon: Cloud, category: '常用工具', desc: '前端项目快速部署', color: '#111827' },
  { name: 'Vue Docs', url: 'https://vuejs.org', icon: Code2, category: '开发文档', desc: 'Vue 3 官方文档与生态', color: '#42b883' },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: ShieldCheck, category: '开发文档', desc: 'Web 标准与浏览器 API', color: '#2563eb' },
  { name: 'ChatGPT', url: 'https://chat.openai.com', icon: Sparkles, category: 'AI 助手', desc: '灵感、代码与知识助手', color: '#10a37f' },
  { name: 'Claude', url: 'https://claude.ai', icon: Sparkles, category: 'AI 助手', desc: '长文本分析与创作辅助', color: '#d97706' },
  { name: 'Portainer', url: 'https://www.portainer.io', icon: Gauge, category: '服务器', desc: 'Docker 可视化管理面板', color: '#13bef9' },
  { name: 'Cloudflare', url: 'https://cloudflare.com', icon: Cloud, category: '服务器', desc: 'DNS、CDN 与安全防护', color: '#f6821f' },
  { name: 'Dribbble', url: 'https://dribbble.com', icon: Palette, category: '设计灵感', desc: '界面与视觉设计灵感', color: '#ea4c89' },
  { name: 'Figma', url: 'https://figma.com', icon: Palette, category: '设计灵感', desc: '协同设计与原型工具', color: '#a855f7' },
]

const filteredLinks = computed(() => {
  const word = keyword.value.trim().toLowerCase()
  return links.filter((item) => {
    const categoryMatched = activeCategory.value === '全部' || item.category === activeCategory.value
    const wordMatched = !word || `${item.name} ${item.desc} ${item.category}`.toLowerCase().includes(word)
    return categoryMatched && wordMatched
  })
})

function openLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <main class="page-shell">
    <section class="hero-panel">
      <nav class="topbar">
        <div class="brand">
          <div class="logo">清</div>
          <div>
            <strong>清漪导航</strong>
            <span>Qingyi Nav</span>
          </div>
        </div>
        <button class="admin-entry"><Settings2 :size="17" /> 后台配置</button>
      </nav>

      <div class="hero-content">
        <p class="eyebrow"><Sparkles :size="16" /> 为主人聚合常用入口</p>
        <h1>一处收藏万千路径，<br />把工具、文档与灵感安放妥帖。</h1>
        <p class="subtitle">前台负责优雅展示，后续接入 Node.js + SQLite 后，所有分类与链接都能在后台自由配置。</p>

        <div class="search-box">
          <Search :size="22" />
          <input v-model="keyword" placeholder="搜索网站、工具、文档、AI..." />
        </div>
      </div>
    </section>

    <section class="content-grid">
      <aside class="category-card">
        <h3>分类</h3>
        <button
          v-for="cat in categories"
          :key="cat"
          :class="['category-item', { active: activeCategory === cat }]"
          @click="activeCategory = cat"
        >
          <span>{{ cat }}</span>
          <small>{{ cat === '全部' ? links.length : links.filter((item) => item.category === cat).length }}</small>
        </button>
      </aside>

      <section class="links-section">
        <div class="section-head">
          <div>
            <p>当前展示</p>
            <h2>{{ activeCategory }} · {{ filteredLinks.length }} 个入口</h2>
          </div>
          <span>Vue 3 原型预览</span>
        </div>

        <div class="link-grid">
          <article v-for="item in filteredLinks" :key="item.name" class="link-card" @click="openLink(item.url)">
            <div class="icon-wrap" :style="{ '--accent': item.color }">
              <component :is="item.icon" :size="24" />
            </div>
            <div class="card-body">
              <div class="card-title">
                <h3>{{ item.name }}</h3>
                <ExternalLink :size="16" />
              </div>
              <p>{{ item.desc }}</p>
              <span>{{ item.category }}</span>
            </div>
          </article>
        </div>

        <div v-if="!filteredLinks.length" class="empty-state">没有找到匹配的入口，换个关键词试试看。</div>
      </section>
    </section>
  </main>
</template>
