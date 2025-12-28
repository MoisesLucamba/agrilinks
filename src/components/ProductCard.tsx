import React, { useState } from 'react'
import Slider from 'react-slick'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Heart, MessageCircle, Calendar, MapPin, Send, ChevronLeft, ChevronRight, ShoppingCart, Reply, ThumbsUp, BadgeCheck } from 'lucide-react'
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

const CustomPrevArrow = ({ onClick }: { onClick?: () => void }) => (
  <button onClick={onClick} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full z-10 transition-all">
    <ChevronLeft className="h-4 w-4" />
  </button>
)

const CustomNextArrow = ({ onClick }: { onClick?: () => void }) => (
  <button onClick={onClick} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full z-10 transition-all">
    <ChevronRight className="h-4 w-4" />
  </button>
)

export const ProductCard: React.FC<ProductCardProps> = ({ 
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
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<mapboxgl.Map | null>(null)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')
  const formatPrice = (p: number) => `${p.toLocaleString()} Kz`

  // Inicializar mapa quando modal abre
  React.useEffect(() => {
    if (mapModalOpen && mapContainerRef.current && product.location_lat && product.location_lng) {
      mapboxgl.accessToken = 'pk.eyJ1IjoiYWdyaWxpbmthbyIsImEiOiJjbWJyaWNjOW8wYm5jMnFxdHJjNTZkZGN0In0.gYkUQOzg2xHYeS4CCbU-cw'
      
      if (mapRef.current) {
        mapRef.current.remove()
      }

      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [product.location_lng, product.location_lat],
        zoom: 13,
      })

      new mapboxgl.Marker({ color: '#22c55e' })
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
    try {
      if (product.is_liked) {
        await supabase.from('product_likes').delete().eq('product_id', product.id).eq('user_id', user.id)
        onProductUpdate({ ...product, is_liked: false, likes_count: (product.likes_count || 1) - 1 })
      } else {
        await supabase.from('product_likes').insert({ product_id: product.id, user_id: user.id })
        onProductUpdate({ ...product, is_liked: true, likes_count: (product.likes_count || 0) + 1 })
      }
    } catch {
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
      
      const updatedComments = product.comments?.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            is_liked: !isLiked,
            likes_count: isLiked ? (c.likes_count || 1) - 1 : (c.likes_count || 0) + 1
          }
        }
        return c
      })
      
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

      const updatedComments = product.comments?.map(c => {
        if (c.id === commentId) {
          return { ...c, replies: [...(c.replies || []), replyWithUser] }
        }
        return c
      })

      onProductUpdate({ ...product, comments: updatedComments })
      setReplyText('')
      setReplyingTo(null)
      toast.success('Resposta adicionada!')
    } catch {
      toast.error('Erro ao adicionar resposta')
    }
  }

  const handleOpenMap = () => {
    if (product.location_lat && product.location_lng) {
      setMapModalOpen(true)
    } else if (onOpenMap) {
      onOpenMap(product)
    }
  }

  const sliderSettings = {
    dots: true,
    infinite: true,
    fade: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: true,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />
  }

  return (
    <>
      <Card className="overflow-hidden bg-card border border-border rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 group">
        {/* Header */}
        <div className="p-3.5 flex items-center gap-3 border-b border-border/50">
          <Avatar 
            className="h-10 w-10 ring-2 ring-border cursor-pointer hover:ring-primary/50 transition-all"
            onClick={() => navigate(`/perfil/${product.user_id}`)}
          >
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {product.farmer_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 
                className="font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/perfil/${product.user_id}`)}
              >
                {product.farmer_name}
              </h3>
              {product.user_verified && (
                <span title="Perfil verificado pela AgriLink">
                  <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {product.province_id}, {product.municipality_id}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0 font-medium">
            {product.product_type}
          </Badge>
        </div>

        {/* Images */}
        <div className="relative bg-muted aspect-[4/3]">
          {product.photos && product.photos.length > 0 ? (
            <Slider {...sliderSettings}>
              {product.photos.map((photo, i) => (
                <div key={i} className="relative aspect-[4/3]">
                  <img 
                    src={photo} 
                    className="w-full h-full object-cover" 
                    alt={product.product_type}
                    loading="lazy"
                  />
                </div>
              ))}
            </Slider>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground text-sm">Sem imagem</span>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Price and Info */}
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h4 className="font-bold text-base leading-tight">{product.product_type}</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {product.quantity.toLocaleString()} kg disponíveis
              </p>
            </div>
            <span className="text-lg font-bold text-primary whitespace-nowrap">
              {formatPrice(product.price)}
            </span>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Date and Location */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {formatDate(product.harvest_date)}
            </span>
            {product.location_lat && product.location_lng && (
              <button
                onClick={handleOpenMap}
                className="flex items-center gap-1.5 text-primary hover:underline font-medium transition-colors"
              >
                <MapPin className="h-4 w-4" /> Ver no Mapa
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLike}
                className={`h-9 px-2.5 rounded-xl ${
                  product.is_liked 
                    ? 'text-destructive hover:text-destructive' 
                    : 'text-muted-foreground hover:text-destructive'
                }`}
              >
                <Heart className={`h-5 w-5 ${product.is_liked ? 'fill-current' : ''}`} />
                {product.likes_count ? (
                  <span className="ml-1 text-sm font-medium">{product.likes_count}</span>
                ) : null}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCommentVisible(!commentVisible)}
                className="h-9 px-2.5 rounded-xl text-muted-foreground hover:text-primary"
              >
                <MessageCircle className="h-5 w-5" />
                {product.comments?.length ? (
                  <span className="ml-1 text-sm font-medium">{product.comments.length}</span>
                ) : null}
              </Button>
            </div>

            {onOpenPreOrder && (
              <Button
                size="sm"
                onClick={() => onOpenPreOrder(product)}
                className="h-9 px-4 rounded-xl shadow-soft"
              >
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                Pré-Compra
              </Button>
            )}
          </div>

          {/* Comments Section */}
          {commentVisible && (
            <div className="pt-3 space-y-3 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  placeholder="Escreva um comentário..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') addComment() }}
                  className="flex-1 h-10 text-sm rounded-xl"
                />
                <Button size="sm" onClick={addComment} className="h-10 w-10 p-0 rounded-xl">
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {product.comments?.length ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-hide">
                  {product.comments.map(c => (
                    <div key={c.id} className="bg-muted/50 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-7 w-7">
                          {c.user_avatar ? (
                            <img src={c.user_avatar} alt={c.user_name} className="h-full w-full object-cover rounded-full" />
                          ) : (
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{c.user_name.charAt(0)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{c.user_name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.user_type}</Badge>
                            <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                          </div>
                          <p className="text-sm mt-1">{c.comment_text}</p>
                          
                          {/* Ações do comentário */}
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => toggleCommentLike(c.id, c.is_liked || false)}
                              className={`flex items-center gap-1 text-xs transition-colors ${c.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                            >
                              <ThumbsUp className={`h-3.5 w-3.5 ${c.is_liked ? 'fill-current' : ''}`} />
                              {c.likes_count ? c.likes_count : 'Curtir'}
                            </button>
                            <button
                              onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary"
                            >
                              <Reply className="h-3.5 w-3.5" />
                              Responder
                            </button>
                          </div>

                          {/* Campo de resposta */}
                          {replyingTo === c.id && (
                            <div className="flex gap-2 mt-2">
                              <Input
                                placeholder="Escreva uma resposta..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') addReply(c.id) }}
                                className="flex-1 h-8 text-xs"
                              />
                              <Button size="sm" onClick={() => addReply(c.id)} className="h-8 w-8 p-0">
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* Respostas */}
                          {c.replies && c.replies.length > 0 && (
                            <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-2">
                              {c.replies.map(reply => (
                                <div key={reply.id} className="text-xs">
                                  <span className="font-medium">{reply.user_name}</span>
                                  <span className="text-gray-400 mx-1">·</span>
                                  <span className="text-gray-500">{reply.reply_text}</span>
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
                <p className="text-sm text-gray-400 text-center py-4">Seja o primeiro a comentar!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal do Mapa */}
      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Localização: {product.product_type}
            </DialogTitle>
          </DialogHeader>
          <div ref={mapContainerRef} className="w-full h-[400px]" />
          <div className="p-4 pt-2 bg-gray-50 flex items-center justify-between">
            <div>
              <p className="font-medium">{product.farmer_name}</p>
              <p className="text-sm text-gray-500">{product.province_id}, {product.municipality_id}</p>
            </div>
            <Button variant="outline" onClick={() => setMapModalOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
