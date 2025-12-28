import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Crown,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  Package,
  ShoppingCart,
  MessageSquare,
  TrendingUp,
  BarChart3,
  UserCog,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Permission definitions with metadata
const PERMISSIONS = [
  { 
    key: "manage_users", 
    label: "Gerenciar Usuários", 
    description: "Verificar e gerenciar perfis de usuários",
    icon: Users,
    color: "text-blue-500"
  },
  { 
    key: "manage_products", 
    label: "Gerenciar Produtos", 
    description: "Visualizar e moderar produtos publicados",
    icon: Package,
    color: "text-green-500"
  },
  { 
    key: "manage_orders", 
    label: "Gerenciar Pedidos", 
    description: "Visualizar e atualizar status de pedidos",
    icon: ShoppingCart,
    color: "text-amber-500"
  },
  { 
    key: "manage_support", 
    label: "Gerenciar Suporte", 
    description: "Responder mensagens de suporte",
    icon: MessageSquare,
    color: "text-purple-500"
  },
  { 
    key: "manage_sourcing", 
    label: "Gerenciar Sourcing", 
    description: "Gerenciar pedidos especiais de sourcing",
    icon: TrendingUp,
    color: "text-indigo-500"
  },
  { 
    key: "view_analytics", 
    label: "Ver Analytics", 
    description: "Acesso a dados de mercado e estatísticas",
    icon: BarChart3,
    color: "text-pink-500"
  },
  { 
    key: "manage_admins", 
    label: "Gerenciar Admins", 
    description: "Promover e gerenciar outros administradores (apenas Root)",
    icon: UserCog,
    color: "text-red-500"
  },
] as const;

type PermissionKey = typeof PERMISSIONS[number]["key"];

interface AdminUser {
  id: string;
  full_name: string;
  email: string | null;
  user_type: string | null;
  is_root_admin: boolean;
  permissions: PermissionKey[];
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email?: string | null;
  user_type?: string | null;
  is_root_admin?: boolean;
}

interface AdminManagementProps {
  currentUserId: string;
  isRootAdmin: boolean;
  users: User[];
  onRefresh: () => void;
}

