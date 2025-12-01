import React, { useState, useEffect } from 'react'
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
import { 
  User, Edit, Package, MapPin, Phone, Mail, Calendar, BarChart3, 
  Settings, LogOut, Trash2, Eye, Camera, CheckCircle, Share2, Star, Users, ClipboardList, Bell, ShoppingCart 
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

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

const Profile = () => {
  const { user, userProfile, logout } = useAuth()
  const navigate = useNavigate()

  const [userProducts, setUserProducts] = useState<UserProduct[]>([])
  const [fichasRecebimento, setFichasRecebimento] = useState<FichaRecebimento[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [agentStats, setAgentStats] = useState<{ totalReferrals: number; totalPoints: number; recentReferrals: any[] } | null>(null)

  const [provinceName, setProvinceName] = useState('')
  const [municipalityName, setMunicipalityName] = useState('')
  const [profileData, setProfileData] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || user?.email || '',
    province_id: userProfile?.province_id || '',
    municipality_id: userProfile?.municipality_id || '',
  })

  // Buscar produtos do agricultor
  const fetchUserProducts = async () => {
    try {
      const { data, error } = await supabase.from('products')
        .select('*').eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const productsWithStats = (data || []).map(product => ({
        ...product,
        status: product.status as 'active' | 'inactive' | 'removed',
        views: Math.floor(Math.random() * 100),
        interests: Math.floor(Math.random() * 20)
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

  useEffect(() => {
    if (!user) return
    if (userProfile?.user_type === 'comprador') fetchFichasRecebimento()
    else fetchUserProducts()
    if (userProfile?.user_type === 'agente') {
      fetchUserProducts() // Agentes também podem publicar produtos
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

  const getStatusBadge = (status: string) => {
    const variants = { 'active': 'default', 'inactive': 'secondary', 'removed': 'destructive' } as const
    const labels = { 'active': 'Ativo', 'inactive': 'Inativo', 'removed': 'Removido' }
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{labels[status as keyof typeof labels] || status}</Badge>
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR')

  const activeProducts = userProducts.filter(p => p.status === 'active').length
  const totalViews = userProducts.reduce((sum, p) => sum + (p.views || 0), 0)
  const totalInterests = userProducts.reduce((sum, p) => sum + (p.interests || 0), 0)
  // Simulação de estatísticas de comprador
  const totalFichas = fichasRecebimento.length
  const totalComprasConcluidas = Math.floor(Math.random() * 15)
  const totalProdutosFavoritos = Math.floor(Math.random() * 25)

  if (loading) return <div className="pb-20 bg-background min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Meu Perfil</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}><Settings className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => logout()}><LogOut className="h-5 w-5" /></Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: perfil e estatísticas */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-soft border-card-border">
            <CardHeader className="text-center pb-2">
              <div className="relative mx-auto mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userProfile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">{profileData.full_name.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={avatarLoading} onClick={() => document.getElementById('avatar-upload')?.click()}>
                    {avatarLoading ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div> : <Camera className="h-3 w-3" />}
                  </Button>
                  <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} className="hidden"/>
                </div>
              </div>
              <CardTitle className="text-xl flex items-center justify-center gap-2">{profileData.full_name} <CheckCircle className="h-4 w-4 text-green-500" /></CardTitle>
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
                      <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText((userProfile as any).agent_code || '')}><ClipboardList className="h-4 w-4 mr-2"/>Copiar Código</Button>
                      <Button variant="outline" size="sm" onClick={() => alert('Função de Partilha')}><Share2 className="h-4 w-4 mr-2"/>Partilhar</Button>
                    </div>
                  )}
                  
                  {/* Código do Agente */}
                  {userProfile?.user_type === 'agente' && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Seu Código de Agente</p>
                      <p className="text-lg font-mono font-bold text-primary">{(userProfile as any).agent_code || 'Gerando...'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Compartilhe este código para indicar novos usuários</p>
                    </div>
                  )}
                  
                  <Button onClick={() => setEditMode(true)} className="w-full mt-4" variant="outline"><Edit className="h-4 w-4 mr-2"/>Editar Perfil</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Nome Completo</Label><Input value={profileData.full_name} onChange={e=>setProfileData(prev=>({...prev, full_name:e.target.value}))}/></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={profileData.phone} onChange={e=>setProfileData(prev=>({...prev, phone:e.target.value}))}/></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={profileData.email} onChange={e=>setProfileData(prev=>({...prev, email:e.target.value}))}/></div>
                  <div className="flex gap-2"><Button onClick={updateProfile} className="flex-1">Salvar</Button><Button variant="outline" onClick={()=>setEditMode(false)} className="flex-1">Cancelar</Button></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas */}
          {userProfile?.user_type === 'agente' ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Card className="text-center"><CardContent className="pt-4"><div className="text-2xl font-bold text-primary">{agentStats?.totalReferrals || 0}</div><p className="text-xs text-muted-foreground">Usuários Indicados</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><div className="text-2xl font-bold text-accent">{agentStats?.totalPoints || 0}</div><p className="text-xs text-muted-foreground">Pontos Ganhos</p></CardContent></Card>
            </div>
          ) : userProfile?.user_type === 'comprador' ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <Card className="text-center"><CardContent className="pt-4"><ClipboardList className="h-6 w-6 mx-auto mb-1 text-primary"/><div className="text-2xl font-bold text-primary">{totalFichas}</div><p className="text-xs text-muted-foreground">Fichas Criadas</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><ShoppingCart className="h-6 w-6 mx-auto mb-1 text-green-600"/><div className="text-2xl font-bold text-green-600">{totalComprasConcluidas}</div><p className="text-xs text-muted-foreground">Compras Concluídas</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><Star className="h-6 w-6 mx-auto mb-1 text-yellow-500"/><div className="text-2xl font-bold text-yellow-500">{totalProdutosFavoritos}</div><p className="text-xs text-muted-foreground">Produtos Favoritos</p></CardContent></Card>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <Card className="text-center"><CardContent className="pt-4"><Package className="h-6 w-6 mx-auto mb-1 text-primary"/><div className="text-2xl font-bold text-primary">{activeProducts}</div><p className="text-xs text-muted-foreground">Produtos Ativos</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><Eye className="h-6 w-6 mx-auto mb-1 text-blue-500"/><div className="text-2xl font-bold text-blue-500">{totalViews}</div><p className="text-xs text-muted-foreground">Visualizações</p></CardContent></Card>
              <Card className="text-center"><CardContent className="pt-4"><Star className="h-6 w-6 mx-auto mb-1 text-red-500"/><div className="text-2xl font-bold text-red-500">{totalInterests}</div><p className="text-xs text-muted-foreground">Interesses</p></CardContent></Card>
            </div>
          )}
        </div>

        {/* Coluna direita: produtos / fichas / estatísticas */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className={`grid w-full ${userProfile?.user_type === 'agente' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="products">{userProfile?.user_type==='comprador'?'Minhas Fichas':'Meus Produtos'}</TabsTrigger>
              {userProfile?.user_type === 'agente' && <TabsTrigger value="referrals">Minhas Indicações</TabsTrigger>}
              <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
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
                            <Button variant="ghost" size="icon" title="Editar Ficha"><Edit className="h-4 w-4 text-blue-500"/></Button>
                            <Button variant="ghost" size="icon" title="Notificações"><Bell className="h-4 w-4 text-yellow-500"/></Button>
                            <Button variant="ghost" size="icon" title="Remover Ficha"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground"/>Produto: <span className="font-semibold">{ficha.produto}</span></p>
                          <p className="flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground"/>Qualidade: <span className="font-semibold">{ficha.qualidade}</span></p>
                          <p className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-muted-foreground"/>Embalagem: <span className="font-semibold">{ficha.embalagem}</span></p>
                          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>Locais de Entrega: <span className="font-semibold">{ficha.locaisEntrega?.length || 0}</span></p>
                          <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/>Criado em: <span className="font-semibold">{formatDate(ficha.created_at)}</span></p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {fichasRecebimento.length===0 && <p className="text-center text-muted-foreground py-8">Nenhuma ficha de recebimento criada.</p>}
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
                            <Button variant="ghost" size="icon" title="Editar Produto"><Edit className="h-4 w-4 text-blue-500"/></Button>
                            <Button variant="ghost" size="icon" title="Ver Estatísticas"><BarChart3 className="h-4 w-4 text-yellow-500"/></Button>
                            <Button variant="ghost" size="icon" title="Promover/Partilhar"><Share2 className="h-4 w-4 text-primary"/></Button>
                            {product.status !== 'removed' && <Button variant="ghost" size="icon" onClick={()=>deleteProduct(product.id)} title="Remover Produto"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3"/>Colheita: <span className="font-semibold">{formatDate(product.harvest_date)}</span></div>
                          <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3"/>Local: <span className="font-semibold">{product.municipality_id}</span></div>
                          <div className="flex items-center gap-1 text-muted-foreground"><Eye className="h-3 w-3"/>Visualizações: <span className="font-semibold">{product.views}</span></div>
                          <div className="flex items-center gap-1 text-muted-foreground"><Star className="h-3 w-3"/>Interesses: <span className="font-semibold">{product.interests}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userProducts.length===0 && <p className="text-center text-muted-foreground py-8">Nenhum produto publicado ainda.</p>}
                </div>
              )}
            </TabsContent>

            {/* Aba de Indicações (só para agentes) */}
            {userProfile?.user_type === 'agente' && (
              <TabsContent value="referrals" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {agentStats && agentStats.recentReferrals && agentStats.recentReferrals.length > 0 ? (
                    <div className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="cursor-pointer">Todos</Badge>
                    <Badge variant="outline" className="cursor-pointer">Agricultores</Badge>
                    <Badge variant="outline" className="cursor-pointer">Compradores</Badge>
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
                      <p className="text-muted-foreground">Você ainda não indicou nenhum usuário</p>
                      <p className="text-sm text-muted-foreground mt-2">Compartilhe seu código de agente para começar a ganhar pontos!</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            <TabsContent value="statistics" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/>Resumo de Performance</CardTitle></CardHeader>
                <CardContent>
                   {userProfile?.user_type==='agente' ? (
                    <div className="space-y-2">
                      <p className="flex justify-between"><span>Total de Indicações:</span><span className="font-bold">{agentStats?.totalReferrals || 0}</span></p>
                      <p className="flex justify-between"><span>Total de Pontos:</span><span className="font-bold text-primary">{agentStats?.totalPoints || 0}</span></p>
                      <p className="text-sm text-muted-foreground mt-4">Cada usuário indicado vale 10 pontos!</p>
                    </div>
                  ) : userProfile?.user_type==='comprador' ? (
                    <>
                      <p className="flex justify-between"><span>Total Fichas Recebimento:</span><span className="font-bold">{totalFichas}</span></p>
                      <p className="flex justify-between"><span>Compras Concluídas (Simulação):</span><span className="font-bold text-green-600">{totalComprasConcluidas}</span></p>
                      <p className="flex justify-between"><span>Produtos Favoritos (Simulação):</span><span className="font-bold text-red-500">{totalProdutosFavoritos}</span></p>
                    </>
                  ) : (
                    <>
                      <p className="flex justify-between"><span>Total Produtos Publicados:</span><span className="font-bold">{userProducts.length}</span></p>
                      <p className="flex justify-between"><span>Produtos Ativos:</span><span className="font-bold text-primary">{activeProducts}</span></p>
                      <p className="flex justify-between"><span>Total Visualizações:</span><span className="font-bold text-blue-500">{totalViews}</span></p>
                      <p className="flex justify-between"><span>Total Interesses:</span><span className="font-bold text-red-500">{totalInterests}</span></p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default Profile
