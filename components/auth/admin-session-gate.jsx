'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/services/supabase/browser'
import LoadingState from '@/components/shared/loading-state'
import { withTimeout } from '@/lib/utils/async'

const SESSION_TIMEOUT_MS = 12_000

export default function AdminSessionGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)
  const [validating, setValidating] = useState(true)
  const validationId = useRef(0)

  const validateSession = useCallback(async (currentValidationId) => {
    if (validationId.current !== currentValidationId) return
    setAllowed(false)
    setValidating(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: userData, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        SESSION_TIMEOUT_MS,
        'Não foi possível validar sua sessão. Entre novamente.',
      )
      if (userError || !userData.user) throw new Error('Unauthenticated')

      // A new invited administrator has a valid session but no church yet.
      // Let the setup route create it instead of sending the user back to login.
      if (pathname === '/configurar-igreja') {
        if (validationId.current === currentValidationId) setAllowed(true)
        return
      }

      const { data: church, error: churchError } = await withTimeout(
        supabase
          .from('churches')
          .select('id')
          .eq('admin_id', userData.user.id)
          .maybeSingle(),
        SESSION_TIMEOUT_MS,
        'Não foi possível validar o acesso administrativo. Entre novamente.',
      )

      if (churchError) throw churchError
      if (!church?.id) {
        router.replace('/configurar-igreja')
        return
      }
      if (validationId.current === currentValidationId) setAllowed(true)
    } catch {
      if (validationId.current !== currentValidationId) return
      const redirectTo = pathname?.startsWith('/') ? pathname : '/admin'
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
    } finally {
      if (validationId.current === currentValidationId) setValidating(false)
    }
  }, [pathname, router])

  useEffect(() => {
    const currentValidationId = validationId.current + 1
    validationId.current = currentValidationId
    validateSession(currentValidationId)
    return () => { validationId.current += 1 }
  }, [validateSession])

  if (!allowed) {
    return (
      <LoadingState
        fullScreen
        label={
          validating
            ? 'Verificando acesso...'
            : 'Redirecionando para o login...'
        }
      />
    )
  }
  return children
}
