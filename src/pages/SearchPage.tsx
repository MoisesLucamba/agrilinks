import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'
import { 
  ChevronLeft, Search, Package, User, TrendingUp, Clock, 
  DollarSign, Filter, X, SlidersHorizontal, Wheat, Apple,
  Carrot, Leaf, ArrowUpDown
} from 'lucide-react'
import { angolaProvinces } from '@/data/angola-locations'
import { ProductCard, Product as ProductCardType } from '@/components/ProductCard'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = 'pk.eyJ1IjoibHVjYW1iYSIsImEiOiJjbWdqY283Z2QwaGRwMmlyNGlwNW4xYXhwIn0.qOjQNe8kbbfmdK5G0MHWDA'

interface Product extends ProductCardType {}

interface UserResult {
  id: string
  full_name: string
  email: string
  user_type: string
  avatar_url?: string
}

type SortOption = 'recent' | 'popular' | 'price_asc' | 'price_desc'
type TabOption = 'all' | 'products' | 'users'

const productCategories = [
  { id: 'all', name: 'Todos', icon: Package },
  { id: 'cereais', name: 'Cereais', icon: Wheat },
  { id: 'frutas', name: 'Frutas', icon: Apple },
  { id: 'legumes', name: 'Legumes', icon: Carrot },
  { id: 'verduras', name: 'Verduras', icon: Leaf },
]

const SearchPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [activeTab, setActiveTab] = useState<TabOption>('all')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [preOrderModalOpen, setPreOrderModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [orderData, setOrderData] = useState({ quantity: 1, location: '' })
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<mapboxgl.Map | null>(null)

  const searchData = async (term: string, province?: string, category?: string) => {
    setLoading(true)
    try {
      // Buscar produtos
      let query = supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
      
      if (province) {
        query = query.eq('province_id', province)
      }
      
      if (term.trim()) {
        query = query.or(`product_type.ilike.%${term}%,description.ilike.%${term}%,farmer_name.ilike.%${term}%`)
      }

      // Filtrar por categoria (usando product_type)
      if (category && category !== 'all') {
        query = query.ilike('product_type', `%${category}%`)
      }

      const { data: products } = await query

      const productsWithData = await Promise.all(
        (products || []).map(async (product) => {
          const { count: likesCount } = await supabase
            .from('product_likes')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id)

          const { data: userLike } = await supabase
            .from('product_likes')
            .select('id')
            .eq('product_id', product.id)
            .eq('user_id', user?.id || '')
            .maybeSingle()

          const { data: comments } = await supabase
            .from('product_comments')
            .select(`id, user_id, comment_text, created_at`)
            .eq('product_id', product.id)
            .order('created_at', { ascending: false })

          const commentsWithUserInfo = await Promise.all(
            (comments || []).map(async (c) => {
              const { data: userData } = await supabase
                .from('users')
                .select('full_name, user_type')
                .eq('id', c.user_id)
                .maybeSingle()
              return { ...c, user_name: userData?.full_name || 'Usuário', user_type: userData?.user_type || 'agricultor' }
            })
          )

          return { 
            ...product, 
            likes_count: likesCount || 0, 
            is_liked: !!userLike, 
            comments: commentsWithUserInfo 
          } as Product
        })
      )

      setProductResults(productsWithData)

      // Buscar usuários
      if (term.trim() && (activeTab === 'all' || activeTab === 'users')) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email, user_type, avatar_url')
          .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(20)

        setUserResults((users || []) as UserResult[])
      } else {
        setUserResults([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    searchData(searchTerm, selectedProvince, selectedCategory)
  }, [searchTerm, selectedProvince, selectedCategory, activeTab])

  // Ordenar produtos
  const sortedProducts = useMemo(() => {
    const sorted = [...productResults]
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      case 'popular':
        return sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price)
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price)
      default:
        return sorted
    }
  }, [productResults, sortBy])

  const handleProvinceClick = (provinceId: string) => {
    setSelectedProvince(prev => prev === provinceId ? '' : provinceId)
  }

  const handleProductUpdate = (updatedProduct: Product) => {
    setProductResults(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
  }

  const handleOpenMap = (product: Product) => {
    setSelectedProduct(product)
    setMapModalOpen(true)
  }

  const handleOpenPreOrder = (product: Product) => {
    setSelectedProduct(product)
    setOrderData({ quantity: 1, location: '' })
    setPreOrderModalOpen(true)
  }

  const handlePreOrderSubmit = async () => {
    if (!selectedProduct || !user) return toast.error('Erro ao processar pré-compra')

    try {
      const { error } = await supabase.from('pre_orders').insert({
        product_id: selectedProduct.id,
        user_id: user.id,
        quantity: orderData.quantity,
        location: orderData.location,
        status: 'pending'
      })

      if (error) throw error

      await supabase.rpc('create_notification', {
        p_user_id: selectedProduct.user_id,
        p_type: 'pre_order',
        p_title: 'Nova Pré-Compra',
        p_message: `${user.email} quer comprar ${orderData.quantity}kg do seu produto ${selectedProduct.product_type}`,
        p_metadata: {
          product_id: selectedProduct.id,
          buyer_id: user.id,
          quantity: orderData.quantity
        }
      })

      const { data: agentUsers } = await supabase
        .from('users')
        .select('id')
        .eq('user_type', 'agente' as const)
      
      if (agentUsers && agentUsers.length > 0) {
        for (const agent of agentUsers) {
          await supabase.rpc('create_notification', {
            p_user_id: agent.id,
            p_type: 'pre_order',
            p_title: 'Nova Pré-Compra no Sistema',
            p_message: `${user.email} quer comprar ${orderData.quantity}kg de ${selectedProduct.product_type} de ${selectedProduct.farmer_name}`,
            p_metadata: {
              product_id: selectedProduct.id,
              buyer_id: user.id,
              seller_id: selectedProduct.user_id,
              quantity: orderData.quantity
            }
          })
        }
      }

      toast.success('Pré-compra realizada com sucesso!')
      setPreOrderModalOpen(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error('Erro ao criar pré-compra:', error)
      toast.error('Erro ao processar pré-compra')
    }
  }

  const clearFilters = () => {
    setSelectedProvince('')
    setSelectedCategory('all')
    setSortBy('recent')
    setSearchTerm('')
  }

  const hasActiveFilters = selectedProvince || selectedCategory !== 'all' || sortBy !== 'recent' || searchTerm

  React.useEffect(() => {
    if (!mapModalOpen || !selectedProduct?.location_lat || !selectedProduct?.location_lng) return
    if (!mapContainerRef.current) return

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [selectedProduct.location_lng, selectedProduct.location_lat],
        zoom: 9,
        attributionControl: false
      })

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      new mapboxgl.Marker({ color: 'green' })
        .setLngLat([selectedProduct.location_lng, selectedProduct.location_lat])
        .addTo(mapRef.current)

      return () => {
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }, [mapModalOpen, selectedProduct])

  const TAX_RATE = 0.10
  const totalPrice = selectedProduct ? orderData.quantity * selectedProduct.price * (1 + TAX_RATE) : 0

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'agricultor': return 'Agricultor'
      case 'comprador': return 'Comprador'
      case 'agente': return 'Agente'
      default: return 'Usuário'
    }
  }

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'agricultor': return 'bg-green-500/10 text-green-600'
      case 'comprador': return 'bg-blue-500/10 text-blue-600'
      case 'agente': return 'bg-purple-500/10 text-purple-600'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-muted transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Pesquisar</h1>
            <div className="flex-1" />
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produtos, agricultores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-11 bg-muted/50"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 p-0.5 hover:bg-muted rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabOption)} className="mt-3">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="products" className="text-xs">Produtos</TabsTrigger>
              <TabsTrigger value="users" className="text-xs">Usuários</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4 bg-muted/30">
            {/* Categorias */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Categoria
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {productCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="whitespace-nowrap shrink-0 gap-1.5"
                  >
                    <cat.icon className="h-3.5 w-3.5" />
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ordenar */}
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Ordenar
              </p>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Mais recentes
                    </span>
                  </SelectItem>
                  <SelectItem value="popular">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Mais populares
                    </span>
                  </SelectItem>
                  <SelectItem value="price_asc">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Menor preço
                    </span>
                  </SelectItem>
                  <SelectItem value="price_desc">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Maior preço
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Províncias */}
            <div>
              <p className="text-sm font-medium mb-2">Província</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {angolaProvinces.map((province) => (
                  <Button
                    key={province.id}
                    variant={selectedProvince === province.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleProvinceClick(province.id)}
                    className="whitespace-nowrap shrink-0 text-xs"
                  >
                    {province.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-destructive">
                <X className="h-4 w-4 mr-2" />
                Limpar todos os filtros
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && searchTerm && sortedProducts.length === 0 && userResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Tente buscar por outro termo ou ajuste os filtros</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Resultados de Usuários */}
        {(activeTab === 'all' || activeTab === 'users') && userResults.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Usuários</h2>
              <Badge variant="secondary">{userResults.length}</Badge>
            </div>
            <div className="grid gap-2">
              {userResults.map(u => (
                <Card 
                  key={u.id} 
                  className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/perfil/${u.id}`)}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={u.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{u.full_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${getUserTypeColor(u.user_type)}`}>
                          {getUserTypeLabel(u.user_type)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Resultados de Produtos */}
        {(activeTab === 'all' || activeTab === 'products') && sortedProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Produtos</h2>
                <Badge variant="secondary">{sortedProducts.length}</Badge>
              </div>
            </div>
            <div className="space-y-4">
              {sortedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onProductUpdate={handleProductUpdate}
                  onOpenMap={handleOpenMap}
                  onOpenPreOrder={handleOpenPreOrder}
                />
              ))}
            </div>
          </div>
        )}

        {/* Estado vazio sem pesquisa */}
        {!loading && !searchTerm && sortedProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">Comece a pesquisar</p>
            <p className="text-sm text-muted-foreground mt-1">Digite para encontrar produtos e usuários</p>
          </div>
        )}
      </div>

      {/* MAP MODAL */}
      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Localização do Produto</DialogTitle>
            <DialogDescription>
              {selectedProduct?.product_type} - {selectedProduct?.farmer_name}
            </DialogDescription>
          </DialogHeader>
          <div ref={mapContainerRef} className="w-full h-[400px] rounded-lg" />
        </DialogContent>
      </Dialog>

      {/* PRE-ORDER MODAL */}
      <Dialog open={preOrderModalOpen} onOpenChange={setPreOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pré-Compra de {selectedProduct?.product_type}</DialogTitle>
            <DialogDescription>
              Preencha os dados para solicitar a pré-compra deste produto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Quantidade (kg)</label>
              <Input
                type="number"
                min="1"
                max={selectedProduct?.quantity}
                value={orderData.quantity}
                onChange={(e) => setOrderData({ ...orderData, quantity: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Disponível: {selectedProduct?.quantity.toLocaleString()} kg
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Local de Entrega</label>
              <Input
                placeholder="Digite o local de entrega"
                value={orderData.location}
                onChange={(e) => setOrderData({ ...orderData, location: e.target.value })}
              />
            </div>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Preço por kg:</span>
                <span>{selectedProduct?.price.toLocaleString()} Kz</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{(orderData.quantity * (selectedProduct?.price || 0)).toLocaleString()} Kz</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxa (10%):</span>
                <span>{(orderData.quantity * (selectedProduct?.price || 0) * TAX_RATE).toLocaleString()} Kz</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>{totalPrice.toLocaleString()} Kz</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreOrderModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePreOrderSubmit}>
              Confirmar Pré-Compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SearchPage