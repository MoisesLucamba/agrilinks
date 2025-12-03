import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
// No topo do seu arquivo AdminDashboard.tsx
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import {  Edit, Trash } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Bell,
  Menu,
  X,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  Send,
  MessageSquare,
  Eye,
  Trash2,
  Edit2,
  Download,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Globe,
  MapPin,
  Phone,
  Mail,
  MoreVertical,
  ChevronDown,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import AgrilinkLogo from "@/assets/agrilink-logo.png";

// --- Tipos ---

interface Product {
  id: string;
  product_type: string;
  quantity: number;
  price: number;
  logistics_access: string;
  user_id: string;
  lat?: number;
  lng?: number;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  province_id?: string;
  municipality_id?: string;
  avatar_url?: string | null;
  user_type?: string | null;
  created_at?: string | null;
  last_seen?: string;
  is_online?: boolean;
}

interface Order {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  location: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

interface Transaction {
  id: string;
  wallet_id: string;
  type: string;
  status: string;
  amount: number;
  description?: string | null;
  reference_id?: string | null;
  related_user_id?: string | null;
  metadata?: any;
  completed_at?: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

interface Ficha {
  id: string;
  user_id: string;
  nome_ficha: string;
  produto: string;
  tipo_negocio: string;
  qualidade?: string;
  embalagem?: string;
  transporte?: string;
  telefone?: string;
  locais_entrega?: any;
  observacoes?: string;
  descricao_final?: string;
  created_at: string;
  updated_at?: string;
}

// --- Componentes Auxiliares ---

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  color: "blue" | "green" | "purple" | "orange";
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {trend !== undefined && (
              <p className={`text-sm mt-2 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs mês anterior
              </p>
            )}
          </div>
          <div className={`${colorClasses[color]} p-4 rounded-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Componente Principal ---

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Estados

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "users" | "transactions" | "notifications" | "orders" | "fichas">("dashboard");

  // Modal de Notificação
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [targetUser, setTargetUser] = useState<string | null>(null);

  // Modal de Mensagem
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [targetUserMessage, setTargetUserMessage] = useState<string | null>(null);

  // Filtros e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // --- Efeitos ---

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  // Real-time para notificações
  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);useEffect(() => {
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("pre_orders") // ← aqui, use o nome correto da tabela
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setOrders(data || []);
    else console.error("Erro ao buscar pedidos:", error);
  };

  fetchOrders();
}, []);

  // --- Funções ---

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [prodRes, usersRes, transRes, notRes, fichasRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        supabase.from("fichas_recebimento").select("*").order("created_at", { ascending: false }),
      ]);

      setProducts(prodRes.data || []);
      setUsers(usersRes.data || []);
      setTransactions(transRes.data || []);
      setNotifications(notRes.data || []);
      setFichas(fichasRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = useCallback(async () => {
    if (!targetUser || !notificationMessage.trim() || !notificationTitle.trim()) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      // Use RPC function to bypass RLS - create_notification is security definer
      const { error } = await supabase.rpc("create_notification", {
        p_user_id: targetUser,
        p_type: notificationType,
        p_title: notificationTitle,
        p_message: notificationMessage,
        p_metadata: {}
      });

      if (error) throw error;

      setNotificationModalOpen(false);
      setNotificationMessage("");
      setNotificationTitle("");
      setNotificationType("info");
      setTargetUser(null);
      alert("Notificação enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      alert("Erro ao enviar notificação");
    }
  }, [targetUser, notificationMessage, notificationTitle, notificationType]);

  const sendMessage = useCallback(async () => {
    if (!targetUserMessage || !messageContent.trim()) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      // Criar uma conversa se não existir
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_id", targetUserMessage)
        .limit(1)
        .single();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            user_id: "ADMIN",
            participant_id: targetUserMessage,
            title: "Mensagem do Admin",
            last_message: messageContent,
            last_timestamp: new Date().toISOString(),
          })
          .select()
          .single();

        conversationId = newConv?.id;
      }

      // Enviar mensagem
      if (conversationId) {
        await supabase.from("messages").insert({
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          sender_id: "ADMIN",
          receiver_id: targetUserMessage,
          content: messageContent,
          read: false,
          created_at: new Date().toISOString(),
        });
      }

