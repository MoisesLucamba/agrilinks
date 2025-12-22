import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BarChart3, Search, LayoutDashboard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import agrilinkLogo from '@/assets/agrilink-logo.png'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useNavigate } from 'react-router-dom'
import { ProductCard, Product } from '@/components/ProductCard'
import { Bell, Phone } from 'lucide-react'

const MAPBOX_TOKEN = 'pk.eyJ1IjoibHVjYW1iYSIsImEiOiJjbWdqY293Z2QwaGRwMmlyNGlwNW4xYXhwIn0.qOjQNe8kbbfmdK5G0MHWDA'


const AppHome = () => {
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

  /*const mockProducts: Product[] = [
    {
      id: 'mock-1',
      product_type: 'Milho',
      description: 'Milho de alta qualidade, seco e pronto para venda a granel.',
      quantity: 5000,
      harvest_date: '2025-11-15',
      price: 150000,
      province_id: 'Luanda',
      municipality_id: 'Luanda',
      farmer_name: 'João Domingos',
      contact: '+244 923 456 789',
      photos: [
        'https://cdn.pixabay.com/photo/2016/03/26/16/44/tomatoes-1280859_640.jpg',
        'https://th.bing.com/th/id/R.5823e6ff9ba8294eec131a909b3d7b25?rik=ThNd5GGmJ6IxTQ&pid=ImgRaw&r=0',
        'https://cdn.pixabay.com/photo/2022/01/23/03/18/farming-6959638_960_720.jpg'
      ],
      status: 'active',
      created_at: new Date().toISOString(),
      user_id: 'mock-user-1',
      location_lat: -8.8383,
      location_lng: 13.2344
    },
    {
      id: 'mock-2',
      product_type: 'Feijão',
      description: 'Feijão fresco colhido diretamente do campo.',
      quantity: 3000,
      harvest_date: '2025-10-20',
      price: 200000,
      province_id: 'Huambo',
      municipality_id: 'Huambo',
      farmer_name: 'Maria Santos',
      contact: '+244 924 567 890',
      photos: [
        'https://cdn.pixabay.com/photo/2021/10/19/13/40/field-6723608_640.jpg',
        'https://cdn.pixabay.com/photo/2019/07/25/12/51/reed-bed-4362529_640.jpg',
        'https://cdn.pixabay.com/photo/2022/01/23/03/18/farming-6959638_960_720.jpg'
      ],
      status: 'active',
      created_at: new Date().toISOString(),
      user_id: 'mock-user-2',
      location_lat: -12.7761,
      location_lng: 15.7392
    }
  ]*/

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
          const { count: likesCount } = await supabase
            .from('product_likes')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id)

          const { data: userLike } = await supabase
            .from('product_likes')
            .select('id')
            .eq('product_id', product.id)
            .eq('user_id', user?.id || '')
            .single()

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

          return { ...product, likes_count: likesCount || 0, is_liked: !!userLike, comments: commentsWithUserInfo } as Product
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

      setProducts([...mockProducts, ...rankedProducts.slice(0, 20)])
    } catch {
      setProducts(mockProducts)
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

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="bg-background min-h-screen pb-6">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-green-600 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={agrilinkLogo} alt="AgriLink" className="h-12" />
          <div
  onClick={() => navigate('/search')}
  className="flex items-center justify-center p-2 rounded-full cursor-pointer 
             hover:bg-green-100 transition-colors duration-200"
>
  <Search className="h-6 w-6 text-green-500" />
</div>

        </div>
        {isAdmin ? (
          <Button variant="ghost" size="icon" onClick={() => navigate('/admindashboard')}>
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => navigate('/mercado')}>
            <BarChart3 className="h-5 w-5" />
          </Button>
        )}
      </div>
      {/* FEED */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 w-full">
        <div className="space-y-6 md:col-span-2">
          {products.map(product => (
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
      {/* MODAIS */}
<Dialog open={modalOpen} onOpenChange={setModalOpen}>
  <DialogContent className="sm:max-w-md bg-white border border-green-200 shadow-lg rounded-xl p-6 max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-xl flex items-center gap-2">
        <span className="text-green-600">🛒</span>
        Pré-Compra – {selectedProduct?.product_type}
      </DialogTitle>

      <DialogDescription className="text-sm text-gray-500 text-justify flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Bell className="w-4 h-4 text-green-500 mt-1" />
          A pré-compra é apenas uma demonstração de interesse. O agricultor receberá o pedido e verificará se consegue corresponder à sua solicitação, incluindo a localização.
        </div>
        <div className="flex items-start gap-2">
          <Bell className="w-4 h-4 text-green-500 mt-1" />
          Após alguns minutos, você será notificado aqui mesmo na plataforma com uma ligação e uma mensagem.
        </div>
        <div className="flex flex-col items-start gap-1">
          <Phone className="w-4 h-4 text-black mt-1" />
          Fique atento, pois os seguintes números podem entrar em contato quando alguém demonstrar interesse no produto:
          <div className="ml-5 mt-1 space-y-1">
            <div className="font-semibold">934 745 871</div>
            <div className="font-semibold">935 358 417</div>
            <div className="font-semibold">922 717 574</div>
          </div>
        </div>
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-5 py-4">
      {/* QUANTIDADE */}
      <div className="space-y-1">
        <label className="text-sm font-medium flex items-center gap-2">📦 Quantidade (kg)</label>
        <Input
          type="number"
          value={orderData.quantity || ''}
          onChange={(e) => setOrderData({ ...orderData, quantity: Number(e.target.value) })}
          min={1}
          max={selectedProduct?.quantity}
        />
        <p className="text-xs text-muted-foreground">
          Disponível: {selectedProduct?.quantity.toLocaleString()} kg
        </p>
      </div>

      {/* LOCAL */}
      <div className="space-y-1">
        <label className="text-sm font-medium flex items-center gap-2">📍 Local de Entrega</label>
        <Input
          placeholder="Ex: Luanda, Maianga"
          value={orderData.location}
          onChange={(e) => setOrderData({ ...orderData, location: e.target.value })}
        />
      </div>

      {/* RESUMO */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{formatPrice(orderData.quantity * (selectedProduct?.price || 0))}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Taxa de Logística (7,8%):</span>
          <span>{formatPrice(orderData.quantity * (selectedProduct?.price || 0) * 0.078)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span className="text-green-600">{formatPrice(totalPrice)}</span>
        </div>
      </div>
    </div>

    <DialogFooter className="flex justify-between">
      <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={handlePreOrderSubmit}
        disabled={isSubmitting || !orderData.location.trim()}
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-b-transparent" />
            Processando...
          </div>
        ) : (
          'Confirmar Pedido'
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
        Processando Pedido
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
        Aguarde um instante…
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
