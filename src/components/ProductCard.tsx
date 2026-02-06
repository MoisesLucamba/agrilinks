import React, { useState, useEffect, useRef, memo } from 'react'
import Slider from 'react-slick'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Heart, MessageCircle, Calendar, MapPin, Send, ChevronLeft, ChevronRight, 
  ShoppingCart, Reply, ThumbsUp, BadgeCheck, TrendingUp, Clock, Eye, Share2
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import "slick-carousel/slick/slick.css"
import "slick-carousel/slick/slick-theme.css"

interface CommentReply {
  id: string
  user_id: string
  reply_text: string
  created_at: string
  user_name?: string
  user_type?: string
}

interface Comment {
  id: string
  user_id: string
  comment_text: string
  created_at: string
  user_name: string
  user_type: string
  user_avatar?: string
  likes_count?: number
  is_liked?: boolean
  replies?: CommentReply[]
}

export interface Product {
  id: string
  product_type: string
  description?: string
  quantity: number
  harvest_date: string
  price: number
  province_id: string
  municipality_id: string
  farmer_name: string
  contact: string
  photos: string[] | null
  status: 'active' | 'inactive' | 'removed'
  created_at: string
  user_id: string
  location_lat?: number
  location_lng?: number
  likes_count?: number
  is_liked?: boolean
  comments?: Comment[]
  user_verified?: boolean
}

interface ProductCardProps {
  product: Product
  onProductUpdate?: (product: Product) => void
  onOpenMap?: (product: Product) => void
  onOpenPreOrder?: (product: Product) => void
}

const CustomPrevArrow = memo(({ onClick }: { onClick?: () => void }) => (
  <button 
    onClick={onClick} 
    className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-blue-600 p-2 rounded-full z-10 transition-all shadow-lg hover:scale-110 active:scale-95"
    aria-label="Imagem anterior"
  >
    <ChevronLeft className="h-5 w-5" />
  </button>
))

const CustomNextArrow = memo(({ onClick }: { onClick?: () => void }) => (
  <button 
    onClick={onClick} 
    className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-blue-600 p-2 rounded-full z-10 transition-all shadow-lg hover:scale-110 active:scale-95"
    aria-label="Próxima imagem"
  >
    <ChevronRight className="h-5 w-5" />
  </button>
))

CustomPrevArrow.displayName = 'CustomPrevArrow'
CustomNextArrow.displayName = 'CustomNextArrow'

