import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import {
  Loader2,
  Pencil,
  Plus,
  Trash,
  Lock,
  LockOpen,
  Power,
  PowerOff,
  Search,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { UserFormModal } from "./UserFormModal";
import {
  getUsers as getUsersApi,
  type UserRecord,
  deleteUserById,
  deactivateUserById,
  lockUserById,
} from "@/lib/api/user";
import { Pagination } from "../ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { toast } from "sonner";

const ITEM_PER_PAGE = 15;

export function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpen = () => {
    setIsOpen(true);
    setSelectedUser(null);
  };
  const handleClose = () => {
    setIsOpen(false);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsersApi(searchQuery);
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      await loadUsers();
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.class?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * ITEM_PER_PAGE,
    userPage * ITEM_PER_PAGE,
  );

  const handleEditUser = (id: string) => {
    //console.log("Editing user:", id);
    setIsOpen(true);
    const user = users.find((user) => user.id === id);
    if (user) {
      setSelectedUser(user);
      console.log("Selected user:", user);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteUserById(id);
      setDeletingUserId(null);
      loadUsers();
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserLock = async (id: string) => {
    const existing = users.find((user) => user.id === id);
    if (!existing) return;

    setIsLoading(true);
    setIsLocking(true);
    try {
      await lockUserById(id);
      loadUsers();
      toast.success(
        existing.isLocked
          ? "User unlocked successfully"
          : "User locked successfully",
      );
    } catch (error) {
      console.error("Failed to toggle user lock:", error);
      toast.error("Failed to update user lock status");
    } finally {
      setIsLocking(false);
      setIsLoading(false);
    }
  };

  const handleToggleUserActive = async (id: string) => {
    const existing = users.find((user) => user.id === id);
    if (!existing) return;

    setIsLoading(true);
    setIsDeactivating(true);
    try {
      await deactivateUserById(id);
      loadUsers();
      toast.success(
        existing.isActive
          ? "User deactivated successfully"
          : "User activated successfully",
      );
    } catch (error) {
      console.error("Failed to toggle user active status:", error);
      toast.error("Failed to update user status");
    } finally {
      setIsDeactivating(false);
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users. Active users are available for creating new users.
              </CardDescription>
            </div>
            <Button onClick={handleOpen}>
              <Plus size={16} className="mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="search"
              placeholder="Search by name, email, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading ? (
                paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.class?.grade?.name ?? "-"}</TableCell>
                      <TableCell>{user.class?.name}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        {user.isLocked ? (
                          <Badge variant="warning">Locked</Badge>
                        ) : (
                          <Badge variant={user.isActive ? "success" : "danger"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user.id)}
                          disabled={isLoading}
                        >
                          <Pencil size={16} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingUserId(user.id)}
                              disabled={isLoading}
                            >
                              <Trash size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this user?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setDeletingUserId(null)}
                                disabled={isLoading}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteUser(deletingUserId ?? "")
                                }
                                disabled={!deletingUserId}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleUserLock(user.id)}
                          disabled={isLocking}
                        >
                          {user.isLocked ? (
                            <LockOpen size={16} />
                          ) : (
                            <Lock size={16} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleUserActive(user.id)}
                          disabled={isDeactivating}
                        >
                          {user.isActive ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      <Loader2 size={16} className="animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                )
              ) : (
                <TableRow>
                  <TableCell className="text-center">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            currentPage={userPage}
            totalPages={Math.ceil(filteredUsers.length / ITEM_PER_PAGE)}
            onPageChange={setUserPage}
          />
        </CardContent>
      </Card>

      <UserFormModal
        isOpen={isOpen}
        onClose={handleClose}
        onSuccess={loadUsers}
        user={selectedUser ?? undefined}
      />
    </div>
  );
}
