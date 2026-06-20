<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '@/core/supabase'
import { useAuthStore } from '@/core/store/auth'
import { toast } from 'vue-sonner'
import { formatCurrency, getMonedas } from '@/core/composables/useCurrency'

const authStore = useAuthStore()

const empresas = ref([])
const industrias = ref([])
const isLoading = ref(true)
const searchQuery = ref('')

// ─── Modal ────────────────────────────────────────────
const showModal = ref(false)
const modalEditando = ref(false)
const isSaving = ref(false)
const modalError = ref('')
const formData = ref({
  nombre: '', slug: '', industria_principal: null, activa: true, moneda: 'USD',
  razon_social: '', tipo_documento: 'CUIT', documento: '',
  direccion: '', ciudad: '', provincia: '', pais: 'AR', codigo_postal: '',
  telefono: '', email: '', website: '', logo_url: '',
})

// ─── Delete ───────────────────────────────────────────
const showDeleteConfirm = ref(false)
const empresaAEliminar = ref(null)
const isDeleting = ref(false)

// ─── Computed ─────────────────────────────────────────
const empresasFiltradas = computed(() => {
  if (!searchQuery.value) return empresas.value
  const q = searchQuery.value.toLowerCase()
  return empresas.value.filter(e =>
    e.nombre.toLowerCase().includes(q) ||
    (e.industria_principal?.nombre || '').toLowerCase().includes(q) ||
    (e.slug || '').toLowerCase().includes(q)
  )
})

const totalUsuarios = computed(() =>
  empresas.value.reduce((acc, e) => acc + (e.usuarios_count || 0), 0)
)

