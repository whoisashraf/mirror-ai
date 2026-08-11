import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import { initializeAuth } from '@/lib/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path:'/', component:LandingView },
    { path:'/store/:slug', component:() => import('@/views/store/StoreHomeView.vue') },
    { path:'/store/:slug/product/:productId', component:() => import('@/views/store/ProductDetailView.vue') },
    { path:'/store/:slug/try-on/:generationId', component:() => import('@/views/TryOnView.vue'), meta:{ requiresAuth:true } },
    // Clean white-label routes used when the same app is mounted on a merchant custom domain.
    { path:'/product/:productId', component:() => import('@/views/store/ProductDetailView.vue') },
    { path:'/try-on/:generationId', component:() => import('@/views/TryOnView.vue'), meta:{ requiresAuth:true } },
    { path:'/privacy', component:() => import('@/views/PrivacyView.vue') },
    { path:'/auth', component:() => import('@/views/AuthView.vue') },
    { path:'/dashboard', component:() => import('@/views/dashboard/DashboardHomeView.vue'), meta:{ requiresAuth:true } },
    { path:'/dashboard/products', component:() => import('@/views/dashboard/DashboardProductsView.vue'), meta:{ requiresAuth:true } },
    { path:'/dashboard/analytics', component:() => import('@/views/dashboard/DashboardAnalyticsView.vue'), meta:{ requiresAuth:true } },
    { path:'/dashboard/settings', component:() => import('@/views/dashboard/DashboardSettingsView.vue'), meta:{ requiresAuth:true } },
    { path:'/:pathMatch(.*)*', component:() => import('@/views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top:0 }),
})

router.beforeEach(async (to) => {
  const user = await initializeAuth()
  if (to.meta.requiresAuth && !user) return { path:'/auth', query:{ redirect:to.fullPath } }
})

export default router
