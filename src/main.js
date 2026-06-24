import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import ConfirmDialog from 'primevue/confirmdialog'
import VueSonner from 'vue-sonner'
import i18n from './i18n'

import App from './App.vue'
import router from './core/router'
import { supabase } from './core/supabase'
import { setupGlobalErrorHandler } from './core/supabase-error'
import './styles/main.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.p-dark',
      cssLayer: false,
    },
  },
})
app.use(ToastService)
app.use(ConfirmationService)
app.use(VueSonner)
app.use(i18n)

app.component('ConfirmDialog', ConfirmDialog)
app.directive('tooltip', Tooltip)

// ─── Global Supabase error handler ────────────────────
// Debe ir DESPUÉS de app.use(createPinia()) para que
// useAuthStore() funcione, y DESPUÉS de app.use(router).
import { useAuthStore } from '@/core/store/auth'
const authStore = useAuthStore()
setupGlobalErrorHandler(supabase, { router, authStore })

app.mount('#app')