const AdminManagement: React.FC<AdminManagementProps> = ({
  currentUserId,
  isRootAdmin,
  users,
  onRefresh,
}) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [adminToRevoke, setAdminToRevoke] = useState<AdminUser | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      // Get all admin users
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setAdmins([]);
        return;
      }

      const adminUserIds = adminRoles.map((r) => r.user_id);

      // Get user details
      const { data: adminUsers, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email, user_type, is_root_admin, created_at")
        .in("id", adminUserIds);

      if (usersError) throw usersError;

      // Get permissions for each admin
      const { data: permissions, error: permError } = await supabase
        .from("admin_permissions")
        .select("user_id, permission")
        .in("user_id", adminUserIds);

      if (permError) throw permError;

      // Combine data
      const adminList: AdminUser[] = (adminUsers || []).map((user) => ({
        ...user,
        is_root_admin: user.is_root_admin || false,
        permissions: (permissions || [])
          .filter((p) => p.user_id === user.id)
          .map((p) => p.permission as PermissionKey),
      }));

      // Sort: root admins first, then by name
      adminList.sort((a, b) => {
        if (a.is_root_admin && !b.is_root_admin) return -1;
        if (!a.is_root_admin && b.is_root_admin) return 1;
        return a.full_name.localeCompare(b.full_name);
      });

      setAdmins(adminList);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Erro ao carregar administradores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const promoteToAdmin = async () => {
    if (!selectedUser || selectedPermissions.length === 0) {
      toast.error("Selecione pelo menos uma permissão");
      return;
    }

    try {
      // Add admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: selectedUser.id, role: "admin" });

      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      // Add permissions
      const permissionInserts = selectedPermissions.map((permission) => ({
        user_id: selectedUser.id,
        permission,
        granted_by: currentUserId,
      }));

      const { error: permError } = await supabase
        .from("admin_permissions")
        .insert(permissionInserts);

      if (permError) throw permError;

      toast.success(`${selectedUser.full_name} promovido a sub-admin!`);
      setPromoteDialogOpen(false);
      setSelectedUser(null);
      setSelectedPermissions([]);
      fetchAdmins();
      onRefresh();
    } catch (error) {
      console.error("Error promoting user:", error);
      toast.error("Erro ao promover usuário");
    }
  };

  const updatePermissions = async () => {
    if (!editingAdmin) return;

    try {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", editingAdmin.id);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (editPermissions.length > 0) {
        const permissionInserts = editPermissions.map((permission) => ({
          user_id: editingAdmin.id,
          permission,
          granted_by: currentUserId,
        }));

        const { error: insertError } = await supabase
          .from("admin_permissions")
          .insert(permissionInserts);

        if (insertError) throw insertError;
      }

      toast.success("Permissões atualizadas!");
      setEditingAdmin(null);
      setEditPermissions([]);
      fetchAdmins();
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Erro ao atualizar permissões");
    }
  };

  const revokeAdmin = async () => {
    if (!adminToRevoke) return;

    try {
      // Remove admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", adminToRevoke.id)
        .eq("role", "admin");

      if (roleError) throw roleError;

      // Remove all permissions
      const { error: permError } = await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", adminToRevoke.id);

      if (permError) throw permError;

      toast.success(`Privilégios de admin removidos de ${adminToRevoke.full_name}`);
      setRevokeDialogOpen(false);
      setAdminToRevoke(null);
      fetchAdmins();
      onRefresh();
    } catch (error) {
      console.error("Error revoking admin:", error);
      toast.error("Erro ao revogar privilégios");
    }
  };

  const nonAdminUsers = users.filter(
    (u) => !admins.find((a) => a.id === u.id)
  );

  const filteredNonAdminUsers = nonAdminUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isRootAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Apenas administradores root podem gerenciar outros admins</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Gerenciamento de Administradores</h2>
              <p className="text-sm text-muted-foreground">
                Como Root Admin, você pode promover sub-admins e definir suas permissões
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Admins */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Administradores Ativos ({admins.length})
            </CardTitle>
            <CardDescription>
              Gerencie as permissões de cada administrador
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAdmins}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
            <Button size="sm" onClick={() => setPromoteDialogOpen(true)}>
              <UserCog className="h-4 w-4 mr-1" /> Promover Novo Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum administrador encontrado</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-3">
              {admins.map((admin) => (
                <AccordionItem
                  key={admin.id}
                  value={admin.id}
                  className="border rounded-xl px-4 bg-white shadow-sm"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${admin.is_root_admin ? "bg-amber-100" : "bg-primary/10"}`}>
                        {admin.is_root_admin ? (
                          <Crown className="h-5 w-5 text-amber-600" />
                        ) : (
                          <Shield className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.full_name}</span>
                          {admin.is_root_admin && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Root Admin</Badge>
                          )}
                          {admin.id === currentUserId && (
                            <Badge variant="outline" className="text-xs">Você</Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{admin.email || "Sem email"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mr-4">
                      <Badge variant="outline" className="text-xs">
                        {admin.is_root_admin ? "Todas" : admin.permissions.length} permissões
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4">
                      {/* Permission List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {PERMISSIONS.map((perm) => {
                          const Icon = perm.icon;
                          const hasPermission = admin.is_root_admin || admin.permissions.includes(perm.key);
                          const isManageAdmins = perm.key === "manage_admins";
                          
                          return (
                            <div
                              key={perm.key}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                hasPermission 
                                  ? "bg-primary/5 border-primary/20" 
                                  : "bg-gray-50 border-gray-100"
                              }`}
                            >
                              <Icon className={`h-5 w-5 ${hasPermission ? perm.color : "text-gray-400"}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${hasPermission ? "text-gray-900" : "text-gray-500"}`}>
                                  {perm.label}
                                  {isManageAdmins && (
                                    <span className="ml-1 text-xs text-amber-600">(Root)</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{perm.description}</p>
                              </div>
                              {hasPermission ? (
                                <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                              ) : (
                                <ShieldX className="h-5 w-5 text-gray-300 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      {!admin.is_root_admin && admin.id !== currentUserId && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAdmin(admin);
                              setEditPermissions([...admin.permissions]);
                            }}
                          >
                            <UserCog className="h-4 w-4 mr-1" /> Editar Permissões
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setAdminToRevoke(admin);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            <ShieldX className="h-4 w-4 mr-1" /> Revogar Admin
                          </Button>
                        </div>
                      )}

                      {admin.is_root_admin && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 pt-2 border-t">
                          <Crown className="h-4 w-4" />
                          Administradores Root têm acesso total e não podem ser modificados
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Promote User Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" /> Promover Novo Sub-Admin
            </DialogTitle>
            <DialogDescription>
              Selecione um usuário e defina suas permissões de administrador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Selecionar Usuário</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {filteredNonAdminUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 p-3 text-center">
                    Nenhum usuário disponível
                  </p>
                ) : (
                  filteredNonAdminUsers.slice(0, 10).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 border-b last:border-0 ${
                        selectedUser?.id === user.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email || "Sem email"}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{user.user_type || "user"}</Badge>
                    </button>
                  ))
                )}
              </div>
              {selectedUser && (
                <div className="mt-2 p-2 bg-primary/10 rounded-lg flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Selecionado: {selectedUser.full_name}</span>
                </div>
              )}
            </div>

            {/* Permission Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Permissões</label>
              <div className="space-y-2">
                {PERMISSIONS.filter((p) => p.key !== "manage_admins").map((perm) => {
                  const Icon = perm.icon;
                  const isSelected = selectedPermissions.includes(perm.key);
                  
                  return (
                    <button
                      key={perm.key}
                      onClick={() => {
                        setSelectedPermissions((prev) =>
                          isSelected
                            ? prev.filter((p) => p !== perm.key)
                            : [...prev, perm.key]
                        );
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Switch checked={isSelected} />
                      <Icon className={`h-5 w-5 ${isSelected ? perm.color : "text-gray-400"}`} />
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-gray-500">{perm.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={promoteToAdmin} disabled={!selectedUser || selectedPermissions.length === 0}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Promover a Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingAdmin} onOpenChange={(open) => !open && setEditingAdmin(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" /> Editar Permissões
            </DialogTitle>
            <DialogDescription>
              Modificar permissões de {editingAdmin?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {PERMISSIONS.filter((p) => p.key !== "manage_admins").map((perm) => {
              const Icon = perm.icon;
              const isSelected = editPermissions.includes(perm.key);
              
              return (
                <button
                  key={perm.key}
                  onClick={() => {
                    setEditPermissions((prev) =>
                      isSelected
                        ? prev.filter((p) => p !== perm.key)
                        : [...prev, perm.key]
                    );
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Switch checked={isSelected} />
                  <Icon className={`h-5 w-5 ${isSelected ? perm.color : "text-gray-400"}`} />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAdmin(null)}>
              Cancelar
            </Button>
            <Button onClick={updatePermissions}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Admin Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Revogar Privilégios de Admin
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover os privilégios de administrador de{" "}
              <strong>{adminToRevoke?.full_name}</strong>?
              <br />
              Esta ação removerá todas as permissões e o acesso ao painel admin.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={revokeAdmin}>
              <ShieldX className="h-4 w-4 mr-1" /> Revogar Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManagement;
