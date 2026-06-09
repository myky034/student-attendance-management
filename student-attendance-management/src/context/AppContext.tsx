import { useState, type ReactNode } from "react";
import { AppContext, type User, type UserRole } from "./appContext.ts";
import { initialUsers } from "../data/mockData.ts";

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(initialUsers);  const [user, setUser] = useState<User | null>(null);

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

  const getUserById = (userId: string) => users.find((user) => user.id === userId);

  const addUser = (userToAdd: User) => {
    const newUser: User = {
      ...userToAdd,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (userId: string, userToUpdate: User) => {
    setUsers((prev) => prev.map((user) => user.id === userId ? userToUpdate : user));
  };

  return (
    <AppContext.Provider value={{ user, login, logout, getAllUsers, addUser, getUserById, updateUser }}>
      {children}
    </AppContext.Provider>
  );
}
