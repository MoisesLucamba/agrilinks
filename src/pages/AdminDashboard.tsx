import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Menu,
  X,
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  Send,
  MessageSquare,
  Eye,
  Trash2,
  Search,
  CheckCircle,
  Clock,
  MapPin,
  MoreVertical,
  Package,
  FileText,
  TrendingUp,
  RefreshCw,
  Check,
  AlertCircle,
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
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AgrilinkLogo from "@/assets/agrilink-logo.png";

// --- Tipos ---
interface Product {
  id: string;
  product_type: string;
  quantity: number;
  price: number;
  logistics_access: string;
  user_id: string;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  user_type?: string | null;
  created_at?: string | null;
}

interface Order {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  location: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  wallet_id: string;
  type: string;
  status: string;
  amount: number;
  description?: string | null;
  related_user_id?: string | null;
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
}

interface Ficha {
  id: string;
  user_id: string;
  nome_ficha: string;
  produto: string;
  tipo_negocio: string;
  qualidade?: string;
  telefone?: string;
  created_at: string;
}

type TabType = "dashboard" | "products" | "users" | "transactions" | "notifications" | "orders" | "fichas" | "sourcing";

interface SourcingRequest {
  id: string;
  user_id: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

// --- Componentes Auxiliares ---
const MetricCard = ({ title, value, icon, trend, color }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  color: string;
}) => (
  <div className={`rounded-2xl p-5 ${color} transition-all hover:scale-[1.02] hover:shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {trend !== undefined && (
          <p className="text-sm mt-1 text-white/70 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend >= 0 ? "+" : ""}{trend}%
          </p>
        )}
      </div>
      <div className="p-3 bg-white/20 rounded-xl text-white">
        {icon}
      </div>
    </div>
  </div>
);

const TabButton = ({ active, onClick, children, badge }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
      active 
        ? "bg-primary text-white shadow-md" 
        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
    }`}
  >
    {children}
    {badge !== undefined && badge > 0 && (
      <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

// --- Componente Principal ---
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [sourcingRequests, setSourcingRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [targetUser, setTargetUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from("pre_orders").select("*").order("created_at", { ascending: false });
      if (data) setOrders(data);
    };
    fetchOrders();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [prodRes, usersRes, transRes, notRes, fichasRes, sourcingRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        supabase.from("fichas_recebimento").select("*").order("created_at", { ascending: false }),
        supabase.from("sourcing_requests").select("*").order("created_at", { ascending: false }),
      ]);
      setProducts(prodRes.data || []);
      setUsers(usersRes.data || []);
      setTransactions(transRes.data || []);
      setNotifications(notRes.data || []);
      setFichas(fichasRes.data || []);
      setSourcingRequests(sourcingRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = useCallback(async () => {
    if (!targetUser || !notificationMessage.trim() || !notificationTitle.trim()) {
      toast.error("Preencha todos os campos!");
      return;
    }
    try {
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
      setTargetUser(null);
      toast.success("Notificação enviada!");
    } catch {
      toast.error("Erro ao enviar notificação");
    }
  }, [targetUser, notificationMessage, notificationTitle, notificationType]);

  const handleDelete = useCallback(async (table: string, id: string, setter: Function) => {
    if (!confirm("Deseja realmente apagar?")) return;
    try {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (!error) setter((prev: any[]) => prev.filter((item: any) => item.id !== id));
    } catch {
      toast.error("Erro ao apagar");
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("pre_orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      toast.success(`Status atualizado para ${newStatus}`);
    }
  }, []);

  const updateSourcingStatus = useCallback(async (id: string, newStatus: string, adminNotes?: string) => {
    const updateData: { status: string; admin_notes?: string } = { status: newStatus };
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
    
    const { error } = await supabase.from("sourcing_requests").update(updateData).eq("id", id);
    if (!error) {
      setSourcingRequests((prev) => prev.map((s) => (s.id === id ? { ...s, ...updateData } : s)));
      toast.success(`Pedido de sourcing atualizado`);
    } else {
      toast.error("Erro ao atualizar pedido");
    }
  }, []);

  // --- Dados para Gráficos ---
  const chartDataRevenue = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach((t) => {
      const date = new Date(t.created_at).toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
      data[date] = (data[date] || 0) + t.amount;
    });
    return Object.entries(data).slice(-7).map(([date, amount]) => ({ date, amount }));
  }, [transactions]);

  const chartDataProducts = useMemo(() => {
    const data: Record<string, number> = {};
    products.forEach((p) => { data[p.product_type] = (data[p.product_type] || 0) + 1; });
    return Object.entries(data).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [products]);

  const chartDataTransactionStatus = useMemo(() => {
    const data: Record<string, number> = { completed: 0, pending: 0, failed: 0, blocked: 0 };
    transactions.forEach((t) => { if (data[t.status] !== undefined) data[t.status]++; });
    return Object.entries(data).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterStatus === "unread") return !n.read;
      if (filterStatus === "read") return n.read;
      return true;
    });
  }, [notifications, filterStatus]);

  const filteredProducts = useMemo(() => products.filter((p) => p.product_type.toLowerCase().includes(searchTerm.toLowerCase())), [products, searchTerm]);
  const filteredUsers = useMemo(() => users.filter((u) => (u.full_name || "").toLowerCase().includes(searchTerm.toLowerCase())), [users, searchTerm]);
  const filteredFichas = useMemo(() => fichas.filter((f) => f.nome_ficha.toLowerCase().includes(searchTerm.toLowerCase()) || f.produto.toLowerCase().includes(searchTerm.toLowerCase())), [fichas, searchTerm]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-700",
      concluida: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      aguardando: "bg-amber-100 text-amber-700",
      in_progress: "bg-blue-100 text-blue-700",
      failed: "bg-red-100 text-red-700",
      cancelado: "bg-red-100 text-red-700",
      cancelled: "bg-red-100 text-red-700",
      blocked: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header Moderno */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={AgrilinkLogo} alt="Agrilink" className="h-9" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">Painel Admin</h1>
                <p className="text-xs text-gray-500">Gerenciamento AgriLink</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("notifications")}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => navigate("/")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button className="md:hidden p-2 hover:bg-gray-100 rounded-xl" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={`mt-3 overflow-x-auto pb-1 ${menuOpen ? "flex" : "hidden md:flex"} flex-wrap gap-2`}>
            <TabButton active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); setMenuOpen(false); }}>
              <Activity className="h-4 w-4" /> Dashboard
            </TabButton>
            <TabButton active={activeTab === "orders"} onClick={() => { setActiveTab("orders"); setMenuOpen(false); }}>
              <ShoppingCart className="h-4 w-4" /> Pedidos
            </TabButton>
            <TabButton active={activeTab === "products"} onClick={() => { setActiveTab("products"); setMenuOpen(false); }}>
              <Package className="h-4 w-4" /> Produtos
            </TabButton>
            <TabButton active={activeTab === "users"} onClick={() => { setActiveTab("users"); setMenuOpen(false); }}>
              <Users className="h-4 w-4" /> Usuários
            </TabButton>
            <TabButton active={activeTab === "transactions"} onClick={() => { setActiveTab("transactions"); setMenuOpen(false); }}>
              <DollarSign className="h-4 w-4" /> Transações
            </TabButton>
            <TabButton active={activeTab === "notifications"} onClick={() => { setActiveTab("notifications"); setMenuOpen(false); }} badge={unreadCount}>
              <Bell className="h-4 w-4" /> Notificações
            </TabButton>
            <TabButton active={activeTab === "fichas"} onClick={() => { setActiveTab("fichas"); setMenuOpen(false); }}>
              <FileText className="h-4 w-4" /> Fichas
            </TabButton>
            <TabButton active={activeTab === "sourcing"} onClick={() => { setActiveTab("sourcing"); setMenuOpen(false); }} badge={sourcingRequests.filter(s => s.status === 'pending').length}>
              <TrendingUp className="h-4 w-4" /> Sourcing
            </TabButton>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Produtos" value={products.length} icon={<Package className="h-6 w-6" />} trend={12} color="bg-gradient-to-br from-emerald-500 to-green-600" />
              <MetricCard title="Usuários" value={users.length} icon={<Users className="h-6 w-6" />} trend={8} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
              <MetricCard title="Pedidos" value={orders.length} icon={<ShoppingCart className="h-6 w-6" />} trend={15} color="bg-gradient-to-br from-amber-500 to-orange-600" />
              <MetricCard title="Transações" value={transactions.length} icon={<DollarSign className="h-6 w-6" />} trend={5} color="bg-gradient-to-br from-purple-500 to-pink-600" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Receita por Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartDataRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Top Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartDataProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Status das Transações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-8">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={chartDataTransactionStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${value}`}>
                          {chartDataTransactionStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {chartDataTransactionStatus.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm text-gray-600 capitalize">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* PEDIDOS */}
        {activeTab === "orders" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Pedidos ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const user = users.find((u) => u.id === order.user_id);
                    const product = products.find((p) => p.id === order.product_id);
                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium">{product?.product_type || "-"}</TableCell>
                        <TableCell>{user?.full_name || "-"}</TableCell>
                        <TableCell>{order.quantity} kg</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => updateOrderStatus(order.id, "concluida")} disabled={order.status === "concluida"}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => updateOrderStatus(order.id, "cancelado")} disabled={order.status === "cancelado"}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600" onClick={() => updateOrderStatus(order.id, "aguardando")} disabled={order.status === "aguardando"}>
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> Produtos ({filteredProducts.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48 h-9" />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const user = users.find((u) => u.id === product.user_id);
                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium">{product.product_type}</TableCell>
                        <TableCell>{product.quantity} kg</TableCell>
                        <TableCell>{product.price?.toFixed(2)} Kz</TableCell>
                        <TableCell>{user?.full_name || "-"}</TableCell>
                        <TableCell className="text-sm text-gray-500">{new Date(product.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setTargetUser(product.user_id); setNotificationModalOpen(true); }}>
                                <Bell className="h-4 w-4 mr-2" /> Notificar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete("products", product.id, setProducts)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Apagar
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Usuários ({filteredUsers.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48 h-9" />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{user.email || "-"}</TableCell>
                      <TableCell className="text-sm">{user.phone || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{user.user_type || "user"}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setTargetUser(user.id); setNotificationModalOpen(true); }}>
                              <Bell className="h-4 w-4 mr-2" /> Notificar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete("users", user.id, setUsers)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Apagar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TRANSAÇÕES */}
        {activeTab === "transactions" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Transações ({transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs">{t.id.substring(0, 8)}...</TableCell>
                      <TableCell className="capitalize text-sm">{t.type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="font-semibold">{t.amount.toFixed(2)} Kz</TableCell>
                      <TableCell><Badge className={getStatusColor(t.status)}>{t.status}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* NOTIFICAÇÕES */}
        {activeTab === "notifications" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Notificações
              </CardTitle>
              <div className="flex gap-2">
                <div className="flex rounded-lg border overflow-hidden">
                  <button onClick={() => setFilterStatus("all")} className={`px-3 py-1.5 text-xs ${filterStatus === "all" ? "bg-primary text-white" : "bg-white text-gray-600"}`}>Todas</button>
                  <button onClick={() => setFilterStatus("unread")} className={`px-3 py-1.5 text-xs ${filterStatus === "unread" ? "bg-primary text-white" : "bg-white text-gray-600"}`}>Não Lidas</button>
                  <button onClick={() => setFilterStatus("read")} className={`px-3 py-1.5 text-xs ${filterStatus === "read" ? "bg-primary text-white" : "bg-white text-gray-600"}`}>Lidas</button>
                </div>
                <Button size="sm" onClick={() => setNotificationModalOpen(true)}>
                  <Send className="h-4 w-4 mr-1" /> Enviar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhuma notificação</p>
              ) : (
                filteredNotifications.map((n) => (
                  <div key={n.id} className={`p-4 rounded-xl border transition-all cursor-pointer ${n.read ? "bg-gray-50 border-gray-100" : "bg-blue-50 border-blue-200"}`} onClick={() => markNotificationAsRead(n.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{n.title}</h4>
                          {!n.read && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Novo</span>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      {n.read ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /> : <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* FICHAS */}
        {activeTab === "fichas" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Fichas de Recebimento ({filteredFichas.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48 h-9" />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead>Nome</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Negócio</TableHead>
                    <TableHead>Qualidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFichas.map((f) => (
                    <TableRow key={f.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">{f.nome_ficha}</TableCell>
                      <TableCell>{f.produto}</TableCell>
                      <TableCell><Badge className={f.tipo_negocio === "compra" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{f.tipo_negocio}</Badge></TableCell>
                      <TableCell>{f.qualidade || "-"}</TableCell>
                      <TableCell>{f.telefone || "-"}</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(f.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setTargetUser(f.user_id); setNotificationModalOpen(true); }}>
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDelete("fichas_recebimento", f.id, setFichas)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* AGRILINK SOURCING */}
        {activeTab === "sourcing" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> AgriLink Sourcing - Pedidos Especiais ({sourcingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {sourcingRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum pedido de sourcing</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd (kg)</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourcingRequests.map((req) => {
                      const user = users.find((u) => u.id === req.user_id);
                      return (
                        <TableRow key={req.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium">{user?.full_name || "-"}</TableCell>
                          <TableCell>{req.product_name}</TableCell>
                          <TableCell>{req.quantity}</TableCell>
                          <TableCell className="text-sm">{new Date(req.delivery_date).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(req.status)}>{req.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => updateSourcingStatus(req.id, "in_progress")}>
                                  <Clock className="h-4 w-4 mr-2 text-amber-500" /> Em Progresso
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSourcingStatus(req.id, "completed")}>
                                  <Check className="h-4 w-4 mr-2 text-green-500" /> Concluído
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSourcingStatus(req.id, "cancelled")}>
                                  <X className="h-4 w-4 mr-2 text-red-500" /> Cancelado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const notes = prompt("Notas do Admin:", req.admin_notes || "");
                                  if (notes !== null) updateSourcingStatus(req.id, req.status, notes);
                                }}>
                                  <MessageSquare className="h-4 w-4 mr-2" /> Adicionar Notas
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setTargetUser(req.user_id); setNotificationModalOpen(true); }}>
                                  <Bell className="h-4 w-4 mr-2" /> Notificar Cliente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              
              {/* Detalhes expandidos */}
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-sm text-gray-700">Detalhes dos Pedidos</h3>
                {sourcingRequests.filter(r => r.description || r.admin_notes).map((req) => {
                  const user = users.find((u) => u.id === req.user_id);
                  return (
                    <div key={req.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-medium">{req.product_name}</span>
                          <span className="text-sm text-gray-500 ml-2">- {user?.full_name}</span>
                        </div>
                        <Badge className={getStatusColor(req.status)}>{req.status}</Badge>
                      </div>
                      {req.description && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 font-medium">Descrição do Cliente:</p>
                          <p className="text-sm text-gray-700">{req.description}</p>
                        </div>
                      )}
                      {req.admin_notes && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-600 font-medium">Notas do Admin:</p>
                          <p className="text-sm text-blue-800">{req.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modal de Notificação */}
      <Dialog open={notificationModalOpen} onOpenChange={setNotificationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Notificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Usuário</label>
              <select value={targetUser || ""} onChange={(e) => setTargetUser(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary">
                <option value="">Selecione um usuário</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select value={notificationType} onChange={(e) => setNotificationType(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary">
                <option value="info">Informação</option>
                <option value="alert">Alerta</option>
                <option value="success">Sucesso</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Título</label>
              <Input placeholder="Título" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Mensagem</label>
              <Textarea placeholder="Digite a mensagem" value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotificationModalOpen(false)}>Cancelar</Button>
            <Button onClick={sendNotification}><Send className="h-4 w-4 mr-1" /> Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
