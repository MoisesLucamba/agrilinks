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
  Zap,
  ChevronDown,
  Globe
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import orbisLinkLogo from '@/assets/orbislink-logo.png'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useNavigate } from 'react-router-dom'
import { ProductCard, Product } from '@/components/ProductCard'

const MAPBOX_TOKEN = 'pk.eyJ1IjoibHVjYW1iYSIsImEiOiJjbWdqY293Z2QwaGRwMmlyNGlwNW4xYXhwIn0.qOjQNe8kbbfmdK5G0MHWDA'

// ============================================================================
// COUNTRY DATA
// ============================================================================
const COUNTRIES = [
  { code: 'AO', name: 'Angola', flag: '🇦🇴', currency: 'Kz' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'R$' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: '€' },
  { code: 'MZ', name: 'Moçambique', flag: '🇲🇿', currency: 'MT' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻', currency: 'CVE' },
  { code: 'ST', name: 'São Tomé e Príncipe', flag: '🇸🇹', currency: 'Db' },
  { code: 'GW', name: 'Guiné-Bissau', flag: '🇬🇼', currency: 'CFA' },
]

// ============================================================================
// COUNTRY SELECTOR COMPONENT
// ============================================================================
const CountrySelector = ({ selectedCountry, onCountryChange }: { 
  selectedCountry: typeof COUNTRIES[0], 
  onCountryChange: (country: typeof COUNTRIES[0]) => void 
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 gap-2 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 rounded-xl px-3"
        >
          <span className="text-xl">{selectedCountry.flag}</span>
          <span className="hidden sm:inline text-sm font-medium">{selectedCountry.code}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-blue-100 shadow-xl">
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" />
          Selecione seu país
        </div>
        {COUNTRIES.map((country) => (
          <DropdownMenuItem
            key={country.code}
            onClick={() => onCountryChange(country)}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg ${
              selectedCountry.code === country.code 
                ? 'bg-yellow-50 text-yellow-700 font-semibold' 
                : 'hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">{country.flag}</span>
            <div className="flex-1">
              <div className="font-medium text-sm">{country.name}</div>
              <div className="text-xs text-gray-500">{country.code} · {country.currency}</div>
            </div>
            {selectedCountry.code === country.code && (
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// LOADING SKELETON COMPONENT
// ============================================================================
const ProductSkeleton = () => (
  <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
    <div className="aspect-square bg-gradient-to-br from-blue-50 to-blue-100 animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-blue-100 rounded animate-pulse w-3/4" />
      <div className="h-3 bg-blue-50 rounded animate-pulse w-1/2" />
      <div className="flex gap-2">
        <div className="h-8 bg-blue-100 rounded animate-pulse flex-1" />
        <div className="h-8 bg-blue-100 rounded animate-pulse w-20" />
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
      <div className="group bg-gradient-to-br from-yellow-400 to-yellow-500 text-white px-4 py-3 rounded-2xl shadow-2xl hover:shadow-yellow-400/40 transition-all duration-300 hover:scale-105 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs opacity-90 font-semibold">Produtos Ativos</p>
            <p className="text-xl font-bold">{totalProducts}</p>
          </div>
        </div>
      </div>
      
      <div className="group bg-gradient-to-br from-blue-400 to-blue-500 text-white px-4 py-3 rounded-2xl shadow-2xl hover:shadow-blue-400/40 transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-yellow-400/30">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400/20 p-2 rounded-lg backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-yellow-300" />
          </div>
          <div>
            <p className="text-xs opacity-90 font-semibold">Total Likes</p>
            <p className="text-xl font-bold text-yellow-300">{totalLikes}</p>
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
      <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Animated Circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-16 h-16 border-2 border-yellow-400 rounded-full animate-ping opacity-20"></div>
        <div className="absolute w-20 h-20 border-2 border-blue-400 rounded-full animate-pulse opacity-30"></div>
      </div>
      
      {/* Logo */}
      <img 
        src={orbisLinkLogo} 
        alt="OrbisLink" 
        className="h-14 sm:h-16 relative z-10 transition-all duration-300 group-hover:scale-110 drop-shadow-xl" 
      />
      
      {/* Sparkle Effect */}
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
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
  
  // Country state
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]) // Default: Angola

  // Auto-detect country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        const detectedCountry = COUNTRIES.find(c => c.code === data.country_code)
        if (detectedCountry) {
          setSelectedCountry(detectedCountry)
          toast.success(`🌍 Região detectada: ${detectedCountry.name}`, { duration: 3000 })
        }
      } catch (error) {
        console.log('Could not detect country, using default (Angola)')
      }
    }
    detectCountry()
  }, [])

  const handleCountryChange = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country)
    toast.success(`País alterado para ${country.name} ${country.flag}`)
  }

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
      new mapboxgl.Marker({ color: '#FBBF24' })
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400/20 border-t-yellow-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-yellow-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white mb-1">Carregando marketplace</p>
            <p className="text-sm text-yellow-300/80">Preparando os melhores produtos para você</p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen safe-bottom">
      {/* ========== PREMIUM HEADER ========== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-blue-200/50 shadow-sm">
        <div className="content-container py-3.5">
          <div className="flex justify-between items-center">
            {/* Left Side - Animated Logo */}
            <div className="flex items-center gap-4">
              <AnimatedLogo onClick={() => navigate('/')} />
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-400 text-white hover:bg-yellow-500 font-bold border-0">
                  <Zap className="h-3 w-3 mr-1" />
                  Marketplace
                </Badge>
              </div>
            </div>

            {/* Center - Search Bar (Hidden on mobile, shown on larger screens) */}
            <div className="hidden lg:flex flex-1 max-w-xl mx-8">
              <div 
                onClick={() => navigate('/search')}
                className="flex items-center w-full px-4 py-2.5 bg-blue-50 hover:bg-yellow-50 rounded-full cursor-pointer transition-all duration-200 group border border-transparent hover:border-yellow-400/30"
              >
                <Search className="h-5 w-5 text-blue-400 group-hover:text-yellow-500 transition-colors mr-3" />
                <span className="text-sm text-gray-500 group-hover:text-gray-700">
                  Pesquisar produtos, agricultores...
                </span>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Country Selector */}
              <CountrySelector 
                selectedCountry={selectedCountry} 
                onCountryChange={handleCountryChange} 
              />

              {/* Mobile Search */}
              <button
                onClick={() => navigate('/search')}
                className="lg:hidden flex items-center justify-center p-2.5 rounded-full 
                           bg-blue-50 hover:bg-yellow-50 text-blue-500 hover:text-yellow-500
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
                  className="text-blue-500 hover:bg-yellow-50 hover:text-yellow-500 transition-all duration-200"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/mercado')}
                  className="text-blue-500 hover:bg-yellow-50 hover:text-yellow-500 transition-all duration-200"
                >
                  <BarChart3 className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========== ADVERTISING CAROUSEL BANNER ========== */}
      <div className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white overflow-hidden relative">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="content-container py-6 md:py-8 relative z-10">
          {/* Desktop Grid - Hidden on Mobile */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            {/* Card 1 - Featured Products */}
            <div className="group bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl p-6 shadow-2xl hover:shadow-yellow-400/50 transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <Sparkles className="h-8 w-8 text-yellow-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Produtos</h3>
                    <p className="text-sm text-white/80 font-semibold">Direto das Fazendas</p>
                  </div>
                </div>
                <p className="text-white/90 text-sm leading-relaxed mb-4 font-medium">
                  Produtos frescos direto dos agricultores para sua mesa
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-white">{products.length}+</span>
                  <Badge className="bg-white text-yellow-500 border-0 text-xs font-bold px-3 py-1">
                    Ver Todos
                  </Badge>
                </div>
              </div>
            </div>

            {/* Card 2 - Purchase Credits */}
            <div className="group bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl p-6 shadow-2xl hover:shadow-blue-400/50 transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden border-2 border-yellow-400/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <ShoppingCart className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Créditos</h3>
                    <p className="text-sm text-yellow-300 font-semibold">de Compra</p>
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-4 font-medium">
                  Adicione créditos e compre com vantagens exclusivas
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-yellow-300">50%</span>
                    <span className="text-sm text-yellow-300/80 font-bold">BÔNUS</span>
                  </div>
                  <Badge className="bg-yellow-400 text-white border-0 text-xs font-bold px-3 py-1 animate-pulse">
                    Ativar
                  </Badge>
                </div>
              </div>
            </div>

            {/* Card 3 - Loyalty Discount */}
            <div className="group bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl p-6 shadow-2xl hover:shadow-yellow-400/50 transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-yellow-500 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Fidelização</h3>
                    <p className="text-sm text-white/80 font-semibold">Programa VIP</p>
                  </div>
                </div>
                <p className="text-white/90 text-sm leading-relaxed mb-4 font-medium">
                  Ganhe até 20% de desconto em compras recorrentes
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">20%</span>
                    <span className="text-sm text-white/70 font-bold">OFF</span>
                  </div>
                  <Badge className="bg-white text-yellow-500 border-0 text-xs font-bold px-3 py-1">
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
              <div className="snap-center flex-shrink-0 w-[85%] bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white p-2.5 rounded-xl shadow-lg">
                      <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Produtos</h3>
                      <p className="text-xs text-white/80 font-semibold">Direto das Fazendas</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-xs leading-relaxed mb-3 font-medium">
                    Produtos frescos direto dos agricultores para sua mesa
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-white">{products.length}+</span>
                    <Badge className="bg-white text-yellow-500 border-0 text-xs font-bold px-2.5 py-0.5">
                      Ver Todos
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card 2 - Purchase Credits */}
              <div className="snap-center flex-shrink-0 w-[85%] bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl p-5 shadow-2xl relative overflow-hidden border-2 border-yellow-400/30">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-2.5 rounded-xl shadow-lg">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Créditos</h3>
                      <p className="text-xs text-yellow-300 font-semibold">de Compra</p>
                    </div>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-3 font-medium">
                    Adicione créditos e compre com vantagens exclusivas
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-yellow-300">50%</span>
                      <span className="text-xs text-yellow-300/80 font-bold">BÔNUS</span>
                    </div>
                    <Badge className="bg-yellow-400 text-white border-0 text-xs font-bold px-2.5 py-0.5 animate-pulse">
                      Ativar
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card 3 - Loyalty Discount */}
              <div className="snap-center flex-shrink-0 w-[85%] bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white p-2.5 rounded-xl shadow-lg">
                      <TrendingUp className="h-6 w-6 text-yellow-500 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Fidelização</h3>
                      <p className="text-xs text-white/80 font-semibold">Programa VIP</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-xs leading-relaxed mb-3 font-medium">
                    Ganhe até 20% de desconto em compras recorrentes
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">20%</span>
                      <span className="text-xs text-white/70 font-bold">OFF</span>
                    </div>
                    <Badge className="bg-white text-yellow-500 border-0 text-xs font-bold px-2.5 py-0.5">
                      Participar
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <div className="mt-4 md:mt-6 flex items-center justify-center gap-4 md:gap-8 text-xs md:text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-white/80 font-medium">{products.length} Produtos Ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-300" />
              <span className="text-white/80 font-medium">100% Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-300 animate-pulse" />
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
            <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg">
              <Search className="h-10 w-10 text-white" />
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
          <div className="bg-gradient-to-r from-blue-400 to-blue-500 p-6 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-yellow-400/20 backdrop-blur-sm">
                <ShoppingCart className="h-6 w-6 text-yellow-300" />
              </div>
              Confirmar Pré-Compra
            </DialogTitle>
            <p className="text-yellow-200/80 text-sm">
              {selectedProduct?.product_type} • {selectedProduct?.farmer_name}
            </p>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[55vh]">
            {/* Info Cards */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="bg-blue-500 p-2 rounded-xl">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">Processo de Pré-Compra</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Esta é uma demonstração de interesse. O agricultor será notificado e verificará a disponibilidade.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200">
                <div className="bg-yellow-500 p-2 rounded-xl">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 mb-2">Contatos Disponíveis</p>
                  <div className="flex flex-wrap gap-2">
                    <a href="tel:934745871" className="px-3 py-1.5 bg-white rounded-lg font-medium text-xs text-yellow-700 hover:bg-yellow-400 hover:text-white transition-colors shadow-sm">
                      934 745 871
                    </a>
                    <a href="tel:935358417" className="px-3 py-1.5 bg-white rounded-lg font-medium text-xs text-yellow-700 hover:bg-yellow-400 hover:text-white transition-colors shadow-sm">
                      935 358 417
                    </a>
                    <a href="tel:922717574" className="px-3 py-1.5 bg-white rounded-lg font-medium text-xs text-yellow-700 hover:bg-yellow-400 hover:text-white transition-colors shadow-sm">
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
                  <Badge variant="secondary" className="text-xs bg-yellow-400 text-white">Obrigatório</Badge>
                </label>
                <Input
                  type="number"
                  value={orderData.quantity || ''}
                  onChange={(e) => setOrderData({ ...orderData, quantity: Number(e.target.value) })}
                  min={1}
                  max={selectedProduct?.quantity}
                  className="h-12 text-base border-2 focus:border-yellow-400 rounded-xl"
                  placeholder="Digite a quantidade"
                />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Disponível: <span className="font-semibold text-yellow-500">{selectedProduct?.quantity.toLocaleString()} kg</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {t('order.deliveryLocation')}
                  <Badge variant="secondary" className="text-xs bg-yellow-400 text-white">Obrigatório</Badge>
                </label>
                <Input
                  placeholder={t('order.deliveryPlaceholder') || "Ex: Luanda, Viana"}
                  value={orderData.location}
                  onChange={(e) => setOrderData({ ...orderData, location: e.target.value })}
                  className="h-12 text-base border-2 focus:border-yellow-400 rounded-xl"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl space-y-3 border-2 border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Resumo do Pedido</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('order.subtotal')}:</span>
                  <span className="font-semibold">{formatPrice(orderData.quantity * (selectedProduct?.price || 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('order.logisticsFee')} (7.8%):</span>
                  <span className="font-semibold">{formatPrice(orderData.quantity * (selectedProduct?.price || 0) * TAX_RATE)}</span>
                </div>
                <div className="border-t-2 border-dashed border-blue-300 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="font-bold text-2xl text-yellow-500">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setModalOpen(false)} 
              className="flex-1 h-12 rounded-xl border-2 font-semibold hover:bg-blue-50"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handlePreOrderSubmit}
              disabled={isSubmitting || !orderData.location.trim() || orderData.quantity < 1}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
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
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in">
          <div className="bg-white p-10 rounded-3xl shadow-2xl border-2 border-yellow-400 flex flex-col items-center gap-5 max-w-sm mx-4 animate-scale-in">
            {/* Animated Icon */}
            <div className="relative">
              <div className="animate-spin h-20 w-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-blue-500 p-3 rounded-full animate-pulse">
                  <ShoppingCart className="h-8 w-8 text-yellow-300" />
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <p className="text-blue-600 text-xl font-bold">
                Processando Pedido
              </p>
              <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                <Zap className="h-4 w-4 animate-pulse text-yellow-400" />
                Aguarde um momento...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full animate-progress"></div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MAP MODAL ========== */}
      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-blue-400 to-blue-500 p-6 text-white">
            <DialogTitle className="text-xl font-bold mb-1">Localização do Produto</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-yellow-200">
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