export const ProductCard: React.FC<ProductCardProps> = memo(({ 
  product, 
  onProductUpdate,
  onOpenMap,
  onOpenPreOrder
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [commentVisible, setCommentVisible] = useState(false)
  const [comment, setComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const formatPrice = (p: number) => p.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }).replace('AOA', 'Kz')
  
  // Calcula desconto fictício para marketing (baseado em quantidade)
  const discount = product.quantity > 100 ? 15 : product.quantity > 50 ? 10 : 0
  const originalPrice = discount > 0 ? product.price / (1 - discount / 100) : product.price

  // Verificar se é produto "novo" (últimos 7 dias)
  const isNew = (new Date().getTime() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24) < 7

  useEffect(() => {
    if (mapModalOpen && mapContainerRef.current && product.location_lat && product.location_lng) {
      mapboxgl.accessToken = 'pk.eyJ1IjoiYWdyaWxpbmthbyIsImEiOiJjbWJyaWNjOW8wYm5jMnFxdHJjNTZkZGN0In0.gYkUQOzg2xHYeS4CCbU-cw'
      
      if (mapRef.current) mapRef.current.remove()

      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [product.location_lng, product.location_lat],
        zoom: 13,
      })

      new mapboxgl.Marker({ color: '#FBBF24' })
        .setLngLat([product.location_lng, product.location_lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${product.product_type}</strong><br/>${product.farmer_name}`))
        .addTo(mapRef.current)

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [mapModalOpen, product])

  const toggleLike = async () => {
    if (!user) return toast.error('Faça login para dar like')
    if (!onProductUpdate) return
    
    const optimisticUpdate = {
      ...product,
      is_liked: !product.is_liked,
      likes_count: product.is_liked ? (product.likes_count || 1) - 1 : (product.likes_count || 0) + 1
    }
    onProductUpdate(optimisticUpdate)

    try {
      if (product.is_liked) {
        await supabase.from('product_likes').delete().eq('product_id', product.id).eq('user_id', user.id)
      } else {
        await supabase.from('product_likes').insert({ product_id: product.id, user_id: user.id })
      }
    } catch {
      onProductUpdate(product)
      toast.error('Erro ao processar like')
    }
  }

  const addComment = async () => {
    if (!user || !comment.trim()) return toast.error('Faça login ou escreva um comentário')
    if (!onProductUpdate) return
    
    try {
      const { data: newComment } = await supabase
        .from('product_comments')
        .insert({ product_id: product.id, user_id: user.id, comment_text: comment.trim() })
        .select()
        .single()

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, user_type, avatar_url')
        .eq('id', user.id)
        .single()

      const commentWithUserInfo: Comment = { 
        ...newComment, 
        user_name: userData?.full_name || 'Usuário', 
        user_type: userData?.user_type || 'agricultor',
        user_avatar: userData?.avatar_url,
        likes_count: 0,
        is_liked: false,
        replies: []
      }

      onProductUpdate({ 
        ...product, 
        comments: [commentWithUserInfo, ...(product.comments || [])] 
      })
      setComment('')
      toast.success('Comentário adicionado!')
    } catch {
      toast.error('Erro ao adicionar comentário')
    }
  }

  const toggleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!user) return toast.error('Faça login para reagir')
    if (!onProductUpdate) return
    
    try {
      if (isLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
      }
      
      const updatedComments = product.comments?.map(c => 
        c.id === commentId ? {
          ...c,
          is_liked: !isLiked,
          likes_count: isLiked ? (c.likes_count || 1) - 1 : (c.likes_count || 0) + 1
        } : c
      )
      
      onProductUpdate({ ...product, comments: updatedComments })
    } catch {
      toast.error('Erro ao processar reação')
    }
  }

  const addReply = async (commentId: string) => {
    if (!user || !replyText.trim()) return toast.error('Escreva uma resposta')
    if (!onProductUpdate) return
    
    try {
      const { data: newReply } = await supabase
        .from('comment_replies')
        .insert({ comment_id: commentId, user_id: user.id, reply_text: replyText.trim() })
        .select()
        .single()

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, user_type')
        .eq('id', user.id)
        .single()

      const replyWithUser: CommentReply = {
        ...newReply,
        user_name: userData?.full_name || 'Usuário',
        user_type: userData?.user_type || 'agricultor'
      }

      const updatedComments = product.comments?.map(c =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), replyWithUser] } : c
      )

      onProductUpdate({ ...product, comments: updatedComments })
      setReplyText('')
      setReplyingTo(null)
      toast.success('Resposta adicionada!')
    } catch {
      toast.error('Erro ao adicionar resposta')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.product_type,
          text: `Confira ${product.product_type} por ${formatPrice(product.price)}!`,
          url: window.location.href
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado!')
    }
  }

  const sliderSettings = {
    dots: true,
    infinite: product.photos && product.photos.length > 1,
    fade: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: product.photos && product.photos.length > 1,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    lazyLoad: 'progressive' as const,
  }

  return (
    <>
      <Card 
        className="overflow-hidden bg-white border border-blue-100 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-500 group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Badges de destaque */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-0 shadow-lg text-xs font-bold px-3 py-1">
              ✨ NOVO
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-0 shadow-lg text-xs font-bold px-3 py-1 animate-pulse">
              -{discount}% OFF
            </Badge>
          )}
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
          aria-label="Compartilhar"
        >
          <Share2 className="h-4 w-4 text-blue-500 hover:text-yellow-500 transition-colors" />
        </button>

        {/* Images */}
        <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 aspect-[4/3] overflow-hidden">
          {product.photos && product.photos.length > 0 ? (
            <Slider {...sliderSettings}>
              {product.photos.map((photo, i) => (
                <div key={i} className="relative aspect-[4/3]">
                  <img 
                    src={photo} 
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      imageLoaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                    } ${isHovered ? 'scale-105' : 'scale-100'}`}
                    alt={`${product.product_type} - imagem ${i + 1}`}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              ))}
            </Slider>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">📦</div>
                <span className="text-gray-400 text-sm font-medium">Produto sem imagem</span>
              </div>
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-900/40 to-transparent pointer-events-none" />
        </div>

        <CardContent className="p-5 space-y-4 bg-white">
          {/* Header com Avatar e Info */}
          <div className="flex items-start gap-3">
            <Avatar 
              className="h-12 w-12 ring-2 ring-yellow-400 cursor-pointer hover:ring-yellow-500 transition-all hover:scale-105 shadow-md"
              onClick={() => navigate(`/perfil/${product.user_id}`)}
            >
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white font-bold">
                {product.farmer_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 
                  className="font-bold text-base text-gray-900 cursor-pointer hover:text-blue-500 transition-colors truncate"
                  onClick={() => navigate(`/perfil/${product.user_id}`)}
                >
                  {product.farmer_name}
                </h3>
                {product.user_verified && (
                  <BadgeCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />
                <span className="truncate">{product.province_id}, {product.municipality_id}</span>
              </div>
            </div>

            <Badge className="shrink-0 bg-yellow-400 text-white border-0 font-semibold text-xs px-2.5 py-1">
              {product.product_type}
            </Badge>
          </div>

          {/* Título e Preço - DESTAQUE PRINCIPAL */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xl text-blue-600 leading-tight">
              {product.product_type}
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black text-yellow-500 tracking-tight">
                  {formatPrice(product.price)}
                </span>
                {discount > 0 && (
                  <span className="text-sm text-gray-400 line-through font-medium">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-blue-600/70 font-medium flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-yellow-500" />
                {product.quantity.toLocaleString()} kg em estoque
              </p>

              {/* CTA Principal - CORRIGIDO */}
              {onOpenPreOrder && (
                <Button
                  size="lg"
                  onClick={() => onOpenPreOrder(product)}
                  className="relative w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-500 text-white font-extrabold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-95 h-12 rounded-xl border-2 border-blue-100 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  <ShoppingCart className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                  <span className="relative z-10">COMPRAR AGORA</span>
                </Button>
              )}
            </div>
          </div>

          {/* Descrição */}
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Info adicional */}
          <div className="flex items-center gap-4 text-xs text-blue-600/60 flex-wrap pt-2 border-t border-blue-50">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-4 w-4 text-yellow-500" /> 
              Colheita: {formatDate(product.harvest_date)}
            </span>
            {product.location_lat && product.location_lng && (
              <button
                onClick={() => setMapModalOpen(true)}
                className="flex items-center gap-1.5 text-yellow-500 hover:text-yellow-600 font-semibold transition-colors"
              >
                <MapPin className="h-4 w-4" /> 
                Ver Localização
              </button>
            )}
          </div>

          {/* Social Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-blue-50">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLike}
                className={`h-10 px-3 rounded-xl transition-all hover:scale-105 ${
                  product.is_liked 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-blue-400 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <Heart className={`h-5 w-5 ${product.is_liked ? 'fill-current' : ''}`} />
                {product.likes_count ? (
                  <span className="ml-1.5 text-sm font-bold">{product.likes_count}</span>
                ) : null}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCommentVisible(!commentVisible)}
                className={`h-10 px-3 rounded-xl transition-all hover:scale-105 ${
                  commentVisible 
                    ? 'text-yellow-500 bg-yellow-50 border border-yellow-200' 
                    : 'text-blue-400 hover:text-yellow-500 hover:bg-yellow-50'
                }`}
              >
                <MessageCircle className="h-5 w-5" />
                {product.comments?.length ? (
                  <span className="ml-1.5 text-sm font-bold">{product.comments.length}</span>
                ) : null}
              </Button>
            </div>

            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <Clock className="h-3.5 w-3.5 ml-2" />
              {formatDate(product.created_at)}
            </span>
          </div>

          {/* Comments Section */}
          {commentVisible && (
            <div className="pt-4 space-y-3 border-t border-blue-50 animate-in slide-in-from-top duration-300">
              <div className="flex gap-2">
                <Input
                  placeholder="Adicione um comentário..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                  className="flex-1 h-11 text-sm rounded-xl border-blue-200 focus:border-yellow-400 focus:ring-yellow-400/20 transition-all"
                />
                <Button 
                  size="sm" 
                  onClick={addComment} 
                  disabled={!comment.trim()}
                  className="h-11 w-11 p-0 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {product.comments?.length ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
                  {product.comments.map(c => (
                    <div key={c.id} className="bg-blue-50 rounded-2xl p-4 border border-blue-100 hover:border-yellow-300 transition-colors">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 shadow-sm ring-2 ring-white">
                          {c.user_avatar ? (
                            <img src={c.user_avatar} alt={c.user_name} className="h-full w-full object-cover" />
                          ) : (
                            <AvatarFallback className="text-xs bg-blue-500 text-white font-semibold">
                              {c.user_name.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900">{c.user_name}</span>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-white border-blue-200">
                              {c.user_type}
                            </Badge>
                            <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                          </div>
                          <p className="text-sm mt-1.5 text-gray-700 leading-relaxed">{c.comment_text}</p>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <button
                              onClick={() => toggleCommentLike(c.id, c.is_liked || false)}
                              className={`flex items-center gap-1.5 text-xs font-medium transition-all hover:scale-105 ${
                                c.is_liked ? 'text-red-500' : 'text-blue-400 hover:text-red-500'
                              }`}
                            >
                              <ThumbsUp className={`h-3.5 w-3.5 ${c.is_liked ? 'fill-current' : ''}`} />
                              {c.likes_count || 'Curtir'}
                            </button>
                            <button
                              onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                              className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-yellow-500 transition-colors"
                            >
                              <Reply className="h-3.5 w-3.5" />
                              Responder
                            </button>
                          </div>

                          {replyingTo === c.id && (
                            <div className="flex gap-2 mt-3 animate-in slide-in-from-top duration-200">
                              <Input
                                placeholder="Sua resposta..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addReply(c.id) } }}
                                className="flex-1 h-9 text-xs rounded-lg border-blue-200 focus:border-yellow-400"
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                onClick={() => addReply(c.id)} 
                                className="h-9 w-9 p-0 rounded-lg bg-blue-500 hover:bg-blue-600"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}

                          {c.replies && c.replies.length > 0 && (
                            <div className="mt-3 pl-4 border-l-2 border-yellow-300 space-y-2">
                              {c.replies.map(reply => (
                                <div key={reply.id} className="text-xs bg-white rounded-lg p-2 border border-blue-100">
                                  <span className="font-semibold text-gray-900">{reply.user_name}</span>
                                  <span className="text-gray-400 mx-1.5">·</span>
                                  <span className="text-gray-600">{reply.reply_text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-blue-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 font-medium">Seja o primeiro a comentar!</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal do Mapa */}
      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl border-2 border-blue-100">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-blue-400 to-blue-500">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <MapPin className="h-6 w-6 text-yellow-300" />
              Localização do Produto
            </DialogTitle>
          </DialogHeader>
          <div ref={mapContainerRef} className="w-full h-[450px]" />
          <div className="p-6 pt-4 bg-blue-50 flex items-center justify-between border-t border-blue-100">
            <div>
              <p className="font-bold text-blue-600 text-lg">{product.product_type}</p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">{product.farmer_name}</span> · {product.province_id}, {product.municipality_id}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setMapModalOpen(false)}
              className="rounded-xl border-2 border-blue-200 hover:border-yellow-400 hover:text-blue-600 hover:bg-yellow-50"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

ProductCard.displayName = 'ProductCard'