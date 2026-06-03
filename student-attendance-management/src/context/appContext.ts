import { createContext } from 'react'

export type UserRole = 'admin' | 'student' | 'teacher'

export type User = {
  name: string
  email: string
  username: string
  password: string
  role: UserRole
  id: string
}

export interface AppContextType {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  getAllUsers: () => User[]
}

export const AppContext = createContext<AppContextType | undefined>(undefined)
