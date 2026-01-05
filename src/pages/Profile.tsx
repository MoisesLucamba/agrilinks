import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  User, Edit, Package, MapPin, Phone, Mail, Calendar, BarChart3, 
  Settings, LogOut, Trash2, Eye, Camera, CheckCircle, Share2, Star, Users, ClipboardList, Bell, ShoppingCart, Search, BadgeCheck, Globe 
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'

interface UserProduct {
  id: string
  product_type: string
  quantity: number
  harvest_date: string
  price: number
  province_id: string
  municipality_id: string
  status: 'active' | 'inactive' | 'removed'
  created_at: string
  views?: number
  interests?: number
}

interface FichaRecebimento {
  id: string
  nomeFicha: string
  produto: string
  qualidade: string
  embalagem: string
  locaisEntrega?: string[]
  telefone: string
  created_at: string
}

interface ReceivedOrder {
  id: string
  product_id: string
  user_id: string
  quantity: number
  location: string
  status: string
  created_at: string
  product?: {
    product_type: string
    price: number
  }
  buyer?: {
    full_name: string
    phone: string
  }
}

interface SourcingRequest {
  id: string
  product_name: string
  quantity: number
  delivery_date: string
  description: string | null
  status: string
  admin_notes: string | null
  created_at: string
}

const Profile = () => {
  const { user, userProfile, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [userProducts, setUserProducts] = useState<UserProduct[]>([])
  const [fichasRecebimento, setFichasRecebimento] = useState<FichaRecebimento[]>([])
  const [receivedOrders, setReceivedOrders] = useState<ReceivedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [agentStats, setAgentStats] = useState<{ totalReferrals: number; totalPoints: number; recentReferrals: any[] } | null>(null)
  // Real stats from database
  const [buyerStats, setBuyerStats] = useState<{ completedOrders: number; favoriteProducts: number }>({ completedOrders: 0, favoriteProducts: 0 })
  const [productStats, setProductStats] = useState<{ [productId: string]: { likes: number; comments: number } }>({})

  const [provinceName, setProvinceName] = useState('')
  const [municipalityName, setMunicipalityName] = useState('')
  const [profileData, setProfileData] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || user?.email || '',
    province_id: userProfile?.province_id || '',
    municipality_id: userProfile?.municipality_id || '',
  })

  // Buscar produtos do agricultor com estatísticas reais
  const fetchUserProducts = async () => {
    try {
      const { data, error } = await supabase.from('products')
        .select('*').eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      
      // Buscar estatísticas reais de likes e comentários para cada produto
      const statsMap: { [productId: string]: { likes: number; comments: number } } = {}
      
      for (const product of (data || [])) {
        const { count: likesCount } = await supabase
          .from('product_likes')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id)
        
        const { count: commentsCount } = await supabase
          .from('product_comments')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id)
        
        statsMap[product.id] = {
          likes: likesCount || 0,
          comments: commentsCount || 0
        }
      }
      
      setProductStats(statsMap)
      
      const productsWithStats = (data || []).map(product => ({
        ...product,
        status: product.status as 'active' | 'inactive' | 'removed',
        views: statsMap[product.id]?.comments || 0,
        interests: statsMap[product.id]?.likes || 0
      }))
      setUserProducts(productsWithStats)
    } catch (error) { console.error(error) }
  }

  // Buscar fichas de recebimento para compradores
  const fetchFichasRecebimento = async () => {
    try {
      const { data, error } = await supabase.from('fichas_recebimento' as any)
        .select('*').eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setFichasRecebimento((data || []) as any)
    } catch (error) { console.error(error) }
  }

  // Buscar estatísticas de indicações para agentes
  const fetchAgentStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_agent_referral_stats', { agent_user_id: user?.id });
      if (error) throw error;
      if (data && data.length > 0) {
        const stats = data[0];
        setAgentStats({
          totalReferrals: Number(stats.total_referrals) || 0,
          totalPoints: Number(stats.total_points) || 0,
          recentReferrals: Array.isArray(stats.recent_referrals) ? stats.recent_referrals : []
        });
      }
    } catch (error) { 
      console.error('Erro ao buscar stats de agente:', error);
    }
  };

  // Buscar pedidos recebidos (pre_orders) dos produtos do agricultor/agente
  const fetchReceivedOrders = async () => {
    try {
      // Primeiro buscar os IDs dos produtos do usuário
      const { data: userProductIds, error: prodError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user?.id)
      
      if (prodError) throw prodError
      
      if (!userProductIds || userProductIds.length === 0) {
        setReceivedOrders([])
        return
      }

      const productIds = userProductIds.map(p => p.id)

      // Buscar pre_orders para esses produtos
      const { data: orders, error: ordersError } = await supabase
        .from('pre_orders')
        .select(`
          id,
          product_id,
          user_id,
          quantity,
          location,
          status,
          created_at
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Buscar detalhes dos produtos e compradores
      const ordersWithDetails = await Promise.all((orders || []).map(async (order) => {
        // Buscar produto
        const { data: product } = await supabase
          .from('products')
          .select('product_type, price')
          .eq('id', order.product_id)
          .single()

        // Buscar comprador
        const { data: buyer } = await supabase
          .from('users')
          .select('full_name, phone')
          .eq('id', order.user_id)
          .single()

        return {
          ...order,
          product: product || undefined,
          buyer: buyer || undefined
        } as ReceivedOrder
      }))

      setReceivedOrders(ordersWithDetails)
    } catch (error) {
      console.error('Erro ao buscar pedidos recebidos:', error)
    }
  }

  // Sourcing requests state and form
  const [sourcingRequests, setSourcingRequests] = useState<SourcingRequest[]>([])
  const [showSourcingForm, setShowSourcingForm] = useState(false)
  const [sourcingForm, setSourcingForm] = useState({
    product_name: '',
    quantity: '',
    delivery_date: '',
    description: ''
  })
  const [submittingSourcing, setSubmittingSourcing] = useState(false)

  // Fetch sourcing requests for buyers
  const fetchSourcingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('sourcing_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setSourcingRequests(data || [])
    } catch (error) {
      console.error('Erro ao buscar pedidos de sourcing:', error)
    }
  }

  // Submit sourcing request
  const submitSourcingRequest = async () => {
    if (!user || !sourcingForm.product_name || !sourcingForm.quantity || !sourcingForm.delivery_date) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }
    setSubmittingSourcing(true)
    try {
      const { error } = await supabase.from('sourcing_requests').insert({
        user_id: user.id,
        product_name: sourcingForm.product_name,
        quantity: parseFloat(sourcingForm.quantity),
        delivery_date: sourcingForm.delivery_date,
        description: sourcingForm.description || null
      })
      if (error) throw error
      
      // Notificar admins
      await supabase.rpc('create_admin_notifications', {
        p_type: 'sourcing',
        p_title: 'Novo Pedido de Sourcing',
        p_message: `Comprador solicitou: ${sourcingForm.quantity}kg de ${sourcingForm.product_name}`,
        p_metadata: { user_id: user.id, product_name: sourcingForm.product_name }
      })

      toast({ title: t('sourcing.requestSent'), description: t('sourcing.requestSentMessage') })
      setSourcingForm({ product_name: '', quantity: '', delivery_date: '', description: '' })
      setShowSourcingForm(false)
      fetchSourcingRequests()
    } catch (error: any) {
      console.error('Erro ao enviar pedido:', error)
      toast({ title: 'Erro', description: error.message || 'Erro ao enviar pedido', variant: 'destructive' })
    } finally {
      setSubmittingSourcing(false)
    }
  }

  // Share agent code
  const shareAgentCode = async () => {
    const agentCode = (userProfile as any)?.agent_code
    if (!agentCode) return
    
    const shareMessage = `${t('profile.shareMessage')}: ${agentCode}\n\nCadastrar: ${window.location.origin}/cadastro`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AgriLink - Código de Agente',
          text: shareMessage,
        })
        toast({ title: t('profile.codeShared') })
      } catch (error) {
        // User cancelled or error
        copyAgentCode()
      }
    } else {
      copyAgentCode()
    }
  }

  const copyAgentCode = () => {
    const agentCode = (userProfile as any)?.agent_code
    if (!agentCode) return
    navigator.clipboard.writeText(agentCode)
    toast({ title: t('profile.codeCopied') })
  }

  // Buscar estatísticas reais do comprador
  const fetchBuyerStats = async () => {
    try {
      // Compras concluídas (pre_orders com status completed/accepted)
      const { count: completedCount } = await supabase
        .from('pre_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .in('status', ['completed', 'accepted'])
      
      // Produtos favoritados (likes)
      const { count: likesCount } = await supabase
        .from('product_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
      
      setBuyerStats({
        completedOrders: completedCount || 0,
        favoriteProducts: likesCount || 0
      })
    } catch (error) {
      console.error('Erro ao buscar stats de comprador:', error)
    }
  }

  useEffect(() => {
    if (!user) return
    if (userProfile?.user_type === 'comprador') {
      fetchFichasRecebimento()
      fetchSourcingRequests()
      fetchBuyerStats()
    } else {
      fetchUserProducts()
      fetchReceivedOrders()
    }
    if (userProfile?.user_type === 'agente') {
      fetchAgentStats()
    }
    setLoading(false)
  }, [user, userProfile])

  const fetchProvinceAndMunicipality = async (province_id: string, municipality_id: string) => {
    try {
      // Usar os IDs diretamente já que não temos tabelas de províncias/municípios
      setProvinceName(province_id)
      setMunicipalityName(municipality_id)
    } catch (error) { console.error('Erro ao buscar nomes de localizações:', error) }
  }

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        email: userProfile.email || user?.email || '',
        province_id: userProfile.province_id || '',
        municipality_id: userProfile.municipality_id || '',
      })
      fetchProvinceAndMunicipality(userProfile.province_id, userProfile.municipality_id)
    }
  }, [userProfile, user])

  const updateProfile = async () => {
    if (!user) return
    try {
      const { error } = await supabase.from('users')
        .update({ ...profileData, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
      alert('Perfil atualizado com sucesso!')
      setEditMode(false)
    } catch (error: any) { console.error('Erro ao atualizar perfil:', error); alert('Erro: ' + (error.message || 'desconhecido')) }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setAvatarLoading(true)
      const file = event.target.files?.[0]; if (!file) return
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}/avatar.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', user?.id)
      if (updateError) throw updateError
      setProfileData(prev => ({ ...prev }))
    } catch (error: any) { console.error('Erro upload avatar:', error); alert('Erro: ' + (error.message || 'desconhecido')) }
    finally { setAvatarLoading(false) }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Deseja remover este produto?')) return
    try {
      const { error } = await supabase.from('products').update({ status: 'removed' }).eq('id', productId)
      if (error) throw error
      setUserProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'removed' } : p))
    } catch (error) { console.error('Error deleting product:', error) }
  }

  // Funções para gerenciar pedidos
  const acceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('pre_orders')
        .update({ status: 'accepted' })
        .eq('id', orderId)
      if (error) throw error
      setReceivedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'accepted' } : o))
      alert('Pedido aceito com sucesso!')
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error)
      alert('Erro ao aceitar pedido')
    }
  }

  const rejectOrder = async (orderId: string) => {
    if (!confirm('Deseja rejeitar este pedido?')) return
    try {
      const { error } = await supabase
        .from('pre_orders')
        .update({ status: 'rejected' })
        .eq('id', orderId)
      if (error) throw error
      setReceivedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o))
      alert('Pedido rejeitado')
    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error)
      alert('Erro ao rejeitar pedido')
    }
  }

  const contactBuyer = async (order: ReceivedOrder) => {
    if (!user || !order.user_id) return
    try {
      // Verificar se já existe conversa
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user_id.eq.${user.id},peer_user_id.eq.${order.user_id}),and(user_id.eq.${order.user_id},peer_user_id.eq.${user.id})`)
        .limit(1)
      
      if (existingConv && existingConv.length > 0) {
        navigate(`/messages/${existingConv[0].id}`)
        return
      }
      // Criar nova conversa
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          peer_user_id: order.user_id,
          title: order.buyer?.full_name || 'Comprador',
          last_timestamp: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (error) throw error
      navigate(`/messages/${newConv.id}`)
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error)
      alert('Erro ao contactar comprador')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = { 'active': 'default', 'inactive': 'secondary', 'removed': 'destructive' } as const
    const labels = { 'active': 'Ativo', 'inactive': 'Inativo', 'removed': 'Removido' }
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{labels[status as keyof typeof labels] || status}</Badge>
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR')

  const activeProducts = userProducts.filter(p => p.status === 'active').length
  const totalComments = userProducts.reduce((sum, p) => sum + (productStats[p.id]?.comments || 0), 0)
  const totalLikes = userProducts.reduce((sum, p) => sum + (productStats[p.id]?.likes || 0), 0)
  // Estatísticas reais de comprador vindas do banco de dados
  const totalFichas = fichasRecebimento.length
  const totalComprasConcluidas = buyerStats.completedOrders
  const totalProdutosFavoritos = buyerStats.favoriteProducts

  if (loading) return (
    <div className="pb-20 bg-background min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground text-sm">{t('profile.loadingProfile')}</p>
      </div>
    </div>
  )

  return (
    <div className="pb-20 bg-background min-h-screen safe-bottom">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-bold text-primary">{t('profile.title')}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-destructive" onClick={() => logout()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
        {/* Coluna esquerda: perfil e estatísticas */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <Card className="bg-card border border-border/50 rounded-2xl shadow-soft">
            <CardHeader className="text-center pb-2">
              <div className="relative mx-auto mb-4">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-primary/20">
                  <AvatarImage src={userProfile?.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xl font-bold">{profileData.full_name.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={avatarLoading} onClick={() => document.getElementById('avatar-upload')?.click()}>
                    {avatarLoading ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div> : <Camera className="h-3 w-3" />}
                  </Button>
                  <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} className="hidden"/>
                </div>
              </div>
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                {profileData.full_name} 
                {(userProfile as any)?.verified && (
                  <BadgeCheck className="h-4 w-4 text-primary" />
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{userProfile?.user_type}</p>
            </CardHeader>
            <CardContent>
              {!editMode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground"/><span>{profileData.email}</span></div>
                  <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground"/><span>{profileData.phone}</span></div>
                  <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-muted-foreground"/><span>{provinceName}, {municipalityName}</span></div>
                  
                  {/* Botões de Ação Rápida do Agente */}
                  {userProfile?.user_type === 'agente' && (
                    <div className="flex gap-2 mt-4">
                      <Button variant="secondary" size="sm" onClick={copyAgentCode}><ClipboardList className="h-4 w-4 mr-2"/>{t('profile.copyCode')}</Button>
                      <Button variant="outline" size="sm" onClick={shareAgentCode}><Share2 className="h-4 w-4 mr-2"/>{t('profile.shareCode')}</Button>
                    </div>
                  )}
                  
                  {/* Código do Agente */}
                  {userProfile?.user_type === 'agente' && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">{t('profile.agentCode')}</p>
                      <p className="text-lg font-mono font-bold text-primary">{(userProfile as any).agent_code || t('profile.generating')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('profile.shareMessage')}</p>
                    </div>
                  )}
                  
                  <Button onClick={() => setEditMode(true)} className="w-full mt-4" variant="outline"><Edit className="h-4 w-4 mr-2"/>{t('profile.editProfile')}</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2"><Label>{t('profile.fullName')}</Label><Input value={profileData.full_name} onChange={e=>setProfileData(prev=>({...prev, full_name:e.target.value}))}/></div>
                  <div className="space-y-2"><Label>{t('profile.phone')}</Label><Input value={profileData.phone} onChange={e=>setProfileData(prev=>({...prev, phone:e.target.value}))}/></div>
                  <div className="space-y-2"><Label>{t('profile.email')}</Label><Input type="email" value={profileData.email} onChange={e=>setProfileData(prev=>({...prev, email:e.target.value}))}/></div>
                  <div className="flex gap-2"><Button onClick={updateProfile} className="flex-1">{t('common.save')}</Button><Button variant="outline" onClick={()=>setEditMode(false)} className="flex-1">{t('common.cancel')}</Button></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas */}
          {userProfile?.user_type === 'agente' ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Card className="text-center"><CardContent className="pt-4"><div className="text-2xl font-bold text-primary">{agentStats?.totalReferrals || 0}</div><p className="text-xs text-muted-foreground">{t('profile.usersReferred')}</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><div className="text-2xl font-bold text-accent">{agentStats?.totalPoints || 0}</div><p className="text-xs text-muted-foreground">{t('profile.pointsEarned')}</p></CardContent></Card>
            </div>
          ) : userProfile?.user_type === 'comprador' ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <Card className="text-center"><CardContent className="pt-4"><ClipboardList className="h-6 w-6 mx-auto mb-1 text-primary"/><div className="text-2xl font-bold text-primary">{totalFichas}</div><p className="text-xs text-muted-foreground">{t('profile.fichasCreated')}</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><ShoppingCart className="h-6 w-6 mx-auto mb-1 text-green-600"/><div className="text-2xl font-bold text-green-600">{totalComprasConcluidas}</div><p className="text-xs text-muted-foreground">{t('profile.purchasesCompleted')}</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><Star className="h-6 w-6 mx-auto mb-1 text-yellow-500"/><div className="text-2xl font-bold text-yellow-500">{totalProdutosFavoritos}</div><p className="text-xs text-muted-foreground">{t('profile.favoriteProducts')}</p></CardContent></Card>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <Card className="text-center"><CardContent className="pt-4"><Package className="h-6 w-6 mx-auto mb-1 text-primary"/><div className="text-2xl font-bold text-primary">{activeProducts}</div><p className="text-xs text-muted-foreground">{t('profile.activeProducts')}</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><Eye className="h-6 w-6 mx-auto mb-1 text-blue-500"/><div className="text-2xl font-bold text-blue-500">{totalComments}</div><p className="text-xs text-muted-foreground">{t('profile.comments')}</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><Star className="h-6 w-6 mx-auto mb-1 text-red-500"/><div className="text-2xl font-bold text-red-500">{totalLikes}</div><p className="text-xs text-muted-foreground">{t('profile.likes')}</p></CardContent></Card>
            </div>
          )}
        </div>

        {/* Coluna direita: produtos / fichas / estatísticas */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className={`grid w-full ${userProfile?.user_type === 'agente' ? 'grid-cols-4' : userProfile?.user_type === 'comprador' ? 'grid-cols-3' : 'grid-cols-3'}`}>
              <TabsTrigger value="products" className="flex items-center justify-center gap-1" title={userProfile?.user_type==='comprador'? t('profile.myFichas') : t('profile.myProducts')}>
                {userProfile?.user_type==='comprador' ? <ClipboardList className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </TabsTrigger>
              {userProfile?.user_type === 'comprador' && (
                <TabsTrigger value="sourcing" className="flex items-center justify-center gap-1" title={t('profile.sourcing')}>
                  <Search className="h-5 w-5" />
                </TabsTrigger>
              )}
              {(userProfile?.user_type === 'agricultor' || userProfile?.user_type === 'agente') && (
                <TabsTrigger value="orders" className="flex items-center justify-center gap-1 relative" title={t('profile.receivedOrders')}>
                  <ShoppingCart className="h-5 w-5" />
                  {receivedOrders.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{receivedOrders.length}</Badge>
                  )}
                </TabsTrigger>
              )}
              {userProfile?.user_type === 'agente' && <TabsTrigger value="referrals" className="flex items-center justify-center" title={t('profile.myReferrals')}><Users className="h-5 w-5" /></TabsTrigger>}
              <TabsTrigger value="statistics" className="flex items-center justify-center" title={t('profile.statistics')}><BarChart3 className="h-5 w-5" /></TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4 mt-4">
              {userProfile?.user_type==='comprador' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fichasRecebimento.map(ficha=>(
                    <Card key={ficha.id} className="shadow-soft border-card-border">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-primary">{ficha.nomeFicha}</h3>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title={t('profile.editFicha')}><Edit className="h-4 w-4 text-blue-500"/></Button>
                            <Button variant="ghost" size="icon" title={t('profile.notifications')}><Bell className="h-4 w-4 text-yellow-500"/></Button>
                            <Button variant="ghost" size="icon" title={t('profile.removeFicha')}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground"/>{t('profile.product')}: <span className="font-semibold">{ficha.produto}</span></p>
                          <p className="flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground"/>{t('profile.quality')}: <span className="font-semibold">{ficha.qualidade}</span></p>
                          <p className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-muted-foreground"/>{t('profile.packaging')}: <span className="font-semibold">{ficha.embalagem}</span></p>
                          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>{t('profile.deliveryLocations')}: <span className="font-semibold">{ficha.locaisEntrega?.length || 0}</span></p>
                          <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/>{t('profile.createdAt')}: <span className="font-semibold">{formatDate(ficha.created_at)}</span></p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {fichasRecebimento.length===0 && <p className="text-center text-muted-foreground py-8">{t('profile.noFichasCreated')}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userProducts.map(product=>(
                    <Card key={product.id} className="shadow-soft border-card-border">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2"><h3 className="font-bold text-lg text-primary">{product.product_type}</h3>{getStatusBadge(product.status)}</div>
                            <div className="text-sm text-muted-foreground"><span>{product.quantity.toLocaleString()} kg</span> • <span className="font-bold text-green-600">{product.price.toLocaleString()} Kz</span></div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title={t('profile.editProduct')}><Edit className="h-4 w-4 text-blue-500"/></Button>
                            <Button variant="ghost" size="icon" title={t('profile.viewStats')}><BarChart3 className="h-4 w-4 text-yellow-500"/></Button>
                            <Button variant="ghost" size="icon" title={t('profile.promoteShare')}><Share2 className="h-4 w-4 text-primary"/></Button>
                            {product.status !== 'removed' && <Button variant="ghost" size="icon" onClick={()=>deleteProduct(product.id)} title={t('profile.removeProduct')}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3"/>{t('profile.harvest')}: <span className="font-semibold">{formatDate(product.harvest_date)}</span></div>
                          <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3"/>{t('profile.location')}: <span className="font-semibold">{product.municipality_id}</span></div>
                          <div className="flex items-center gap-1 text-muted-foreground"><Eye className="h-3 w-3"/>{t('profile.comments')}: <span className="font-semibold">{productStats[product.id]?.comments || 0}</span></div>
                          <div className="flex items-center gap-1 text-muted-foreground"><Star className="h-3 w-3"/>{t('profile.likes')}: <span className="font-semibold">{productStats[product.id]?.likes || 0}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userProducts.length===0 && <p className="text-center text-muted-foreground py-8">{t('profile.noProductsPublished')}</p>}
                </div>
              )}
            </TabsContent>

            {/* Aba de Sourcing (só para compradores) */}
            {userProfile?.user_type === 'comprador' && (
              <TabsContent value="sourcing" className="space-y-4 mt-4">
                <Card className="shadow-soft border-card-border">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Search className="h-5 w-5"/>{t('sourcing.title')}</span>
                      <Button size="sm" onClick={() => setShowSourcingForm(!showSourcingForm)}>{showSourcingForm ? t('common.cancel') : t('sourcing.newRequest')}</Button>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{t('sourcing.subtitle')}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {showSourcingForm && (
                      <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t('sourcing.productName')} *</Label>
                            <Input value={sourcingForm.product_name} onChange={e => setSourcingForm(p => ({...p, product_name: e.target.value}))} placeholder={t('sourcing.productNamePlaceholder')} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('sourcing.quantity')} *</Label>
                            <Input type="number" value={sourcingForm.quantity} onChange={e => setSourcingForm(p => ({...p, quantity: e.target.value}))} placeholder={t('sourcing.quantityPlaceholder')} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('sourcing.deliveryDate')} *</Label>
                            <Input type="date" value={sourcingForm.delivery_date} onChange={e => setSourcingForm(p => ({...p, delivery_date: e.target.value}))} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('sourcing.description')}</Label>
                            <Textarea value={sourcingForm.description} onChange={e => setSourcingForm(p => ({...p, description: e.target.value}))} placeholder={t('sourcing.descriptionPlaceholder')} rows={4} />
                          </div>
                        </div>
                        <Button onClick={submitSourcingRequest} disabled={submittingSourcing} className="w-full">{submittingSourcing ? t('common.processing') : t('sourcing.submitRequest')}</Button>
                      </div>
                    )}
                    <div className="space-y-3">
                      <h4 className="font-semibold">{t('sourcing.myRequests')}</h4>
                      {sourcingRequests.length > 0 ? sourcingRequests.map(req => (
                        <Card key={req.id} className="border">
                          <CardContent className="p-3 flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{req.product_name} - {req.quantity}kg</p>
                              <p className="text-sm text-muted-foreground">{t('sourcing.deliveryDate')}: {new Date(req.delivery_date).toLocaleDateString()}</p>
                            </div>
                            <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'processing' ? 'default' : 'outline'}>{t(`sourcing.status.${req.status}`)}</Badge>
                          </CardContent>
                        </Card>
                      )) : <p className="text-center text-muted-foreground py-4">{t('sourcing.noRequests')}</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Aba de Pedidos Recebidos (só para agricultores e agentes) */}
            {(userProfile?.user_type === 'agricultor' || userProfile?.user_type === 'agente') && (
              <TabsContent value="orders" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {receivedOrders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {receivedOrders.map((order) => (
                        <Card key={order.id} className="shadow-soft border-card-border overflow-hidden">
                          <div className={`h-1 ${order.status === 'pending' ? 'bg-yellow-500' : order.status === 'accepted' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h3 className="font-bold text-lg text-primary">{order.product?.product_type || t('profile.product')}</h3>
                                <Badge variant={order.status === 'pending' ? 'secondary' : order.status === 'accepted' ? 'default' : 'destructive'}>
                                  {order.status === 'pending' ? t('profile.pending') : order.status === 'accepted' ? t('profile.accepted') : t('profile.rejected')}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">{order.quantity.toLocaleString()} kg</p>
                                <p className="text-xs text-muted-foreground">
                                  {((order.product?.price || 0) * order.quantity).toLocaleString()} Kz
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{t('profile.buyer')}: <span className="font-semibold">{order.buyer?.full_name || 'User'}</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{order.buyer?.phone || t('profile.noPhone')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{t('profile.delivery')}: <span className="font-semibold">{order.location}</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{t('profile.date')}: <span className="font-semibold">{formatDate(order.created_at)}</span></span>
                              </div>
                            </div>

                            {order.status === 'pending' ? (
                              <div className="flex gap-2 pt-2">
                                <Button size="sm" className="flex-1" variant="default" onClick={() => acceptOrder(order.id)}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {t('profile.accept')}
                                </Button>
                                <Button size="sm" className="flex-1" variant="destructive" onClick={() => rejectOrder(order.id)}>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  {t('profile.reject')}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => contactBuyer(order)}>
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2 pt-2">
                                <Button size="sm" className="flex-1" variant="outline" onClick={() => contactBuyer(order)}>
                                  <Phone className="h-4 w-4 mr-1" />
                                  {t('profile.contact')}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">{t('profile.noOrdersReceived')}</p>
                      <p className="text-sm text-muted-foreground mt-2">{t('profile.ordersWillAppear')}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Aba de Indicações (só para agentes) */}
            {userProfile?.user_type === 'agente' && (
              <TabsContent value="referrals" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {agentStats && agentStats.recentReferrals && agentStats.recentReferrals.length > 0 ? (
                    <div className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="cursor-pointer">{t('profile.all')}</Badge>
                    <Badge variant="outline" className="cursor-pointer">{t('profile.farmers')}</Badge>
                    <Badge variant="outline" className="cursor-pointer">{t('profile.buyers')}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {agentStats.recentReferrals.map((referral: any, idx: number) => (
                        <Card key={idx} className="shadow-soft border-card-border">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <User className="h-6 w-6 text-primary"/>
                              <div className="space-y-1">
                                <h3 className="font-semibold">{referral.user_name}</h3>
                                <Badge variant="secondary" className="text-xs">{referral.user_type}</Badge>
                                <p className="text-xs text-muted-foreground">{formatDate(referral.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-xl font-bold text-green-600 flex items-center gap-1"><Star className="h-4 w-4 fill-green-600 text-green-600"/>+{referral.points}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50"/>
                      <p className="text-muted-foreground">{t('profile.noReferralsYet')}</p>
                      <p className="text-sm text-muted-foreground mt-2">{t('profile.shareToEarnPoints')}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            <TabsContent value="statistics" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/>{t('profile.performanceSummary')}</CardTitle></CardHeader>
                <CardContent>
                   {userProfile?.user_type==='agente' ? (
                    <div className="space-y-2">
                      <p className="flex justify-between"><span>{t('profile.totalReferrals')}:</span><span className="font-bold">{agentStats?.totalReferrals || 0}</span></p>
                      <p className="flex justify-between"><span>{t('profile.totalPoints')}:</span><span className="font-bold text-primary">{agentStats?.totalPoints || 0}</span></p>
                      <p className="text-sm text-muted-foreground mt-4">{t('profile.eachUserWorth')}</p>
                    </div>
                  ) : userProfile?.user_type==='comprador' ? (
                    <>
                      <p className="flex justify-between"><span>{t('profile.totalReceipts')}:</span><span className="font-bold">{totalFichas}</span></p>
                      <p className="flex justify-between"><span>{t('profile.purchasesSimulation')}:</span><span className="font-bold text-green-600">{totalComprasConcluidas}</span></p>
                      <p className="flex justify-between"><span>{t('profile.favoritesSimulation')}:</span><span className="font-bold text-red-500">{totalProdutosFavoritos}</span></p>
                    </>
                  ) : (
                    <>
                      <p className="flex justify-between"><span>{t('profile.totalProductsPublished')}:</span><span className="font-bold">{userProducts.length}</span></p>
                      <p className="flex justify-between"><span>{t('profile.activeProducts')}:</span><span className="font-bold text-primary">{activeProducts}</span></p>
                      <p className="flex justify-between"><span>{t('profile.totalComments')}:</span><span className="font-bold text-blue-500">{totalComments}</span></p>
                      <p className="flex justify-between"><span>{t('profile.totalLikes')}:</span><span className="font-bold text-red-500">{totalLikes}</span></p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de Definições */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('profile.settings')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Seletor de Idioma */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t('common.language') || 'Idioma'}
              </Label>
              <Select
                value={i18n.language}
                onValueChange={(value) => {
                  i18n.changeLanguage(value)
                  localStorage.setItem('agrilink_language', value)
                  toast({ title: t('common.success'), description: t('common.languageChanged') || 'Idioma alterado com sucesso!' })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇦🇴</span>
                      <span>Português</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇬🇧</span>
                      <span>English</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fr">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇫🇷</span>
                      <span>Français</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Profile
