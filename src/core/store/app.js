import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/core/supabase'

export const useAppStore = defineStore('app', () => {
  const STORAGE_KEY_SIDEBAR = 'panaderia_sidebar_collapsed'
  const STORAGE_KEY_THEME = 'panaderia_theme'

  // Inicializar desde localStorage
  const sidebarCollapsed = ref(localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true')
  const theme = ref(localStorage.getItem(STORAGE_KEY_THEME) || 'light')

  // Persistir cambios automáticamente
  watch(sidebarCollapsed, (val) => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR, String(val))
  })

  watch(theme, (val) => {
    localStorage.setItem(STORAGE_KEY_THEME, val)
  })

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setTheme(newTheme) {
    theme.value = newTheme
  }

  // ─── Admin apps ──────────────────────────────────

  async function cargarApps() {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('orden', { ascending: true })
      .order('name')
    if (error) throw error
    return data ?? []
  }

  async function slugExiste(slug, excludeId) {
    let query = supabase.from('applications').select('id').eq('slug', slug)
    if (excludeId) query = query.neq('id', excludeId)
    const { data } = await query.maybeSingle()
    return !!data
  }

  async function crearApp(payload) {
    const { error } = await supabase.from('applications').insert(payload)
    if (error) throw error
  }

  async function actualizarApp(id, payload) {
    const { error } = await supabase.from('applications').update(payload).eq('id', id)
    if (error) throw error
  }

  async function toggleActiva(appId, isActive) {
    const { error } = await supabase
      .from('applications')
      .update({ is_active: !isActive })
      .eq('id', appId)
    if (error) throw error
  }

  async function eliminarApp(id) {
    const { error } = await supabase.from('applications').delete().eq('id', id)
    if (error) throw error
  }

  return {
    sidebarCollapsed,
    theme,
    toggleSidebar,
    setTheme,
    cargarApps,
    slugExiste,
    crearApp,
    actualizarApp,
    toggleActiva,
    eliminarApp,
  }
})
