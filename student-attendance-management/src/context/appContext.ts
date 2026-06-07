import { createContext } from 'react'

export type UserRole = 'admin' | 'student' | 'teacher'

export type User = {
  name: string
  email: string
  username: string
  password: string
  role: UserRole
  id: string,
  createdAt: Date,
  updatedAt: Date,
  qrCode: string,
  isActive: boolean,
  isDeleted: boolean,
  isVerified: boolean,
  isSuspended: boolean,
  isLocked: boolean
}

export interface AppContextType {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  getAllUsers: () => User[]
  getUserById: (userId: string) => User | undefined
  updateUser: (userId: string, userToUpdate: User) => void
  addUser: (user: User) => void
}

export const AppContext = createContext<AppContextType | undefined>(undefined)
