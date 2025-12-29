import { useCallback } from 'react'
import { useObservable } from "dexie-react-hooks";
import { db } from '../models/db'


export function useCloudUser() {
  const user = useObservable(db.cloud.currentUser); 

  const login = useCallback(async () => {
    await db.cloud.login?.()
  }, [])

  const logout = useCallback(async () => {
    await db.cloud.logout?.()
  }, [])

  return {
    user,
    login,
    logout,
  }
}
