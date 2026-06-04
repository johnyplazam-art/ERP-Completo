import { ref } from 'vue'

/**
 * Composable for handling Zod form validation
 * @param {Object} schema - Zod schema for validation
 * @returns {Object} Form handling utilities
 */
export const useZodForm = (schema) => {
  // Form state
  const form = ref({})
  const errors = ref({})
  const isValidating = ref(false)

  // Initialize form with empty values based on schema shape
  const initializeForm = () => {
    // For now, we'll initialize with empty object
    // In a more advanced version, we could extract default values from schema
    form.value = {}
  }

  // Reset form to initial state
  const resetForm = () => {
    form.value = {}
    errors.value = {}
  }

  // Handle form submission with validation
  const handleSubmit = async (callback) => {
    return async (event) => {
      if (event) {
        event.preventDefault()
      }

      isValidating.value = true
      errors.value = {}

      try {
        // Validate form data against schema
        const result = schema.safeParse(form.value)

        if (result.success) {
          // Validation passed, call callback with validated data
          await callback(result.data)
        } else {
          // Validation failed, set errors
          result.error.errors.forEach((error) => {
            const path = error.path.join('.')
            if (!errors.value[path]) {
              errors.value[path] = []
            }
            errors.value[path].push(error.message)
          })
        }
      } catch (err) {
        console.error('Validation error:', err)
        errors.value._form = ['An unexpected error occurred during validation']
      } finally {
        isValidating.value = false
      }
    }
  }

  // Validate form on demand
  const validate = () => {
    isValidating.value = true
    errors.value = {}

    try {
      const result = schema.safeParse(form.value)
      if (!result.success) {
        result.error.errors.forEach((error) => {
          const path = error.path.join('.')
          if (!errors.value[path]) {
            errors.value[path] = []
          }
          errors.value[path].push(error.message)
        })
      }
      return result.success
    } catch (err) {
      console.error('Validation error:', err)
      errors.value._form = ['An unexpected error occurred during validation']
      return false
    } finally {
      isValidating.value = false
    }
  }

  // Check if field has error
  const hasError = (field) => {
    return !!errors.value[field]
  }

  // Get error message for field
  const getError = (field) => {
    const fieldErrors = errors.value[field]
    if (fieldErrors && Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      return fieldErrors[0]
    }
    return null
  }

  // Initialize form
  initializeForm()

  return {
    form,
    errors,
    isValidating,
    handleSubmit,
    resetForm,
    validate,
    hasError,
    getError
  }
}

export default useZodForm