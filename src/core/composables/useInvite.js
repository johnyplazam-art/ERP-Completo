import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'

export function buildInviteUrl(slug) {
  const origin = window.location.origin
  const base = import.meta.env.BASE_URL
  return `${origin}${base}#/login?invitacion=${slug}`
}

export function useInvite() {
  const { t } = useI18n()

  async function copiarInvitacion(empresaSlug) {
    const link = buildInviteUrl(empresaSlug)
    try {
      await navigator.clipboard.writeText(link)
      toast.success(t('users.linkCopied'))
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return { copiarInvitacion }
}
