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
  },
  {
    name: "Student",
    email: "student@example.com",
    username: "student",
    password: "student",
    role: "student" as UserRole,
    id: "2",
  },
  {
    name: "Teacher",
    email: "teacher@example.com",
    username: "teacher",
    password: "teacher",
    role: "teacher" as UserRole,
    id: "3",
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, password: string): boolean => {
    const foundUser = USER_DB.find(
      (user) => user.username === username && user.password === password,
    );
    if (foundUser) {
      setUser({
        name: foundUser.name,
        email: foundUser.email,
        username: foundUser.username,
        password: foundUser.password,
        role: foundUser.role as UserRole,
        id: foundUser.id,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const getAllUsers = () => {
    return USER_DB.map(({ name, email, username, password, role, id }) => ({
      name,
      email,
      username,
      password,
      role: role as UserRole,
      id,
    }));
  };

  return (
    <AppContext.Provider value={{ user, login, logout, getAllUsers }}>
      {children}
    </AppContext.Provider>
  );
}