// ─── Helpers ──────────────────────────────────────────
function generarSlug(texto) {
  return texto.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function autoSlug(nuevoNombre) {
  if (!formData.value.slug || formData.value.slug === generarSlug(formData.value._slugOriginal || '')) {
    formData.value.slug = generarSlug(nuevoNombre)
  }
}

// ─── Data Loading ─────────────────────────────────────
async function cargarEmpresas() {
  isLoading.value = true
  try {
    const [empresasRes, industriasRes] = await Promise.all([
      supabase
        .from('empresas')
        .select('*, industria_principal:industrias(id, nombre, slug)')
        .order('created_at', { ascending: false }),
      supabase.from('industrias').select('*').order('nombre'),
    ])
    industrias.value = industriasRes.data ?? []

    const empresasData = empresasRes.data ?? []
    if (!empresasData.length) { empresas.value = []; return }

    const ids = empresasData.map(e => e.id)

    const [usuariosRes, suscripcionesRes] = await Promise.all([
      supabase.from('empresa_usuarios').select('empresa_id').in('empresa_id', ids),
      supabase.from('suscripciones')
        .select('*, plan:planes!inner(nombre, slug, precio, periodo)')
        .in('empresa_id', ids)
        .order('created_at', { ascending: false }),
    ])

    const usuariosMap = {}
    usuariosRes.data?.forEach(u => {
      usuariosMap[u.empresa_id] = (usuariosMap[u.empresa_id] || 0) + 1
    })

    const suscripcionMap = {}
    suscripcionesRes.data?.forEach(s => {
      if (!suscripcionMap[s.empresa_id]) suscripcionMap[s.empresa_id] = s
    })

    empresas.value = empresasData.map(e => ({
      ...e,
      usuarios_count: usuariosMap[e.id] || 0,
      suscripcion: suscripcionMap[e.id] || null,
    }))
  } catch (err) {
    console.error('[admin-empresas] Error:', err)
    toast.error('Error al cargar empresas')
  } finally {
    isLoading.value = false
  }
}

// ─── Navigation ───────────────────────────────────────
function suscripcionBadge(estado) {
  switch (estado) {
    case 'activa': return 'bg-green-100 text-green-700'
    case 'expirada': return 'bg-red-100 text-red-700'
    case 'cancelada': return 'bg-yellow-100 text-yellow-700'
    case 'pendiente': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function irAEmpresa(empresa) {
  authStore.seleccionarEmpresa(empresa)
}

// ─── CRUD: Create / Edit ──────────────────────────────
function abrirModalCrear() {
  modalEditando.value = false
  formData.value = {
    nombre: '', slug: '', industria_principal: null, activa: true, moneda: 'USD',
    razon_social: '', tipo_documento: 'CUIT', documento: '',
    direccion: '', ciudad: '', provincia: '', pais: 'AR', codigo_postal: '',
    telefono: '', email: '', website: '', logo_url: '',
  }
  modalError.value = ''
  showModal.value = true
}

function abrirModalEditar(empresa) {
  modalEditando.value = true
  formData.value = {
    _id: empresa.id,
    nombre: empresa.nombre,
    slug: empresa.slug,
    industria_principal: empresa.industria_principal?.id ?? null,
    activa: empresa.activa !== false,
    moneda: empresa.config?.moneda || 'USD',
    razon_social: empresa.razon_social || '',
    tipo_documento: empresa.tipo_documento || 'CUIT',
    documento: empresa.documento || '',
    direccion: empresa.direccion || '',
    ciudad: empresa.ciudad || '',
    provincia: empresa.provincia || '',
    pais: empresa.pais || 'AR',
    codigo_postal: empresa.codigo_postal || '',
    telefono: empresa.telefono || '',
    email: empresa.email || '',
    website: empresa.website || '',
    logo_url: empresa.logo_url || '',
  }
  formData.value._slugOriginal = empresa.slug
  modalError.value = ''
  showModal.value = true
}

function cerrarModal() {
  showModal.value = false
  modalError.value = ''
}

async function guardarEmpresa() {
  if (!formData.value.nombre.trim()) {
    modalError.value = 'El nombre es obligatorio'
    return
  }
  if (!formData.value.slug.trim()) {
    modalError.value = 'El slug es obligatorio'
    return
  }

  isSaving.value = true
  modalError.value = ''
  try {
    const payload = {
      nombre: formData.value.nombre.trim(),
      slug: formData.value.slug.trim(),
      industria_principal: formData.value.industria_principal || null,
      activa: formData.value.activa,
      config: { moneda: formData.value.moneda },
      razon_social: formData.value.razon_social.trim(),
      tipo_documento: formData.value.tipo_documento,
      documento: formData.value.documento.trim(),
      direccion: formData.value.direccion.trim(),
      ciudad: formData.value.ciudad.trim(),
      provincia: formData.value.provincia.trim(),
      pais: formData.value.pais,
      codigo_postal: formData.value.codigo_postal.trim(),
      telefono: formData.value.telefono.trim(),
      email: formData.value.email.trim(),
      website: formData.value.website.trim(),
      logo_url: formData.value.logo_url.trim(),
    }

    if (modalEditando.value) {
      const { data: empresaActual } = await supabase
        .from('empresas')
        .select('config')
        .eq('id', formData.value._id)
        .single()
      payload.config = { ...(empresaActual?.config || {}), moneda: formData.value.moneda }

      const { error } = await supabase
        .from('empresas')
        .update(payload)
        .eq('id', formData.value._id)
      if (error) throw error
      toast.success('Empresa actualizada')
    } else {
      const { error } = await supabase
        .from('empresas')
        .insert(payload)
      if (error) throw error
      toast.success('Empresa creada')
    }
    cerrarModal()
    await cargarEmpresas()
  } catch (err) {
    modalError.value = err.message || 'Error al guardar'
  } finally {
    isSaving.value = false
  }
}

// ─── CRUD: Toggle Active ──────────────────────────────
async function toggleActiva(empresa) {
  const nueva = empresa.activa !== false ? false : true
  try {
    const { error } = await supabase
      .from('empresas')
      .update({ activa: nueva })
      .eq('id', empresa.id)
    if (error) throw error
    empresa.activa = nueva
    toast.success(nueva ? 'Empresa activada' : 'Empresa desactivada')
  } catch (err) {
    toast.error(err.message || 'Error al cambiar estado')
  }
}

// ─── CRUD: Delete ─────────────────────────────────────
function confirmarEliminar(empresa) {
  empresaAEliminar.value = empresa
  showDeleteConfirm.value = true
}

async function eliminarEmpresa() {
  if (!empresaAEliminar.value) return
  isDeleting.value = true
  try {
    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', empresaAEliminar.value.id)
    if (error) throw error
    toast.success('Empresa eliminada')
    showDeleteConfirm.value = false
    empresaAEliminar.value = null
    await cargarEmpresas()
  } catch (err) {
    toast.error(err.message || 'Error al eliminar')
  } finally {
    isDeleting.value = false
  }
}

// ─── Init ─────────────────────────────────────────────
cargarEmpresas()
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Todas las Empresas</h2>
      <div class="flex items-center gap-3">
        <div class="relative">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar empresa..."
            class="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500 w-64"
          />
        </div>
        <button
          @click="abrirModalCrear"
          class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
        >
          <i class="pi pi-plus mr-2"></i>Nueva Empresa
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Total</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ empresas.length }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Activas</p>
        <p class="text-2xl font-bold text-green-600 mt-1">{{ empresas.filter(e => e.activa !== false).length }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Usuarios totales</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ totalUsuarios }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando empresas...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!empresasFiltradas.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-building text-4xl mb-3"></i>
      <p>No se encontraron empresas</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="emp in empresasFiltradas"
        :key="emp.id"
        class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
      >
        <!-- Top: clickable for navigation -->
        <div class="cursor-pointer" @click="irAEmpresa(emp)">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-gray-900 text-base truncate">{{ emp.nombre }}</h3>
            <span class="text-xs text-gray-400 ml-2 shrink-0">#{{ emp.id }}</span>
          </div>

          <div class="space-y-1 text-sm text-gray-500 mb-3">
            <div v-if="emp.industria_principal" class="flex items-center gap-2">
              <i class="pi pi-tag text-xs"></i>
              <span>{{ emp.industria_principal.nombre }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-hashtag text-xs"></i>
              <span class="text-xs font-mono text-gray-400">{{ emp.slug }}</span>
            </div>
            <div v-if="emp.documento" class="flex items-center gap-2">
              <i class="pi pi-id-card text-xs"></i>
              <span>{{ emp.tipo_documento || 'CUIT' }}: {{ emp.documento }}</span>
            </div>
            <div v-if="emp.pais" class="flex items-center gap-2">
              <i class="pi pi-globe text-xs"></i>
              <span>{{ emp.pais }}{{ emp.ciudad ? ' · ' + emp.ciudad : '' }}</span>
            </div>
          </div>

          <!-- Metrics -->
          <div class="space-y-2 mb-3">
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <i class="pi pi-users text-xs text-gray-400"></i>
              <span>{{ emp.usuarios_count }} {{ emp.usuarios_count === 1 ? 'usuario' : 'usuarios' }}</span>
            </div>
            <div v-if="emp.suscripcion" class="flex items-center gap-2 text-sm text-gray-600">
              <i class="pi pi-credit-card text-xs text-gray-400"></i>
              <span class="font-medium text-gray-700">{{ emp.suscripcion.plan?.nombre }}</span>
              <span
                class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                :class="suscripcionBadge(emp.suscripcion.estado)"
              >{{ emp.suscripcion.estado }}</span>
              <span v-if="emp.suscripcion.fecha_fin" class="text-xs text-gray-400">
                · hasta {{ new Date(emp.suscripcion.fecha_fin).toLocaleDateString('es-AR') }}
              </span>
            </div>
            <div v-else class="flex items-center gap-2 text-sm text-gray-400">
              <i class="pi pi-credit-card text-xs"></i>
              <span>Sin suscripción</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            @click="toggleActiva(emp)"
            class="text-xs font-medium"
            :class="emp.activa !== false ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'"
          >
            <i :class="emp.activa !== false ? 'pi pi-check-circle' : 'pi pi-circle'" class="mr-1"></i>
            {{ emp.activa !== false ? 'Activa' : 'Inactiva' }}
          </button>
          <div class="flex items-center gap-2">
            <button
              @click="abrirModalEditar(emp)"
              class="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <i class="pi pi-pencil mr-1"></i>Editar
            </button>
            <button
              @click="confirmarEliminar(emp)"
              class="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              <i class="pi pi-trash mr-1"></i>Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="cerrarModal"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4" @click.stop>
          <h3 class="text-lg font-semibold text-gray-900">
            {{ modalEditando ? 'Editar Empresa' : 'Nueva Empresa' }}
          </h3>

          <!-- 📋 Información básica -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información básica</h4>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Nombre *</label>
                <input v-model="formData.nombre" @input="autoSlug(formData.nombre)" type="text" required
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Slug *</label>
                <input v-model="formData.slug" type="text" required
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Industria principal</label>
                <select v-model="formData.industria_principal"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm">
                  <option :value="null">Sin industria</option>
                  <option v-for="ind in industrias" :key="ind.id" :value="ind.id">{{ ind.nombre }}</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Moneda</label>
                <select v-model="formData.moneda"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm">
                  <option v-for="m in getMonedas()" :key="m.code" :value="m.code">{{ m.label }}</option>
                </select>
              </div>
            </div>

            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="formData.activa" type="checkbox" class="rounded border-gray-300" />
              Empresa activa
            </label>
          </div>

          <hr class="border-gray-200" />

          <!-- 💼 Información fiscal -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información fiscal</h4>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Razón social</label>
              <input v-model="formData.razon_social" type="text" placeholder="Razón social (si difiere del nombre)"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Tipo documento</label>
                <select v-model="formData.tipo_documento"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm">
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                  <option value="RUT">RUT</option>
                  <option value="NIT">NIT</option>
                  <option value="RFC">RFC</option>
                  <option value="RIF">RIF</option>
                  <option value="DNI">DNI</option>
                  <option value="NIF">NIF</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Número documento</label>
                <input v-model="formData.documento" type="text" placeholder="XX-XXXXXXXX-X"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <hr class="border-gray-200" />

          <!-- 📍 Dirección -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dirección</h4>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Dirección</label>
              <input v-model="formData.direccion" type="text" placeholder="Calle y número"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Ciudad</label>
                <input v-model="formData.ciudad" type="text"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Provincia</label>
                <input v-model="formData.provincia" type="text"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">País</label>
                <select v-model="formData.pais"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm">
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
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Código postal</label>
                <input v-model="formData.codigo_postal" type="text"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <hr class="border-gray-200" />

          <!-- 📞 Contacto -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contacto</h4>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Teléfono</label>
                <input v-model="formData.telefono" type="tel" placeholder="+54 11 1234-5678"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input v-model="formData.email" type="email" placeholder="empresa@ejemplo.com"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Sitio web</label>
              <input v-model="formData.website" type="url" placeholder="https://ejemplo.com"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
            </div>
          </div>

          <hr class="border-gray-200" />

          <!-- 🖼️ Branding -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Branding</h4>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">Logo URL</label>
              <input v-model="formData.logo_url" type="url" placeholder="https://ejemplo.com/logo.png"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              <p class="text-xs text-gray-400">URL pública del logo de la empresa</p>
            </div>
          </div>

          <div v-if="modalError" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {{ modalError }}
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="cerrarModal"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >Cancelar</button>
            <button
              type="button"
              @click="guardarEmpresa"
              :disabled="isSaving"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
            >
              <i v-if="isSaving" class="pi pi-spin pi-spinner mr-1"></i>
              {{ modalEditando ? 'Guardar' : 'Crear' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4" @click.stop>
          <h3 class="text-lg font-semibold text-gray-900">Eliminar empresa</h3>
          <p class="text-sm text-gray-600">
            ¿Estás seguro de eliminar <strong>{{ empresaAEliminar?.nombre }}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="showDeleteConfirm = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >Cancelar</button>
            <button
              @click="eliminarEmpresa"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              <i v-if="isDeleting" class="pi pi-spin pi-spinner mr-1"></i>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
