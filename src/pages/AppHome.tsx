import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  BarChart3, 
  Search, 
  LayoutDashboard, 
  ShoppingCart, 
  Bell, 
  Phone,
  Sparkles,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import orbisLinkLogo from '@/assets/orbislink-logo.png'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useNavigate } from 'react-router-dom'
import { ProductCard, Product } from '@/components/ProductCard'

const MAPBOX_TOKEN = 'pk.eyJ1IjoibHVjYW1iYSIsImEiOiJjbWdqY293Z2QwaGRwMmlyNGlwNW4xYXhwIn0.qOjQNe8kbbfmdK5G0MHWDA'

// ============================================================================
// LOADING SKELETON COMPONENT
// ============================================================================
const ProductSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
      </div>
    </div>
  </div>
)

// ============================================================================
// FLOATING ACTION BUTTON
// ============================================================================
const FloatingStats = ({ products }: { products: Product[] }) => {
  const totalProducts = products.length
  const totalLikes = products.reduce((sum, p) => sum + (p.likes_count || 0), 0)
  
  return (
    <div className="fixed bottom-24 right-6 z-20 hidden md:flex flex-col gap-3 animate-slide-in-right">
      <div className="group bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-[#0a1628] px-4 py-3 rounded-2xl shadow-2xl hover:shadow-[#FFD700]/40 transition-all duration-300 hover:scale-105 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="bg-[#0a1628]/20 p-2 rounded-lg backdrop-blur-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs opacity-90 font-semibold">Produtos Ativos</p>
            <p className="text-xl font-bold">{totalProducts}</p>
          </div>
        </div>
      </div>
      
      <div className="group bg-gradient-to-br from-[#0a1628] to-[#1e3a5f] text-white px-4 py-3 rounded-2xl shadow-2xl hover:shadow-[#0a1628]/40 transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-[#FFD700]/30">
        <div className="flex items-center gap-3">
          <div className="bg-[#FFD700]/20 p-2 rounded-lg backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-[#FFD700]" />
          </div>
          <div>
            <p className="text-xs opacity-90 font-semibold">Total Likes</p>
            <p className="text-xl font-bold text-[#FFD700]">{totalLikes}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ANIMATED LOGO COMPONENT
// ============================================================================
const AnimatedLogo = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-[#FFD700]/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Animated Circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-16 h-16 border-2 border-[#FFD700] rounded-full animate-ping opacity-20"></div>
        <div className="absolute w-20 h-20 border-2 border-[#FFA500] rounded-full animate-pulse opacity-30"></div>
      </div>
      
      {/* Logo */}
      <img 
        src={orbisLinkLogo} 
        alt="OrbisLink" 
        className="h-14 sm:h-16 relative z-10 transition-all duration-300 group-hover:scale-110 drop-shadow-xl" 
      />
      
      {/* Sparkle Effect */}
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Sparkles className="h-4 w-4 text-[#FFD700] animate-pulse" />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  // ============================================================================
  // FETCH PRODUCTS WITH OPTIMIZED LOGIC
  // ============================================================================
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

      // Intelligent ranking algorithm
      const rankedProducts = productsWithData.sort((a, b) => {
        const now = Date.now()
        const ageA = now - new Date(a.created_at).getTime()
        const ageB = now - new Date(b.created_at).getTime()
        
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

  // ============================================================================
  // HANDLERS
  // ============================================================================
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
    if (!selectedProduct || !user) return toast.error("Erro ao processar pré-compra")

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("pre_orders").insert({
        product_id: selectedProduct.id,
        user_id: user.id,
        quantity: orderData.quantity,
        location: orderData.location,
        status: "pending",
      })

      if (error) throw error

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
      })

      const { data: agentUsers } = await supabase
        .from("users")
        .select("id")
        .eq("user_type", "agente" as const)

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
          })
        }
      }

      toast.success("Pré-compra realizada com sucesso!")
      setModalOpen(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error("Erro ao criar pré-compra:", error)
      toast.error("Erro ao processar pré-compra")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // MAP INITIALIZATION
  // ============================================================================
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
      new mapboxgl.Marker({ color: '#FFD700' })
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

  // ============================================================================
  // CALCULATIONS
  // ============================================================================
  const TAX_RATE = 0.078
  const totalPrice = useMemo(() => 
    selectedProduct ? orderData.quantity * selectedProduct.price * (1 + TAX_RATE) : 0,
    [selectedProduct, orderData.quantity]
  )
  const formatPrice = (p: number) => `${p.toLocaleString('pt-AO')} Kz`

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1e3a5f] to-[#0a1628]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#FFD700]/20 border-t-[#FFD700]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-[#FFD700] animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white mb-1">Carregando marketplace</p>
            <p className="text-sm text-[#FFD700]/80">Preparando os melhores produtos para você</p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen safe-bottom">
      {/* ========== PREMIUM HEADER ========== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="content-container py-3.5">
          <div className="flex justify-between items-center">
            {/* Left Side - Animated Logo */}
            <div className="flex items-center gap-4">
              <AnimatedLogo onClick={() => navigate('/')} />
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="secondary" className="bg-[#FFD700] text-[#0a1628] hover:bg-[#FFA500] font-bold border-0">
                  <Zap className="h-3 w-3 mr-1" />
                  Marketplace
                </Badge>
              </div>
            </div>

            {/* Center - Search Bar (Hidden on mobile, shown on larger screens) */}
            <div className="hidden lg:flex flex-1 max-w-xl mx-8">
              <div 
                onClick={() => navigate('/search')}
                className="flex items-center w-full px-4 py-2.5 bg-gray-100 hover:bg-[#FFD700]/20 rounded-full cursor-pointer transition-all duration-200 group border border-transparent hover:border-[#FFD700]/30"
              >
                <Search className="h-5 w-5 text-gray-500 group-hover:text-[#FFD700] transition-colors mr-3" />
                <span className="text-sm text-gray-500 group-hover:text-gray-700">
                  Pesquisar produtos, agricultores...
                </span>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Mobile Search */}
              <button
                onClick={() => navigate('/search')}
                className="lg:hidden flex items-center justify-center p-2.5 rounded-full 
                           bg-gray-100 hover:bg-[#FFD700]/20 text-gray-700 hover:text-[#FFD700]
                           transition-all duration-200 hover:scale-105"
                aria-label="Pesquisar"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Dashboard Button */}
              {isAdmin ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/admindashboard')}
                  className="text-gray-700 hover:bg-[#FFD700]/20 hover:text-[#FFD700] transition-all duration-200"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/mercado')}
                  className="text-gray-700 hover:bg-[#FFD700]/20 hover:text-[#FFD700] transition-all duration-200"
                >
                  <BarChart3 className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========== ADVERTISING CAROUSEL BANNER ========== */}
      <div className="bg-gradient-to-r from-[#0a1628] via-[#1e3a5f] to-[#0a1628] text-white overflow-hidden relative">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#FFD700] rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFA500] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="content-container py-6 md:py-8 relative z-10">
          {/* Desktop Grid - Hidden on Mobile */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            {/* Card 1 - Featured Products */}
            <div className="group bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-3xl p-6 shadow-2xl hover:shadow-[#FFD700]/50 transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#0a1628] p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <Sparkles className="h-8 w-8 text-[#FFD700] animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0a1628]">Produtos</h3>
                    <p className="text-sm text-[#0a1628]/80 font-semibold">Direto das Fazendas</p>
                  </div>
                </div>
                <p className="text-[#0a1628]/90 text-sm leading-relaxed mb-4 font-medium">
                  Produtos frescos direto dos agricultores para sua mesa
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-[#0a1628]">{products.length}+</span>
                  <Badge className="bg-[#0a1628] text-[#FFD700] border-0 text-xs font-bold px-3 py-1">
                    Ver Todos
                  </Badge>
                </div>
              </div>
            </div>

            {/* Card 2 - Purchase Credits */}
            <div className="group bg-gradient-to-br from-[#0a1628] to-[#1e3a5f] rounded-3xl p-6 shadow-2xl hover:shadow-[#0a1628]/50 transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden border-2 border-[#FFD700]/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-[#FFD700] to-[#FFA500] p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <ShoppingCart className="h-8 w-8 text-[#0a1628]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Créditos</h3>
                    <p className="text-sm text-[#FFD700] font-semibold">de Compra</p>
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-4 font-medium">
                  Adicione créditos e compre com vantagens exclusivas
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#FFD700]">50%</span>
                    <span className="text-sm text-[#FFD700]/80 font-bold">BÔNUS</span>
                  </div>
                  <Badge className="bg-[#FFD700] text-[#0a1628] border-0 text-xs font-bold px-3 py-1 animate-pulse">
                    Ativar
                  </Badge>
                </div>
              </div>
            </div>

            {/* Card 3 - Loyalty Discount */}
            <div className="group bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-3xl p-6 shadow-2xl hover:shadow-[#FFD700]/50 transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#0a1628] p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-[#FFD700] animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0a1628]">Fidelização</h3>
                    <p className="text-sm text-[#0a1628]/80 font-semibold">Programa VIP</p>
                  </div>
                </div>
                <p className="text-[#0a1628]/90 text-sm leading-relaxed mb-4 font-medium">
                  Ganhe até 20% de desconto em compras recorrentes
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#0a1628]">20%</span>
                    <span className="text-sm text-[#0a1628]/70 font-bold">OFF</span>
                  </div>
                  <Badge className="bg-[#0a1628] text-[#FFD700] border-0 text-xs font-bold px-3 py-1">
                    Participar
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Carousel - Visible only on Mobile */}
          <div className="md:hidden relative">
            <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-4 pb-4 px-1">
              {/* Card 1 - Featured Products */}
              <div className="snap-center flex-shrink-0 w-[85%] bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#0a1628] p-2.5 rounded-xl shadow-lg">
                      <Sparkles className="h-6 w-6 text-[#FFD700] animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#0a1628]">Produtos</h3>
                      <p className="text-xs text-[#0a1628]/80 font-semibold">Direto das Fazendas</p>
                    </div>
                  </div>
                  <p className="text-[#0a1628]/90 text-xs leading-relaxed mb-3 font-medium">
                    Produtos frescos direto dos agricultores para sua mesa
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-[#0a1628]">{products.length}+</span>
                    <Badge className="bg-[#0a1628] text-[#FFD700] border-0 text-xs font-bold px-2.5 py-0.5">
                      Ver Todos
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card 2 - Purchase Credits */}
              <div className="snap-center flex-shrink-0 w-[85%] bg-gradient-to-br from-[#0a1628] to-[#1e3a5f] rounded-3xl p-5 shadow-2xl relative overflow-hidden border-2 border-[#FFD700]/30">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD700]/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-br from-[#FFD700] to-[#FFA500] p-2.5 rounded-xl shadow-lg">
                      <ShoppingCart className="h-6 w-6 text-[#0a1628]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Créditos</h3>
                      <p className="text-xs text-[#FFD700] font-semibold">de Compra</p>
                    </div>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-3 font-medium">
                    Adicione créditos e compre com vantagens exclusivas
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#FFD700]">50%</span>
                      <span className="text-xs text-[#FFD700]/80 font-bold">BÔNUS</span>
                    </div>
                    <Badge className="bg-[#FFD700] text-[#0a1628] border-0 text-xs font-bold px-2.5 py-0.5 animate-pulse">
                      Ativar
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card 3 - Loyalty Discount */}
              <div className="snap-center flex-shrink-0 w-[85%] bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#0a1628] p-2.5 rounded-xl shadow-lg">
                      <TrendingUp className="h-6 w-6 text-[#FFD700] animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#0a1628]">Fidelização</h3>
                      <p className="text-xs text-[#0a1628]/80 font-semibold">Programa VIP</p>
                    </div>
                  </div>
                  <p className="text-[#0a1628]/90 text-xs leading-relaxed mb-3 font-medium">
                    Ganhe até 20% de desconto em compras recorrentes
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#0a1628]">20%</span>
                      <span className="text-xs text-[#0a1628]/70 font-bold">OFF</span>
                    </div>
                    <Badge className="bg-[#0a1628] text-[#FFD700] border-0 text-xs font-bold px-2.5 py-0.5">
                      Participar
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <div className="mt-4 md:mt-6 flex items-center justify-center gap-4 md:gap-8 text-xs md:text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-pulse"></div>
              <span className="text-white/80 font-medium">{products.length} Produtos Ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#FFD700]" />
              <span className="text-white/80 font-medium">100% Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#FFD700] animate-pulse" />
              <span className="text-white/80 font-medium">Entrega Rápida</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== PRODUCT GRID ========== */}
      <main className="content-container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
          {products.map((product, index) => (
            <div 
              key={product.id} 
              className="animate-fade-in-up opacity-0"
              style={{ 
                animationDelay: `${Math.min(index * 0.08, 0.4)}s`,
                animationFillMode: 'forwards'
              }}
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
        
        {/* Empty State */}
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
              <Search className="h-10 w-10 text-[#0a1628]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500 max-w-md">
              Novos produtos serão exibidos aqui em breve. Volte mais tarde!
            </p>
          </div>
        )}
      </main>

      {/* ========== FLOATING STATS ========== */}
      <FloatingStats products={products} />

      {/* ========== PRE-ORDER MODAL ========== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-0 shadow-2xl rounded-3xl p-0 max-h-[90vh] overflow-hidden">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] p-6 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#FFD700]/20 backdrop-blur-sm">
                <ShoppingCart className="h-6 w-6 text-[#FFD700]" />
              </div>
              Confirmar Pré-Compra
            </DialogTitle>
            <p className="text-[#FFD700]/80 text-sm">
              {selectedProduct?.product_type} • {selectedProduct?.farmer_name}
            </p>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[55vh]">
            {/* Info Cards */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">Processo de Pré-Compra</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Esta é uma demonstração de interesse. O agricultor será notificado e verificará a disponibilidade.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/20 border border-[#FFD700]/30">
                <div className="bg-[#0a1628] p-2 rounded-xl">
                  <Phone className="w-4 h-4 text-[#FFD700]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0a1628] mb-2">Contatos Disponíveis</p>
                  <div className="flex flex-wrap gap-2">
                    <a href="tel:934745871" className="px-3 py-1.5 bg-white rounded-lg font-medium text-xs text-[#0a1628] hover:bg-[#FFD700] transition-colors shadow-sm">
                      934 745 871
                    </a>
                    <a href="tel:935358417" className="px-3 py-1.5 bg-white rounded-lg font-medium text-xs text-[#0a1628] hover:bg-[#FFD700] transition-colors shadow-sm">
                      935 358 417
                    </a>
                    <a href="tel:922717574" className="px-3 py-1.5 bg-white rounded-lg font-medium text-xs text-[#0a1628] hover:bg-[#FFD700] transition-colors shadow-sm">
                      922 717 574
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {t('order.quantity')}
                  <Badge variant="secondary" className="text-xs bg-[#FFD700] text-[#0a1628]">Obrigatório</Badge>
                </label>
                <Input
                  type="number"
                  value={orderData.quantity || ''}
                  onChange={(e) => setOrderData({ ...orderData, quantity: Number(e.target.value) })}
                  min={1}
                  max={selectedProduct?.quantity}
                  className="h-12 text-base border-2 focus:border-[#FFD700] rounded-xl"
                  placeholder="Digite a quantidade"
                />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Disponível: <span className="font-semibold text-[#FFD700]">{selectedProduct?.quantity.toLocaleString()} kg</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {t('order.deliveryLocation')}
                  <Badge variant="secondary" className="text-xs bg-[#FFD700] text-[#0a1628]">Obrigatório</Badge>
                </label>
                <Input
                  placeholder={t('order.deliveryPlaceholder') || "Ex: Luanda, Viana"}
                  value={orderData.location}
                  onChange={(e) => setOrderData({ ...orderData, location: e.target.value })}
                  className="h-12 text-base border-2 focus:border-[#FFD700] rounded-xl"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl space-y-3 border-2 border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resumo do Pedido</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('order.subtotal')}:</span>
                  <span className="font-semibold">{formatPrice(orderData.quantity * (selectedProduct?.price || 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('order.logisticsFee')} (7.8%):</span>
                  <span className="font-semibold">{formatPrice(orderData.quantity * (selectedProduct?.price || 0) * TAX_RATE)}</span>
                </div>
                <div className="border-t-2 border-dashed border-gray-300 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="font-bold text-2xl text-[#FFD700]">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setModalOpen(false)} 
              className="flex-1 h-12 rounded-xl border-2 font-semibold hover:bg-gray-50"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handlePreOrderSubmit}
              disabled={isSubmitting || !orderData.location.trim() || orderData.quantity < 1}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] text-[#0a1628] font-bold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 rounded-full border-2 border-[#0a1628] border-t-transparent" />
                  Processando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  {t('order.confirm')}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== LOADING OVERLAY ========== */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in">
          <div className="bg-white p-10 rounded-3xl shadow-2xl border-2 border-[#FFD700] flex flex-col items-center gap-5 max-w-sm mx-4 animate-scale-in">
            {/* Animated Icon */}
            <div className="relative">
              <div className="animate-spin h-20 w-20 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-[#0a1628] p-3 rounded-full animate-pulse">
                  <ShoppingCart className="h-8 w-8 text-[#FFD700]" />
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <p className="text-[#0a1628] text-xl font-bold">
                Processando Pedido
              </p>
              <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                <Zap className="h-4 w-4 animate-pulse text-[#FFD700]" />
                Aguarde um momento...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] h-full rounded-full animate-progress"></div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MAP MODAL ========== */}
      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] p-6 text-white">
            <DialogTitle className="text-xl font-bold mb-1">Localização do Produto</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-[#FFD700]">
              <span className="font-medium">{selectedProduct?.product_type}</span> 
              <span>•</span> 
              <span>{selectedProduct?.farmer_name}</span>
            </DialogDescription>
          </div>
          <div ref={mapContainerRef} className="w-full h-[500px]" />
        </DialogContent>
      </Dialog>

      {/* ========== CUSTOM STYLES ========== */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.6s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default AppHome