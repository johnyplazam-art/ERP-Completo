import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import VueSonner from 'vue-sonner'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import router from './core/router'
import './styles/main.css'
import 'primeicons/primeicons.css'

// i18n setup
const i18n = createI18n({
  locale: 'es',
  fallbackLocale: 'es',
  messages: {
    es: {
      nav: {
        home: 'Inicio',
        panaderia: 'Panadería',
        inventario: 'Inventario',
        recetas: 'Recetas',
        produccion: 'Producción',
      },
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        search: 'Buscar',
        loading: 'Cargando...',
        noResults: 'Sin resultados',
      },
    },
  },
})

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

app.directive('tooltip', Tooltip)

app.mount('#app')
