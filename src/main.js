// Main Vue application entry point
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// Create app instance
const app = createApp(App)

// Create and use Pinia
const pinia = createPinia()
app.use(pinia)

// Mount the app
app.mount('#app')