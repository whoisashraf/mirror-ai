import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path:'/', component:LandingView },
    { path:'/store/:slug', component:() => import('@/views/store/StoreHomeView.vue') },
    { path:'/store/:slug/product/:productId', component:() => import('@/views/store/ProductDetailView.vue') },
    { path:'/store/:slug/try-on/:generationId', component:() => import('@/views/TryOnView.vue') },
    // Clean white-label routes used when the same app is mounted on a merchant custom domain.
    { path:'/product/:productId', component:() => import('@/views/store/ProductDetailView.vue') },
    { path:'/try-on/:generationId', component:() => import('@/views/TryOnView.vue') },
    { path:'/privacy', component:() => import('@/views/PrivacyView.vue') },
    { path:'/auth', component:() => import('@/views/AuthView.vue') },
    { path:'/dashboard', component:() => import('@/views/dashboard/DashboardHomeView.vue') },
    { path:'/dashboard/products', component:() => import('@/views/dashboard/DashboardProductsView.vue') },
    { path:'/dashboard/analytics', component:() => import('@/views/dashboard/DashboardAnalyticsView.vue') },
    { path:'/dashboard/settings', component:() => import('@/views/dashboard/DashboardSettingsView.vue') },
    { path:'/:pathMatch(.*)*', component:() => import('@/views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top:0 }),
})

export default router
