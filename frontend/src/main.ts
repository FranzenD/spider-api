import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import TrafficView from './views/TrafficView.vue'

const routes = [
  { path: '/', redirect: '/traffic' },
  { path: '/traffic', component: TrafficView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
