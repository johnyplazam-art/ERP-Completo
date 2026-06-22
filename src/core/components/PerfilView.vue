<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'
import { toast } from 'vue-sonner'

const { t, locale } = useI18n()
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
    toast.error(t('profile.nameRequired'))
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
    toast.success(t('profile.updated'))
  } catch (err) {
    toast.error(err.message || t('profile.saveError'))
  } finally {
    isSaving.value = false
  }
}

async function cambiarIdioma(idioma) {
  locale.value = idioma
  try {
    await authStore.guardarPerfil({ idioma })
    toast.success(t('profile.languageChanged', { idioma: t(`language.${idioma}`) }))
  } catch (err) {
    toast.error(err.message || t('profile.languageError'))
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">{{ t('profile.title') }}</h2>

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
          <p class="text-lg font-semibold text-gray-900">{{ [form.nombre, form.apellido].filter(Boolean).join(' ') || t('profile.noName') }}</p>
          <p class="text-sm text-gray-500">{{ email }}</p>
        </div>
      </div>

      <hr class="border-gray-200" />

      <form @submit.prevent="guardar" class="space-y-5">
        <!-- 👤 Información personal -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('profile.personalInfo') }}</h4>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.name') }} *</label>
              <input v-model="form.nombre" type="text" required :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.lastName') }}</label>
              <input v-model="form.apellido" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.phone') }}</label>
              <input v-model="form.phone" type="tel" :disabled="isSaving" placeholder="+54 11 1234-5678"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.avatarUrl') }}</label>
              <input v-model="form.avatar_url" type="url" :disabled="isSaving" placeholder="https://ejemplo.com/avatar.jpg"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>
        </div>

        <hr class="border-gray-200" />

        <!-- 🪪 Documentación -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('profile.documentation') }}</h4>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.documentType') }}</label>
              <select v-model="form.tipo_documento" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50">
                <option value="DNI">DNI</option>
                <option value="CI">{{ t('profile.documentTypeCi') }}</option>
                <option value="Pasaporte">{{ t('profile.documentTypePassport') }}</option>
                <option value="RUT">RUT</option>
                <option value="CUIT">CUIT</option>
                <option value="NIF">NIF</option>
                <option value="Otro">{{ t('profile.documentTypeOther') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.documentNumber') }}</label>
              <input v-model="form.documento" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.birthDate') }}</label>
            <input v-model="form.fecha_nacimiento" type="date" :disabled="isSaving"
              class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
          </div>
        </div>

        <hr class="border-gray-200" />

        <!-- 📍 Dirección -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('profile.address') }}</h4>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.address') }}</label>
            <input v-model="form.direccion" type="text" placeholder="Calle y número" :disabled="isSaving"
              class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.city') }}</label>
              <input v-model="form.ciudad" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.province') }}</label>
              <input v-model="form.provincia" type="text" :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.country') }}</label>
            <select v-model="form.pais" :disabled="isSaving"
              class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50">
              <option value="AR">{{ t('countries.AR') }}</option>
              <option value="UY">{{ t('countries.UY') }}</option>
              <option value="CL">{{ t('countries.CL') }}</option>
              <option value="PY">{{ t('countries.PY') }}</option>
              <option value="BO">{{ t('countries.BO') }}</option>
              <option value="PE">{{ t('countries.PE') }}</option>
              <option value="EC">{{ t('countries.EC') }}</option>
              <option value="CO">{{ t('countries.CO') }}</option>
              <option value="VE">{{ t('countries.VE') }}</option>
              <option value="MX">{{ t('countries.MX') }}</option>
              <option value="ES">{{ t('countries.ES') }}</option>
              <option value="US">{{ t('countries.US') }}</option>
              <option value="Otro">{{ t('countries.Other') }}</option>
            </select>
          </div>
        </div>

        <hr class="border-gray-200" />

        <!-- 💼 Laboral -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('profile.employment') }}</h4>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('profile.position') }}</label>
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
            {{ isSaving ? t('common.saving') : t('common.saveChanges') }}
          </button>
        </div>
      </form>

      <hr class="border-gray-200" />

      <!-- Language -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('language.select') }}</label>
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
