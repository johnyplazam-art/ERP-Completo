<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '@supabase/supabase-js'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const supabase = useSupabaseClient()

const industries = ref([])
const loading = ref(true)
const error = ref(null)

// Icons mapping (using PrimeIcons as seen in LoginView)
const industryIcons = {
  panaderia: 'pi pi-shopping-basket',
  restaurant: 'pi pi-utensils',
  pos: 'pi pi-credit-card',
  medico: 'pi pi-heart',
  academico: 'pi pi-book',
  admin: 'pi pi-briefcase'
}

const industryDescriptions = {
  panaderia: 'Gestión de producción, ventas y stock para panaderías.',
  restaurant: 'Control de mesas, comandas y cocina.',
  pos: 'Punto de venta ágil para comercios minoristas.',
  medico: 'Gestión de pacientes, turnos y consultorio.',
  academico: 'Control de alumnos, profes y cursadas.',
  admin: 'Administración centralizada y contabilidad.'
}

async function fetchIndustries() {
  loading.value = true
  error.value = null
  try {
    const { data, error: fetchError } = await supabase
      .from('industrias')
      .select('id, nombre, slug, icono, descripcion, activa')
      .eq('activa', true)

    if (fetchError) throw fetchError
    industries.value = data || []
  } catch (err) {
    console.error('Error fetching industries:', err)
    error.value = 'No se pudieron cargar las industrias.'
  } finally {
    loading.value = false
  }
}

function selectIndustry(slug) {
  emit('update:modelValue', slug)
}
</script>

<template>
  <div class="industry-selector">
    <!-- Loading state -->
    <div v-if="loading" class="grid grid-cols-2 gap-3">
      <div v-for="i in 4" :key="i" class="h-24 bg-gray-100 animate-pulse rounded-xl"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-4 text-center text-red-600 bg-red-50 rounded-lg text-sm">
      {{ error }}
    </div>

    <!-- Empty state -->
    <div v-else-if="industries.length === 0" class="p-4 text-center text-gray-500 bg-gray-50 rounded-lg text-sm">
      No hay industrias disponibles.
    </div>

    <!-- Grid of industries -->
    <div v-else class="grid grid-cols-2 gap-3">
      <button
        v-for="ind in industries"
        :key="ind.id"
        type="button"
        @click="selectIndustry(ind.slug)"
        class="flex flex-col items-center justify-center p-4 text-center transition-all border-2 rounded-xl group"
        :class="[
          modelValue === ind.slug 
            ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200' 
            : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        ]"
      >
        <div 
          class="text-2xl mb-2 transition-transform group-hover:scale-110"
          :class="modelValue === ind.slug ? 'text-primary-600' : 'text-gray-400'"
        >
          <i :class="ind.icono || industryIcons[ind.slug] || 'pi pi-building'"></i>
        </div>
        <span class="text-xs font-bold leading-tight">{{ ind.nombre }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.industry-selector {
  width: 100%;
}
</style>
