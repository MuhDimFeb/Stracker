import { useEffect, useMemo, useRef } from 'react'
import { useSession } from "@clerk/react"
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// One stable client for the whole app; it asks Clerk for a fresh token on every request.
export function useSupabase() {
  const { session } = useSession()
  const ref = useRef(session)
  useEffect(() => { ref.current = session }, [session])
  return useMemo(
    () => (url && key ? createClient(url, key, { accessToken: async () => ref.current?.getToken() ?? null }) : null),
    [],
  )
}
