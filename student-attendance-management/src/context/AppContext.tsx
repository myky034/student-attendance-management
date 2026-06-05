import { useState, type ReactNode } from "react";
import { AppContext, type User, type UserRole } from "./appContext.ts";

const USER_DB = [
  {
    name: "Admin",
    email: "admin@example.com",
    username: "admin",
    password: "admin",
    role: "admin" as UserRole,
    id: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
    qrCode: "",
    isActive: true,
    isDeleted: false,
    isVerified: false,
    isSuspended: false,
    isLocked: false,
  },
  {
    name: "Student",
    email: "student@example.com",
    username: "student",
    password: "student",
    role: "student" as UserRole,
    id: "2",
    createdAt: new Date(),
    updatedAt: new Date(),
    qrCode: "",
    isActive: true,
    isDeleted: false,
    isVerified: false,
    isSuspended: false,
    isLocked: false,
  },
  {
    name: "Teacher",
    email: "teacher@example.com",
    username: "teacher",
    password: "teacher",
    role: "teacher" as UserRole,
    id: "3",
    createdAt: new Date(),
    updatedAt: new Date(),
    qrCode: "",
    isActive: true,
    isDeleted: false,
    isVerified: false,
    isSuspended: false,
    isLocked: false,
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(USER_DB);
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, password: string): boolean => {
    const foundUser = users.find(
      (u) => u.username === username && u.password === password,
    );
    if (foundUser) {
      setUser({
        name: foundUser.name,
        email: foundUser.email,
        username: foundUser.username,
        password: foundUser.password,
        role: foundUser.role as UserRole,
        id: foundUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        qrCode: "",
        isActive: true,
        isDeleted: false,
        isVerified: false,
        isSuspended: false,
        isLocked: false,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const getAllUsers = () => users;

  const addUser = (userToAdd: User) => {
    const newUser: User = {
      ...userToAdd,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  return (
    <AppContext.Provider value={{ user, login, logout, getAllUsers, addUser }}>
      {children}
    </AppContext.Provider>
  );
}
