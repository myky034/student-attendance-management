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
import { getUsers as getUsersApi, type DbUser } from "@/lib/api/user";
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

const ITEM_PER_PAGE = 15;

export function UserManagement() {
  const [users, setUsers] = useState<DbUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
  };
  const handleClose = () => {
    setIsOpen(false);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsersApi();
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

  const paginatedUsers = users.slice(
    (userPage - 1) * ITEM_PER_PAGE,
    userPage * ITEM_PER_PAGE,
  );

  const handleEditUser = (id: string) => {
    //console.log("Editing user:", id);
    setIsOpen(true);
    const user = users.find((user) => user.id === id);
    if (user) {
      setSelectedUser(user);
    }
  };

  const handleDeleteUser = (id: string) => {
    setDeletingUserId(id);
  };

  const handleToggleUserLock = (id: string) => {
    const user = users.find((user) => user.id === id);
    if (user) {
      setSelectedUser(user);
    }
  };

  const handleToggleUserActive = (id: string) => {
    const user = users.find((user) => user.id === id);
    if (user) {
      setSelectedUser(user);
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
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
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "success" : "danger"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
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
                          disabled={isLoading}
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
                          disabled={isLoading}
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
                  <TableCell colSpan={6} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            currentPage={userPage}
            totalPages={Math.ceil(users.length / ITEM_PER_PAGE)}
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
