<script setup>
import { ref, computed } from 'vue'
import { getSelectValue } from '@/core/composables/useSelectValue'

const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  options: { type: Array, default: () => [] },
  optionLabel: { type: String, default: 'nombre' },
  optionValue: { type: String, default: 'id' },
  formatOption: { type: Function, default: null },
  placeholder: { type: String, default: 'Seleccionar...' },
  createLabel: { type: String, default: 'Nuevo' },
  selectClass: { type: String, default: '' },
  fields: { type: Array, required: true },
  createFn: { type: Function, required: true },
})

const emit = defineEmits(['update:modelValue', 'create'])

const showModal = ref(false)
const isCreating = ref(false)
const createError = ref('')
const formData = ref({})

const localItems = ref([])

const mergedOptions = computed(() => {
  const all = [...(props.options || [])]
  for (const item of localItems.value) {
    const key = item[props.optionValue]
    if (!all.some(o => o[props.optionValue] === key)) {
      all.push(item)
    }
  }
  return all
})

function displayOption(opt) {
  if (props.formatOption) return props.formatOption(opt)
  return opt[props.optionLabel]
}

function resetForm() {
  formData.value = {}
  createError.value = ''
}

async function handleCreate() {
  isCreating.value = true
  createError.value = ''
  try {
    const data = {}
    for (const field of props.fields) {
      if (field.key in formData.value) {
        data[field.key] = formData.value[field.key]
      }
    }
    const result = await props.createFn(data)
    localItems.value.push(result)
    emit('update:modelValue', result[props.optionValue])
    emit('create', result)
    showModal.value = false
    resetForm()
  } catch (err) {
    createError.value = err.message || 'Error al crear'
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div class="flex items-start gap-2">
    <div class="flex-1">
      <select
        :value="modelValue"
        @change="emit('update:modelValue', getSelectValue($event))"
        :class="['touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500', selectClass]"
      >
        <option :value="null" disabled>{{ placeholder }}</option>
        <option v-for="opt in mergedOptions" :key="opt[optionValue]" :value="opt[optionValue]">
          {{ displayOption(opt) }}
        </option>
      </select>
    </div>
    <button
      type="button"
      @click="showModal = true"
      class="mt-0.5 inline-flex items-center px-3 py-2 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors flex-shrink-0"
      :title="createLabel"
    >
      <i class="pi pi-plus"></i>
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4" @click.stop>
        <h3 class="text-lg font-semibold text-gray-900">{{ createLabel }}</h3>

        <div v-for="field in fields" :key="field.key" class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">
            {{ field.label }}<span v-if="field.required" class="text-red-500">*</span>
          </label>

          <input
            v-if="field.type === 'text' || field.type === 'number'"
            v-model="formData[field.key]"
            :type="field.type"
            :required="field.required"
            :min="field.min"
            :step="field.step"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          />

          <select
            v-if="field.type === 'select'"
            v-model="formData[field.key]"
            :required="field.required"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          >
            <option :value="null" disabled>Seleccionar...</option>
            <option
              v-for="opt in (field.options || [])"
              :key="opt[field.optionValue || 'id']"
              :value="opt[field.optionValue || 'id']"
            >
              {{ field.formatOption ? field.formatOption(opt) : opt[field.optionLabel || 'nombre'] }}
            </option>
          </select>

          <label v-if="field.type === 'checkbox'" class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="formData[field.key]" type="checkbox" class="rounded border-gray-300" />
            {{ field.label }}
          </label>
        </div>

        <div v-if="createError" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">
          {{ createError }}
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="showModal = false"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleCreate"
            :disabled="isCreating"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <i v-if="isCreating" class="pi pi-spin pi-spinner mr-1"></i>
            {{ isCreating ? 'Creando...' : createLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
