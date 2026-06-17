<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const authStore = useAuthStore()

const isSaving = ref(false)

const form = ref({
  nombre: '',
  avatar_url: '',
  phone: '',
})

watch(() => authStore.perfil, (p) => {
  if (p) {
    form.value.nombre = p.nombre || ''
    form.value.avatar_url = p.avatar_url || ''
    form.value.phone = p.phone || ''
  }
}, { immediate: true })

const avatarPreviewError = ref(false)

const avatarUrl = computed(() => {
  if (form.value.avatar_url && !avatarPreviewError.value) return form.value.avatar_url
  return null
})

const email = computed(() => authStore.userEmail || '—')
const idiomaActual = computed(() => authStore.perfil?.idioma || 'es')

async function guardar() {
  if (!form.value.nombre.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }

  isSaving.value = true
  try {
    await authStore.guardarPerfil({
      nombre: form.value.nombre.trim(),
      avatar_url: form.value.avatar_url.trim() || null,
      phone: form.value.phone.trim() || null,
    })
    toast.success('Perfil actualizado exitosamente')
  } catch (err) {
    toast.error(err.message || 'Error al guardar perfil')
  } finally {
    isSaving.value = false
  }
}

async function cambiarIdioma(idioma) {
  try {
    await authStore.guardarPerfil({ idioma })
    toast.success('Idioma cambiado a ' + (idioma === 'es' ? 'español' : 'inglés'))
  } catch (err) {
    toast.error(err.message || 'Error al cambiar idioma')
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h2>

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <!-- Avatar preview -->
      <div class="flex items-center gap-5">
        <div
          class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden"
          :class="avatarUrl ? '' : 'bg-primary-100 text-primary-700'"
        >
          <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="w-full h-full object-cover rounded-full"
            @error="avatarPreviewError = true" />
          <span v-else>{{ (form.nombre || authStore.perfil?.nombre || '?').charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <p class="text-lg font-semibold text-gray-900">{{ form.nombre || 'Sin nombre' }}</p>
          <p class="text-sm text-gray-500">{{ email }}</p>
        </div>
      </div>

      <hr class="border-gray-200" />

      <form @submit.prevent="guardar" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            v-model="form.nombre"
            type="text"
            required
            :disabled="isSaving"
            class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URL de Avatar</label>
          <input
            v-model="form.avatar_url"
            type="url"
            :disabled="isSaving"
            placeholder="https://ejemplo.com/avatar.jpg"
            class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
          <p class="mt-1 text-xs text-gray-400">Pegá una URL de imagen para tu avatar (opcional)</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            v-model="form.phone"
            type="tel"
            :disabled="isSaving"
            placeholder="+54 11 1234-5678"
            class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
        </div>

        <div class="pt-2">
          <button
            type="submit"
            :disabled="isSaving"
            class="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <i :class="isSaving ? 'pi pi-spin pi-spinner mr-2' : 'pi pi-check mr-2'"></i>
            {{ isSaving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>

      <hr class="border-gray-200" />

      <!-- Language -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Idioma / Language</label>
        <div class="flex gap-3">
          <button
            @click="cambiarIdioma('es')"
            class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
            :class="idiomaActual === 'es'
              ? 'bg-primary-50 border-primary-500 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'"
          >
            🇪🇸 Español
          </button>
          <button
            @click="cambiarIdioma('en')"
            class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
            :class="idiomaActual === 'en'
              ? 'bg-primary-50 border-primary-500 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'"
          >
            🇬🇧 English
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