      setMessageModalOpen(false);
      setMessageContent("");
      setTargetUserMessage(null);
      alert("Mensagem enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem");
    }
  }, [targetUserMessage, messageContent]);

  const handleDelete = useCallback(
    async (table: string, id: string, setter: Function) => {
      if (!confirm("Deseja realmente apagar?")) return;

      try {
        const { error } = await supabase.from(table as any).delete().eq("id", id);
        if (!error) {
          setter((prev: any[]) => prev.filter((item: any) => item.id !== id));
        }
      } catch (error) {
        console.error("Erro ao apagar:", error);
        alert("Erro ao apagar");
      }
    },
    []
  );

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
  }, []);

  const getLogisticsBadge = (logistics: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      sim: { bg: "bg-green-100", text: "text-green-800", label: "Fácil" },
      parcial: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Médio" },
      não: { bg: "bg-red-100", text: "text-red-800", label: "Difícil" },
    };

    const badge = badges[logistics] || { bg: "bg-gray-100", text: "text-gray-800", label: logistics || "-" };
    return <Badge className={`${badge.bg} ${badge.text}`}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      completed: { bg: "bg-green-100", text: "text-green-800", icon: <CheckCircle className="h-4 w-4" /> },
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: <Clock className="h-4 w-4" /> },
      failed: { bg: "bg-red-100", text: "text-red-800", icon: <AlertCircle className="h-4 w-4" /> },
    };

    const badge = badges[status] || { bg: "bg-gray-100", text: "text-gray-800", icon: null };
    return (
      <Badge className={`${badge.bg} ${badge.text} flex items-center gap-1`}>
        {badge.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // --- Dados para Gráficos ---

  const chartDataRevenue = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach((t) => {
      const date = new Date(t.created_at).toLocaleDateString("pt-BR", {
        month: "short",
        day: "numeric",
      });
      data[date] = (data[date] || 0) + t.amount;
    });

    return Object.entries(data)
      .slice(-7)
      .map(([date, amount]) => ({ date, amount }));
  }, [transactions]);

  const chartDataProducts = useMemo(() => {
    const data: Record<string, number> = {};
    products.forEach((p) => {
      data[p.product_type] = (data[p.product_type] || 0) + 1;
    });

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [products]);

  const chartDataTransactionStatus = useMemo(() => {
    const data: Record<string, number> = {
      completed: 0,
      pending: 0,
      failed: 0,
    };

    transactions.forEach((t) => {
      data[t.status]++;
    });

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const onlineUsers = useMemo(() => {
    return users.filter((u) => {
      const lastSeen = u.last_seen ? new Date(u.last_seen).getTime() : 0;
      const now = new Date().getTime();
      return now - lastSeen < 5 * 60 * 1000; // Últimos 5 minutos
    });
  }, [users]);

  const filteredNotifications = useMemo(() => {
  return notifications.filter((n) => {
    if (filterStatus === "unread") return !n.read;
    if (filterStatus === "read") return n.read;
    return true;
  });
}, [notifications, filterStatus]);

const filteredProducts = useMemo(() => {
  return (products || []).filter((p) =>
    (p?.product_type || "")
      .toLowerCase()
      .includes((searchTerm || "").toLowerCase())
  );
}, [products, searchTerm]);

const filteredUsers = useMemo(() => {
  return (users || []).filter((u) =>
    (u?.full_name || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
    (u?.email || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );
}, [users, searchTerm]);

  // --- Renderização ---

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

const tabs = ["dashboard", "products", "users", "transactions", "notifications", "orders", "fichas"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar Premium */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={AgrilinkLogo} alt="Agrilink Logo" className="h-10" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Gerenciamento de Marketplace</p>
              </div>
            </div>

            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div
              className={`absolute md:static top-16 left-0 right-0 md:top-auto md:left-auto md:right-auto bg-white md:bg-transparent border-b md:border-0 ${
                menuOpen ? "flex" : "hidden md:flex"
              } flex-col md:flex-row items-stretch md:items-center gap-2 p-4 md:p-0`}
            >
              {tabs.map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setActiveTab(tab as any);
                    setMenuOpen(false);
                  }}
                  className="justify-start md:justify-center"
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="justify-start md:justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2 md:mr-0" />
                <span className="md:hidden">Voltar</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* DASHBOARD - Métricas e Gráficos */}
        {activeTab === "dashboard" && (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total de Produtos"
                value={products.length}
                icon={<ShoppingCart className="h-8 w-8" />}
                trend={12}
                color="blue"
              />
              <MetricCard
                title="Total de Usuários"
                value={users.length}
                icon={<Users className="h-8 w-8" />}
                trend={8}
                color="green"
              />
              <MetricCard
                title="Usuários Online"
                value={onlineUsers.length}
                icon={<Activity className="h-8 w-8" />}
                color="purple"
              />
              <MetricCard
                title="Transações"
                value={transactions.length}
                icon={<DollarSign className="h-8 w-8" />}
                trend={15}
                color="orange"
              />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receita por Data */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Receita por Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartDataRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: "#3B82F6" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Produtos por Tipo */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Distribuição de Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartDataProducts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status de Transações */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Status de Transações</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartDataTransactionStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Usuários Online */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Usuários Online Agora</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {onlineUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Nenhum usuário online</p>
                    ) : (
                      onlineUsers.slice(0, 5).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                            <div>
                              <p className="font-medium text-gray-900">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <Globe className="h-4 w-4 text-green-600" />
                        </div>
                      ))
                    )}
                    {onlineUsers.length > 5 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        +{onlineUsers.length - 5} usuários online
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
        {/* PEDIDOS */}
{activeTab === "orders" && (
  <Card className="shadow-md">
    <CardHeader>
      <CardTitle>Pedidos</CardTitle>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Preço Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const user = users.find((u) => u.id === order.user_id);
            const product = products.find((p) => p.id === order.product_id);

            const updateStatus = async (newStatus) => {
              const { error } = await supabase
                .from("pre_orders")
                .update({ status: newStatus })
                .eq("id", order.id);

              if (error) {
                console.error("Erro ao atualizar status:", error);
              } else {
                setOrders((prev) =>
                  prev.map((o) =>
                    o.id === order.id ? { ...o, status: newStatus } : o
                  )
                );
              }
            };

            return (
              <TableRow key={order.id} className="hover:bg-gray-50">
                <TableCell className="font-mono text-sm">
                  {order.id.substring(0, 8)}...
                </TableCell>
                <TableCell>{product?.product_type || "-"}</TableCell>
                <TableCell>{user?.full_name || "-"}</TableCell>
                <TableCell>{user?.phone || "-"}</TableCell>
                <TableCell>{order.quantity} kg</TableCell>
                <TableCell>
                  {product
                    ? (order.quantity * product.price).toFixed(2) + " Kz"
                    : "-"}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-white text-xs font-semibold ${
                      order.status === "concluida"
                        ? "bg-green-500"
                        : order.status === "cancelado"
                        ? "bg-red-500"
                        : "bg-yellow-400"
                    }`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="flex gap-2">
                  {/* Concluída */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex items-center gap-1 px-2 py-1 rounded ${
                      order.status === "concluida"
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-white text-green-500 border-green-500 hover:bg-green-100"
                    }`}
                    onClick={() => updateStatus("concluida")}
                    disabled={order.status === "concluida"}
                  >
                    <Check className="w-4 h-4" />
                    Concluída
                  </Button>

                  {/* Cancelada */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex items-center gap-1 px-2 py-1 rounded ${
                      order.status === "cancelado"
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-red-500 border-red-500 hover:bg-red-100"
                    }`}
                    onClick={() => updateStatus("cancelado")}
                    disabled={order.status === "cancelado"}
                  >
                    <X className="w-4 h-4" />
                    Cancelada
                  </Button>

                  {/* Aguardando */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex items-center gap-1 px-2 py-1 rounded ${
                      order.status === "aguardando"
                        ? "bg-yellow-400 text-white border-yellow-400"
                        : "bg-white text-yellow-500 border-yellow-400 hover:bg-yellow-100"
                    }`}
                    onClick={() => updateStatus("aguardando")}
                    disabled={order.status === "aguardando"}
                  >
                    <Clock className="w-4 h-4" />
                    Aguardando
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)}



        {/* PRODUTOS */}
        {activeTab === "products" && (
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Produtos</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Logística</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const user = users.find((u) => u.id === product.user_id);
                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{product.product_type}</TableCell>
                        <TableCell>{product.quantity} kg</TableCell>
                        <TableCell>{product.price ? `${product.price.toFixed(2)} Kz/kg` : "-"}</TableCell>
                        <TableCell>{getLogisticsBadge(product.logistics_access)}</TableCell>
                        <TableCell>{user?.full_name || "-"}</TableCell>
                        <TableCell>{user?.phone || "-"}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(product.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetUser(product.user_id);
                                  setNotificationModalOpen(true);
                                }}
                              >
                                <Bell className="h-4 w-4 mr-2" />
                                Notificar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetUserMessage(product.user_id);
                                  setMessageModalOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Mensagem
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDelete("products", product.id, setProducts)
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Apagar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* USUÁRIOS */}
        {activeTab === "users" && (
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Usuários</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isOnline = onlineUsers.some((u) => u.id === user.id);
                    return (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {user.province_id && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {user.province_id}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${
                              isOnline
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {isOnline ? "Online" : "Offline"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetUser(user.id);
                                  setNotificationModalOpen(true);
                                }}
                              >
                                <Bell className="h-4 w-4 mr-2" />
                                Notificar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetUserMessage(user.id);
                                  setMessageModalOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Mensagem
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete("users", user.id, setUsers)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Apagar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TRANSAÇÕES */}
        {activeTab === "transactions" && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Transações</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const user = users.find((u) => u.id === transaction.related_user_id);
                    return (
                      <TableRow key={transaction.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          {transaction.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{user?.full_name || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          {transaction.amount.toFixed(2)} Kz
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* NOTIFICAÇÕES */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Notificações do Sistema</CardTitle>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtrar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                        Todas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus("unread")}>
                        Não Lidas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus("read")}>
                        Lidas
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={() => setNotificationModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Notificação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredNotifications.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Nenhuma notificação</p>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-all ${
                          notification.read
                            ? "bg-gray-50 border-gray-200"
                            : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <Badge className="bg-blue-600 text-white">Novo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              markNotificationAsRead(notification.id)
                            }
                          >
                            {notification.read ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FICHAS DE RECEBIMENTO */}
        {activeTab === "fichas" && (
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Fichas de Recebimento
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar fichas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Nome da Ficha</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo de Negócio</TableHead>
                    <TableHead>Qualidade</TableHead>
                    <TableHead>Embalagem</TableHead>
                    <TableHead>Transporte</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fichas
                    .filter((f) =>
                      (f.nome_ficha || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
                      (f.produto || "").toLowerCase().includes((searchTerm || "").toLowerCase())
                    )
                    .map((ficha) => {
                      const user = users.find((u) => u.id === ficha.user_id);
                      return (
                        <TableRow key={ficha.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {ficha.nome_ficha}
                          </TableCell>
                          <TableCell>{ficha.produto}</TableCell>
                          <TableCell>
                            <Badge className={
                              ficha.tipo_negocio === "compra"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }>
                              {ficha.tipo_negocio.charAt(0).toUpperCase() + ficha.tipo_negocio.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{ficha.qualidade || "-"}</TableCell>
                          <TableCell>{ficha.embalagem || "-"}</TableCell>
                          <TableCell>{ficha.transporte || "-"}</TableCell>
                          <TableCell>{ficha.telefone || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(ficha.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTargetUser(ficha.user_id);
                                  setNotificationModalOpen(true);
                                }}
                                title="Enviar Notificação"
                              >
                                <Bell className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete("fichas_recebimento", ficha.id, setFichas)}
                                className="text-red-600 hover:text-red-700"
                                title="Apagar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              {fichas.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhuma ficha de recebimento cadastrada</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Notificação */}
      <Dialog open={notificationModalOpen} onOpenChange={setNotificationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Notificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Usuário</label>
              <select
                value={targetUser || ""}
                onChange={(e) => setTargetUser(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um usuário</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="info">Informação</option>
                <option value="alert">Alerta</option>
                <option value="success">Sucesso</option>
                <option value="error">Erro</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Título</label>
              <Input
                placeholder="Título da notificação"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Mensagem</label>
              <Textarea
                placeholder="Digite a mensagem"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setNotificationModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={sendNotification} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Mensagem */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Usuário</label>
              <select
                value={targetUserMessage || ""}
                onChange={(e) => setTargetUserMessage(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um usuário</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Mensagem</label>
              <Textarea
                placeholder="Digite a mensagem"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setMessageModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;