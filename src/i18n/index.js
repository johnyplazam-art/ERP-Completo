import { createI18n } from 'vue-i18n'
import es from './es.json'
import en from './en.json'

// Función para obtener el locale de forma segura (evita error de localStorage en tests)
function getInitialLocale() {
  try {
    const savedLocale = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null
    if (savedLocale) return savedLocale
    
    const browserLocale = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'es'
    return (browserLocale === 'en' ? 'en' : 'es')
  } catch (e) {
    return 'es'
  }
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'es',
  messages: { es, en },
})

export default i18n
