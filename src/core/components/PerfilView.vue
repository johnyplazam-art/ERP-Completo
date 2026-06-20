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
  apellido: '',
  avatar_url: '',
  phone: '',
  tipo_documento: 'DNI',
  documento: '',
  fecha_nacimiento: '',
  direccion: '',
  ciudad: '',
  provincia: '',
  pais: 'AR',
  puesto: '',
})

watch(() => authStore.perfil, (p) => {
  if (p) {
    form.value.nombre = p.nombre || ''
    form.value.apellido = p.apellido || ''
    form.value.avatar_url = p.avatar_url || ''
    form.value.phone = p.phone || ''
    form.value.tipo_documento = p.tipo_documento || 'DNI'
    form.value.documento = p.documento || ''
    form.value.fecha_nacimiento = p.fecha_nacimiento || ''
    form.value.direccion = p.direccion || ''
    form.value.ciudad = p.ciudad || ''
    form.value.provincia = p.provincia || ''
    form.value.pais = p.pais || 'AR'
    form.value.puesto = p.puesto || ''
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
      apellido: form.value.apellido.trim(),
      avatar_url: form.value.avatar_url.trim() || null,
      phone: form.value.phone.trim() || null,
      tipo_documento: form.value.tipo_documento,
      documento: form.value.documento.trim(),
      fecha_nacimiento: form.value.fecha_nacimiento || null,
      direccion: form.value.direccion.trim(),
      ciudad: form.value.ciudad.trim(),
      provincia: form.value.provincia.trim(),
      pais: form.value.pais,
      puesto: form.value.puesto.trim(),
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
          <p class="text-lg font-semibold text-gray-900">{{ [form.nombre, form.apellido].filter(Boolean).join(' ') || 'Sin nombre' }}</p>
          <p class="text-sm text-gray-500">{{ email }}</p>
        </div>
      </div>

      <hr class="border-gray-200" />

      <form @submit.prevent="guardar" class="space-y-5">
        <!-- 👤 Información personal -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información personal</h4>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input v-model="form.nombre" type="text" required :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input v-model="form.apellido" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input v-model="form.phone" type="tel" :disabled="isSaving" placeholder="+54 11 1234-5678"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">URL de Avatar</label>
              <input v-model="form.avatar_url" type="url" :disabled="isSaving" placeholder="https://ejemplo.com/avatar.jpg"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>
        </div>

        <hr class="border-gray-200" />

        <!-- 🪪 Documentación -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documentación</h4>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
              <select v-model="form.tipo_documento" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50">
                <option value="DNI">DNI</option>
                <option value="CI">Cédula de Identidad</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="RUT">RUT</option>
                <option value="CUIT">CUIT</option>
                <option value="NIF">NIF</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Número documento</label>
              <input v-model="form.documento" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input v-model="form.fecha_nacimiento" type="date" :disabled="isSaving"
              class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
          </div>
        </div>

        <hr class="border-gray-200" />

        <!-- 📍 Dirección -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dirección</h4>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input v-model="form.direccion" type="text" placeholder="Calle y número" :disabled="isSaving"
              class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input v-model="form.ciudad" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <input v-model="form.provincia" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">País</label>
            <select v-model="form.pais" :disabled="isSaving"
              class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50">
              <option value="AR">Argentina</option>
              <option value="UY">Uruguay</option>
              <option value="CL">Chile</option>
              <option value="PY">Paraguay</option>
              <option value="BO">Bolivia</option>
              <option value="PE">Perú</option>
              <option value="EC">Ecuador</option>
              <option value="CO">Colombia</option>
              <option value="VE">Venezuela</option>
              <option value="MX">México</option>
              <option value="ES">España</option>
              <option value="US">Estados Unidos</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <hr class="border-gray-200" />

        <!-- 💼 Laboral -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información laboral</h4>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Puesto / Cargo</label>
            <input v-model="form.puesto" type="text" placeholder="Ej: Panadero, Administrador, Vendedor" :disabled="isSaving"
              class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
          </div>
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
