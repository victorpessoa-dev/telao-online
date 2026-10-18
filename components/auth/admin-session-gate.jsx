'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/services/supabase/browser'

export default function AdminSessionGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let active = true

    if (!window.vPlaycastDesktop) {
      router.replace('/')
      return () => { active = false }
    }

    async function validateSession() {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) throw new Error('Unauthenticated')

        const { data: church, error: churchError } = await supabase
          .from('churches')
          .select('id')
          .eq('admin_id', userData.user.id)
          .maybeSingle()

        if (churchError || !church?.id) throw new Error('Admin required')
        if (active) setAllowed(true)
      } catch {
        const redirectTo = pathname?.startsWith('/') ? pathname : '/admin'
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
      }
    }

    validateSession()
    return () => { active = false }
  }, [pathname, router])

  if (!allowed) return null
  return children
}
