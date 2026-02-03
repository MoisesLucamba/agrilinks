import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BarChart3, Search, LayoutDashboard, ShoppingCart, Bell, Phone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import orbisLinkLogo from '@/assets/orbislink-logo.png'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useNavigate } from 'react-router-dom'
import { ProductCard, Product } from '@/components/ProductCard'


const MAPBOX_TOKEN = 'pk.eyJ1IjoibHVjYW1iYSIsImEiOiJjbWdqY293Z2QwaGRwMmlyNGlwNW4xYXhwIn0.qOjQNe8kbbfmdK5G0MHWDA'


const AppHome = () => {
  const { t } = useTranslation()
  const { user, isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [orderData, setOrderData] = useState({ quantity: 1, location: '' })
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [preOrderLoading, setPreOrderLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate()


  useEffect(() => {
    if (user) fetchProducts()
  }, [user])

  const fetchProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .limit(100)
      if (error) throw error

      const productsWithData = await Promise.all(
        (productsData || []).map(async (product) => {
          // Fetch user verification status
          const { data: productUser } = await supabase
            .from('users')
            .select('verified')
            .eq('id', product.user_id)
            .maybeSingle()

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
                .select('full_name, user_type, avatar_url')
                .eq('id', c.user_id)
                .maybeSingle()

              // Fetch likes count and user like status for this comment
              const { count: likesCount } = await supabase
                .from('comment_likes')
                .select('*', { count: 'exact', head: true })
                .eq('comment_id', c.id)

              const { data: userCommentLike } = await supabase
                .from('comment_likes')
                .select('id')
                .eq('comment_id', c.id)
                .eq('user_id', user?.id || '')
                .maybeSingle()

              // Fetch replies for this comment
              const { data: replies } = await supabase
                .from('comment_replies')
                .select('id, user_id, reply_text, created_at')
                .eq('comment_id', c.id)
                .order('created_at', { ascending: true })

              const repliesWithUser = await Promise.all(
                (replies || []).map(async (r) => {
                  const { data: replyUser } = await supabase
                    .from('users')
                    .select('full_name, user_type')
                    .eq('id', r.user_id)
                    .maybeSingle()
                  return {
                    ...r,
                    user_name: replyUser?.full_name || 'Usuário',
                    user_type: replyUser?.user_type || 'agricultor'
                  }
                })
              )

              return {
                ...c,
                user_name: userData?.full_name || 'Usuário',
                user_type: userData?.user_type || 'agricultor',
                user_avatar: userData?.avatar_url,
                likes_count: likesCount || 0,
                is_liked: !!userCommentLike,
                replies: repliesWithUser
              }
            })
          )

          return { 
            ...product, 
            likes_count: likesCount || 0, 
            is_liked: !!userLike, 
            comments: commentsWithUserInfo,
            user_verified: productUser?.verified || false
          } as Product
        })
      )

      // Algoritmo de ranking: produtos mais novos + mais likes + mais comentários
      const rankedProducts = productsWithData.sort((a, b) => {
        const now = Date.now()
        const ageA = now - new Date(a.created_at).getTime()
        const ageB = now - new Date(b.created_at).getTime()
        
        // Score: recência (peso 0.4) + likes (peso 0.3) + comentários (peso 0.3)
        const dayInMs = 24 * 60 * 60 * 1000
        const recencyScoreA = Math.max(0, 7 - ageA / dayInMs) * 0.4
        const recencyScoreB = Math.max(0, 7 - ageB / dayInMs) * 0.4
        
        const likesScoreA = (a.likes_count || 0) * 0.3
        const likesScoreB = (b.likes_count || 0) * 0.3
        
        const commentsScoreA = (a.comments?.length || 0) * 0.3
        const commentsScoreB = (b.comments?.length || 0) * 0.3
        
        const totalScoreA = recencyScoreA + likesScoreA + commentsScoreA
        const totalScoreB = recencyScoreB + likesScoreB + commentsScoreB
        
        return totalScoreB - totalScoreA
      })

      setProducts(rankedProducts.slice(0, 20))
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
  }

  const handleOpenMap = (product: Product) => {
    setSelectedProduct(product)
    setMapModalOpen(true)
  }

  const handleOpenPreOrder = (product: Product) => {
    setSelectedProduct(product)
    setOrderData({ quantity: 1, location: '' })
    setModalOpen(true)
  }

  const handlePreOrderSubmit = async () => {
  if (!selectedProduct || !user) return toast.error("Erro ao processar pré-compra");

  setIsSubmitting(true);

  try {
    const { error } = await supabase.from("pre_orders").insert({
      product_id: selectedProduct.id,
      user_id: user.id,
      quantity: orderData.quantity,
      location: orderData.location,
      status: "pending",
    });

    if (error) throw error;

    await supabase.rpc("create_notification", {
      p_user_id: selectedProduct.user_id,
      p_type: "pre_order",
      p_title: "Nova Pré-Compra",
      p_message: `${user.email} quer comprar ${orderData.quantity}kg do seu produto ${selectedProduct.product_type}`,
      p_metadata: {
        product_id: selectedProduct.id,
        buyer_id: user.id,
        quantity: orderData.quantity,
      },
    });

    const { data: agentUsers } = await supabase
      .from("users")
      .select("id")
      .eq("user_type", "agente" as const);

    if (agentUsers?.length > 0) {
      for (const agent of agentUsers) {
        await supabase.rpc("create_notification", {
          p_user_id: agent.id,
          p_type: "pre_order",
          p_title: "Nova Pré-Compra no Sistema",
          p_message: `${user.email} quer comprar ${orderData.quantity}kg de ${selectedProduct.product_type} de ${selectedProduct.farmer_name}`,
          p_metadata: {
            product_id: selectedProduct.id,
            buyer_id: user.id,
            seller_id: selectedProduct.user_id,
            quantity: orderData.quantity,
          },
        });
      }
    }

    toast.success("Pré-compra realizada com sucesso!");
    setModalOpen(false);
    setSelectedProduct(null);
  } catch (error) {
    console.error("Erro ao criar pré-compra:", error);
    toast.error("Erro ao processar pré-compra");
  } finally {
    setIsSubmitting(false);
  }
};


  useEffect(() => {
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
  const formatPrice = (p: number) => `${p.toLocaleString()} Kz`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a1628] min-h-screen safe-bottom">
      {/* HEADER - Dark blue with accent */}
      <header className="sticky top-0 z-30 bg-[#0a1628]/95 backdrop-blur-md border-b border-accent/20">
        <div className="content-container py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src={orbisLinkLogo} 
              alt="OrbisLink" 
              className="h-10 sm:h-11 transition-transform hover:scale-105" 
            />
            <button
              onClick={() => navigate('/search')}
              className="flex items-center justify-center p-2.5 rounded-full 
                         bg-accent/20 hover:bg-accent/30 text-accent
                         transition-all duration-200"
              aria-label="Pesquisar"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/admindashboard')}
                className="text-accent hover:bg-accent/20"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/mercado')}
                className="text-accent hover:bg-accent/20"
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* FEED - Improved responsive grid */}
      <main className="content-container py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {products.map((product, index) => (
            <div 
              key={product.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              <ProductCard
                product={product}
                onProductUpdate={handleProductUpdate}
                onOpenMap={handleOpenMap}
                onOpenPreOrder={handleOpenPreOrder}
              />
            </div>
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-accent/20 flex items-center justify-center">
              <Search className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Nenhum produto encontrado</h3>
            <p className="text-sm text-white/60">Novos produtos serão exibidos aqui.</p>
          </div>
        )}
      </main>

      {/* MODAL PRÉ-COMPRA - Refined */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border shadow-strong rounded-2xl p-0 max-h-[85vh] overflow-hidden">
          <DialogHeader className="p-5 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </span>
              Pré-Compra
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{selectedProduct?.product_type}</p>
          </DialogHeader>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[50vh]">
            {/* Info Cards */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A pré-compra é uma demonstração de interesse. O agricultor receberá e verificará a disponibilidade.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <Phone className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1.5">Números de contato:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-background rounded-md font-medium text-xs">934 745 871</span>
                    <span className="px-2 py-0.5 bg-background rounded-md font-medium text-xs">935 358 417</span>
                    <span className="px-2 py-0.5 bg-background rounded-md font-medium text-xs">922 717 574</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('order.quantity')}</label>
                <Input
                  type="number"
                  value={orderData.quantity || ''}
                  onChange={(e) => setOrderData({ ...orderData, quantity: Number(e.target.value) })}
                  min={1}
                  max={selectedProduct?.quantity}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  {t('order.available')}: {selectedProduct?.quantity.toLocaleString()} kg
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('order.deliveryLocation')}</label>
                <Input
                  placeholder={t('order.deliveryPlaceholder')}
                  value={orderData.location}
                  onChange={(e) => setOrderData({ ...orderData, location: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-muted/50 p-4 rounded-xl space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('order.subtotal')}:</span>
                <span className="font-medium">{formatPrice(orderData.quantity * (selectedProduct?.price || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('order.logisticsFee')}:</span>
                <span className="font-medium">{formatPrice(orderData.quantity * (selectedProduct?.price || 0) * 0.078)}</span>
              </div>
              <div className="border-t border-border pt-2.5 flex justify-between">
                <span className="font-semibold">{t('order.total')}:</span>
                <span className="font-bold text-lg text-primary">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-5 pt-4 border-t border-border gap-3 sm:gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1 sm:flex-none">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handlePreOrderSubmit}
              disabled={isSubmitting || !orderData.location.trim()}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {t('order.processing')}
                </span>
              ) : (
                t('order.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

{isSubmitting && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
    <div className="bg-white p-8 rounded-2xl shadow-2xl border border-green-200 flex flex-col items-center gap-4 animate-pulse">
      
      {/* Ícone animado */}
      <div className="relative">
        <div className="animate-spin h-14 w-14 border-4 border-green-600 border-b-transparent rounded-full"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Ícone de folhas (herbal/agricultura) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-green-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 20c4.418 0 8-4.03 8-9 0-5.523-3.582-9-8-9S4 5.477 4 11c0 4.97 3.582 9 8 9z" />
          </svg>
        </div>
      </div>

      {/* Texto principal */}
      <p className="text-green-700 text-lg font-semibold flex items-center gap-2">
        {t('order.processingOrder')}
      </p>

      {/* Subtexto com ícone */}
      <p className="text-gray-500 text-sm flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 8v4l3 2" />
          <circle cx="12" cy="12" r="10" />
        </svg>
        {t('common.wait')}
      </p>
    </div>
  </div>
)}


      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Localização do Produto</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span>{selectedProduct?.product_type}</span> • <span>{selectedProduct?.farmer_name}</span>
            </DialogDescription>
          </DialogHeader>
          <div ref={mapContainerRef} className="w-full h-[400px] rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AppHome
