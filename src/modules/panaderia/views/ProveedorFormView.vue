<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { proveedorSchema } from '../validations/index'
import {
  useProveedoresQuery,
  useCreateProveedorMutation,
  useUpdateProveedorMutation,
} from '../composables/queries'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const { data: proveedores } = useProveedoresQuery()
const { mutateAsync: crearProveedor } = useCreateProveedorMutation()
const { mutateAsync: actualizarProveedor } = useUpdateProveedorMutation()

const { handleSubmit, values, resetForm, errors, setFieldValue } = useForm({
  validationSchema: toTypedSchema(proveedorSchema),
  initialValues: {
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
  },
})

// Cargar datos existentes en modo edición
if (isEdit.value) {
  const proveedor = computed(() =>
    proveedores.value?.find(p => p.id === Number(route.params.id))
  )

  watchEffect(() => {
    const data = proveedor.value
    if (data) {
      resetForm({
        values: {
          nombre: data.nombre || '',
          contacto: data.contacto || '',
          telefono: data.telefono || '',
          email: data.email || '',
          direccion: data.direccion || '',
        },
      })
    }
  })
}

const isSaving = ref(false)

const onSubmit = handleSubmit(async (formValues) => {
  isSaving.value = true
  try {
    if (isEdit.value) {
      await actualizarProveedor({ id: Number(route.params.id), values: formValues })
      toast.success('Proveedor actualizado exitosamente')
    } else {
      await crearProveedor(formValues)
      toast.success('Proveedor creado exitosamente')
    }
    router.push('/panaderia/proveedores')
  } catch (err) {
    toast.error(err.message || 'Error al guardar proveedor')
  } finally {
    isSaving.value = false
  }
})
</script>

<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/panaderia/proveedores" class="text-gray-400 hover:text-gray-600 mr-3">
        <i class="pi pi-arrow-left text-xl"></i>
      </router-link>
      <h2 class="text-2xl font-bold text-gray-900">
        {{ isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
      </h2>
    </div>

    <form @submit="onSubmit" class="max-w-3xl space-y-6">
      <!-- Basic Info -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Información del Proveedor</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              :value="values.nombre"
              @input="setFieldValue('nombre', $event.target.value)"
              type="text"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Distribuidora SA"
            />
            <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">{{ errors.nombre }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
            <input
              :value="values.contacto"
              @input="setFieldValue('contacto', $event.target.value)"
              type="text"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Juan Pérez"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              :value="values.telefono"
              @input="setFieldValue('telefono', $event.target.value)"
              type="text"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="+54 11 5555-1234"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              :value="values.email"
              @input="setFieldValue('email', $event.target.value)"
              type="email"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="contacto@distribuidora.com"
            />
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              :value="values.direccion"
              @input="setFieldValue('direccion', $event.target.value)"
              type="text"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            placeholder="Av. Siempre Viva 123"
          />
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <router-link
          to="/panaderia/proveedores"
          class="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </router-link>
        <button
          type="submit"
          :disabled="isSaving"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <i v-if="isSaving" class="pi pi-spin pi-spinner mr-2"></i>
          {{ isSaving ? 'Guardando...' : 'Guardar Proveedor' }}
        </button>
      </div>
    </form>
  </div>
</template>
