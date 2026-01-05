import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  RefreshCw,
  Plus,
  Timer,
  User,
  Phone,
  Mail,
  Eye,
  Tractor,
  ShoppingCart,
  Headphones,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Order {
  id: string;
  product_id: string;
  user_id: string;
  quantity: number;
  location: string;
  status: string;
  total_price: number;
  created_at: string;
}

interface DeliveryTrack {
  id: string;
  order_id: string;
  assistant_id: string;
  assigned_at: string;
  pickup_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  status: string;
  notes: string | null;
  total_duration_minutes: number | null;
}

interface Product {
  id: string;
  product_type: string;
  farmer_name: string;
  contact: string;
  user_id: string;
  quantity: number;
  price: number;
  province_id: string;
  municipality_id: string;
}

interface UserInfo {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  user_type?: string | null;
  avatar_url?: string | null;
  province_id?: string;
  municipality_id?: string;
}

interface DeliveryTrackingProps {
  currentUserId: string;
}

const STATUS_OPTIONS = [
  { value: "assigned", label: "Atribuído", color: "bg-blue-100 text-blue-700", icon: Clock },
  { value: "pickup", label: "Coleta", color: "bg-amber-100 text-amber-700", icon: Package },
  { value: "in_transit", label: "Em Trânsito", color: "bg-purple-100 text-purple-700", icon: Truck },
  { value: "delivered", label: "Entregue", color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "cancelled", label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
];

const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ currentUserId }) => {
  const [deliveries, setDeliveries] = useState<DeliveryTrack[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryTrack | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDeliveryDetails, setSelectedDeliveryDetails] = useState<DeliveryTrack | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [deliveriesRes, ordersRes, productsRes, usersRes] = await Promise.all([
        supabase.from("delivery_tracking").select("*").order("assigned_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id, product_type, farmer_name, contact, user_id, quantity, price, province_id, municipality_id"),
        supabase.from("users").select("id, full_name, email, phone, user_type, avatar_url, province_id, municipality_id"),
      ]);

      if (deliveriesRes.data) setDeliveries(deliveriesRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch (error) {
      console.error("Error fetching delivery data:", error);
      toast.error("Erro ao carregar dados de entregas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignDelivery = async () => {
    if (!selectedOrderId) {
      toast.error("Selecione um pedido");
      return;
    }

    try {
      const { error } = await supabase.from("delivery_tracking").insert({
        order_id: selectedOrderId,
        assistant_id: currentUserId,
        notes: notes || null,
        status: "assigned",
      });

      if (error) throw error;

      toast.success("Entrega atribuída com sucesso!");
      setAssignDialogOpen(false);
      setSelectedOrderId("");
      setNotes("");
      fetchData();
    } catch (error) {
      console.error("Error assigning delivery:", error);
      toast.error("Erro ao atribuir entrega");
    }
  };

  const updateDeliveryStatus = async () => {
    if (!selectedDelivery || !newStatus) return;

    try {
      const updateData: Partial<DeliveryTrack> = { status: newStatus };

      // Set timestamps based on status
      if (newStatus === "pickup" && !selectedDelivery.pickup_at) {
        updateData.pickup_at = new Date().toISOString();
      } else if (newStatus === "in_transit" && !selectedDelivery.in_transit_at) {
        updateData.in_transit_at = new Date().toISOString();
      } else if (newStatus === "delivered" && !selectedDelivery.delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("delivery_tracking")
        .update(updateData)
        .eq("id", selectedDelivery.id);

      if (error) throw error;

      toast.success("Status atualizado!");
      setUpdateDialogOpen(false);
      setSelectedDelivery(null);
      setNewStatus("");
      fetchData();
    } catch (error) {
      console.error("Error updating delivery:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    if (!statusOption) return <Badge>{status}</Badge>;
    const Icon = statusOption.icon;
    return (
      <Badge className={`${statusOption.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusOption.label}
      </Badge>
    );
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getOrderInfo = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { product: "-", buyer: "-", location: "-", quantity: 0, totalPrice: 0 };

    const product = products.find((p) => p.id === order.product_id);
    const buyer = users.find((u) => u.id === order.user_id);

    return {
      product: product?.product_type || "-",
      buyer: buyer?.full_name || "-",
      location: order.location,
      quantity: order.quantity,
      totalPrice: order.total_price,
    };
  };

  const getAssistantName = (assistantId: string) => {
    const assistant = users.find((u) => u.id === assistantId);
    return assistant?.full_name || "Assistente";
  };

  // Get full details for a delivery
  const getDeliveryFullDetails = (delivery: DeliveryTrack) => {
    const order = orders.find((o) => o.id === delivery.order_id);
    const product = order ? products.find((p) => p.id === order.product_id) : null;
    const buyer = order ? users.find((u) => u.id === order.user_id) : null;
    const farmer = product ? users.find((u) => u.id === product.user_id) : null;
    const assistant = users.find((u) => u.id === delivery.assistant_id);

    return {
      order,
      product,
      buyer,
      farmer,
      assistant,
    };
  };

  // Filter orders that don't have active deliveries
  const availableOrders = orders.filter(
    (order) => !deliveries.find((d) => d.order_id === order.id && d.status !== "cancelled" && d.status !== "delivered")
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Controle de Entregas</h2>
                <p className="text-sm text-muted-foreground">
                  Gerencie e acompanhe entregas em andamento
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
              </Button>
              <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Entrega
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {deliveries.filter((d) => d.status === "assigned").length}
                </p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {deliveries.filter((d) => d.status === "in_transit").length}
                </p>
                <p className="text-xs text-muted-foreground">Em Trânsito</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {deliveries.filter((d) => d.status === "delivered").length}
                </p>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Timer className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatDuration(
                    deliveries
                      .filter((d) => d.total_duration_minutes)
                      .reduce((acc, d) => acc + (d.total_duration_minutes || 0), 0) /
                      (deliveries.filter((d) => d.total_duration_minutes).length || 1)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Entregas ({deliveries.length})
          </CardTitle>
          <CardDescription>
            Lista de todas as entregas atribuídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Nenhuma entrega registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Assistente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => {
                    const orderInfo = getOrderInfo(delivery.order_id);
                    return (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-medium">{orderInfo.product}</TableCell>
                        <TableCell>{orderInfo.buyer}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {orderInfo.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {getAssistantName(delivery.assistant_id)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                        <TableCell>{formatDuration(delivery.total_duration_minutes)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(delivery.assigned_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedDeliveryDetails(delivery);
                                setDetailsDialogOpen(true);
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {delivery.status !== "delivered" && delivery.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDelivery(delivery);
                                  setNewStatus(delivery.status);
                                  setUpdateDialogOpen(true);
                                }}
                              >
                                Atualizar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Delivery Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Atribuir Nova Entrega
            </DialogTitle>
            <DialogDescription>
              Selecione um pedido para acompanhar a entrega
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pedido</label>
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pedido" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrders.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum pedido disponível
                    </SelectItem>
                  ) : (
                    availableOrders.map((order) => {
                      const product = products.find((p) => p.id === order.product_id);
                      const buyer = users.find((u) => u.id === order.user_id);
                      return (
                        <SelectItem key={order.id} value={order.id}>
                          {product?.product_type || "Produto"} - {buyer?.full_name || "Cliente"} ({order.quantity}kg)
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notas (opcional)</label>
              <Textarea
                placeholder="Adicione notas sobre esta entrega..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={assignDelivery} disabled={!selectedOrderId}>
              <Truck className="h-4 w-4 mr-1" /> Atribuir Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" /> Atualizar Status
            </DialogTitle>
            <DialogDescription>
              Atualize o status desta entrega
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Novo Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateDeliveryStatus} disabled={!newStatus}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Detalhes da Entrega
            </DialogTitle>
            <DialogDescription>
              Informações completas dos participantes da entrega
            </DialogDescription>
          </DialogHeader>

          {selectedDeliveryDetails && (() => {
            const details = getDeliveryFullDetails(selectedDeliveryDetails);
            return (
              <div className="space-y-6">
                {/* Status and Order Info */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Produto</p>
                    <p className="font-semibold text-lg">{details.product?.product_type || "-"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {details.order?.quantity}kg • Kz {details.order?.total_price?.toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedDeliveryDetails.status)}
                </div>

                {/* Delivery Location */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Local de Entrega</h4>
                  </div>
                  <p className="text-muted-foreground">{details.order?.location || "-"}</p>
                </div>

                {/* Participants Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Assistant Card */}
                  <Card className="border-2 border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                        <Headphones className="h-4 w-4" /> Assistente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={details.assistant?.avatar_url || ""} />
                          <AvatarFallback className="bg-blue-200 text-blue-700">
                            {details.assistant?.full_name?.charAt(0) || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{details.assistant?.full_name || "-"}</p>
                          <Badge variant="secondary" className="text-xs">{details.assistant?.user_type || "Assistente"}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {details.assistant?.phone && (
                          <a href={`tel:${details.assistant.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                            <Phone className="h-3 w-3" />
                            {details.assistant.phone}
                          </a>
                        )}
                        {details.assistant?.email && (
                          <a href={`mailto:${details.assistant.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                            <Mail className="h-3 w-3" />
                            {details.assistant.email}
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Farmer Card */}
                  <Card className="border-2 border-green-200 bg-green-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                        <Tractor className="h-4 w-4" /> Agricultor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={details.farmer?.avatar_url || ""} />
                          <AvatarFallback className="bg-green-200 text-green-700">
                            {details.farmer?.full_name?.charAt(0) || details.product?.farmer_name?.charAt(0) || "F"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{details.farmer?.full_name || details.product?.farmer_name || "-"}</p>
                          <Badge variant="secondary" className="text-xs">Agricultor</Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {(details.farmer?.phone || details.product?.contact) && (
                          <a href={`tel:${details.farmer?.phone || details.product?.contact}`} className="flex items-center gap-2 text-green-600 hover:underline">
                            <Phone className="h-3 w-3" />
                            {details.farmer?.phone || details.product?.contact}
                          </a>
                        )}
                        {details.farmer?.email && (
                          <a href={`mailto:${details.farmer.email}`} className="flex items-center gap-2 text-green-600 hover:underline">
                            <Mail className="h-3 w-3" />
                            {details.farmer.email}
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Buyer Card */}
                  <Card className="border-2 border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                        <ShoppingCart className="h-4 w-4" /> Comprador
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={details.buyer?.avatar_url || ""} />
                          <AvatarFallback className="bg-amber-200 text-amber-700">
                            {details.buyer?.full_name?.charAt(0) || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{details.buyer?.full_name || "-"}</p>
                          <Badge variant="secondary" className="text-xs">{details.buyer?.user_type || "Comprador"}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {details.buyer?.phone && (
                          <a href={`tel:${details.buyer.phone}`} className="flex items-center gap-2 text-amber-600 hover:underline">
                            <Phone className="h-3 w-3" />
                            {details.buyer.phone}
                          </a>
                        )}
                        {details.buyer?.email && (
                          <a href={`mailto:${details.buyer.email}`} className="flex items-center gap-2 text-amber-600 hover:underline">
                            <Mail className="h-3 w-3" />
                            {details.buyer.email}
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Linha do Tempo
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${selectedDeliveryDetails.assigned_at ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium">Atribuído</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedDeliveryDetails.assigned_at 
                            ? new Date(selectedDeliveryDetails.assigned_at).toLocaleString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${selectedDeliveryDetails.pickup_at ? 'bg-amber-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium">Coleta</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedDeliveryDetails.pickup_at 
                            ? new Date(selectedDeliveryDetails.pickup_at).toLocaleString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${selectedDeliveryDetails.in_transit_at ? 'bg-purple-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium">Em Trânsito</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedDeliveryDetails.in_transit_at 
                            ? new Date(selectedDeliveryDetails.in_transit_at).toLocaleString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${selectedDeliveryDetails.delivered_at ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium">Entregue</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedDeliveryDetails.delivered_at 
                            ? new Date(selectedDeliveryDetails.delivered_at).toLocaleString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {selectedDeliveryDetails.total_duration_minutes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Tempo total: <span className="font-semibold text-foreground">{formatDuration(selectedDeliveryDetails.total_duration_minutes)}</span></p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedDeliveryDetails.notes && (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2">Notas</h4>
                    <p className="text-sm text-muted-foreground">{selectedDeliveryDetails.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
            {selectedDeliveryDetails && selectedDeliveryDetails.status !== "delivered" && selectedDeliveryDetails.status !== "cancelled" && (
              <Button onClick={() => {
                setSelectedDelivery(selectedDeliveryDetails);
                setNewStatus(selectedDeliveryDetails.status);
                setDetailsDialogOpen(false);
                setUpdateDialogOpen(true);
              }}>
                Atualizar Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryTracking;
