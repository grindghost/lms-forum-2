import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Thread from './pages/Thread.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/thread/:id', name: 'thread', component: Thread, props: true }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
