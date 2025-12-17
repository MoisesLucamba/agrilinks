import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, MapPin, Calendar, Package, MessageCircle, Phone, 
  CheckCircle, Star, Eye, ShoppingCart, Users, Verified 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ProductCard, Product } from '@/components/ProductCard';

interface UserData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: 'agricultor' | 'comprador' | 'agente' | null;
  province_id: string;
  municipality_id: string;
  created_at: string;
  phone?: string;
  agent_code?: string;
}

interface UserStats {
  totalProducts: number;
  totalSales: number;
  totalReferrals: number;
  rating: number;
}

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalProducts: 0, totalSales: 0, totalReferrals: 0, rating: 4.5 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      if (user?.id === id) {
        navigate('/perfil', { replace: true });
        return;
      }
      fetchUserData();
    }
  }, [id, user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, user_type, province_id, municipality_id, created_at, phone, agent_code')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setUserData(profileData);

      // Buscar produtos do usuário
      if (profileData?.user_type !== 'comprador') {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (!productsError && productsData) {
          const productsWithData = await Promise.all(
            productsData.map(async (product) => {
              const { count: likesCount } = await supabase
                .from('product_likes')
                .select('*', { count: 'exact', head: true })
                .eq('product_id', product.id);

              const { data: userLike } = await supabase
                .from('product_likes')
                .select('id')
                .eq('product_id', product.id)
                .eq('user_id', user?.id || '')
                .maybeSingle();

              const { count: commentsCount } = await supabase
                .from('product_comments')
                .select('*', { count: 'exact', head: true })
                .eq('product_id', product.id);

              return {
                ...product,
                likes_count: likesCount || 0,
                is_liked: !!userLike,
                comments: Array(commentsCount || 0).fill({})
              } as Product;
            })
          );
          setProducts(productsWithData);
          setStats(prev => ({ ...prev, totalProducts: productsWithData.length }));
        }
      }

      // Buscar estatísticas de vendas (pedidos aceitos)
      const { count: salesCount } = await supabase
        .from('pre_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .in('product_id', (await supabase.from('products').select('id').eq('user_id', id)).data?.map(p => p.id) || []);

      setStats(prev => ({ ...prev, totalSales: salesCount || 0 }));

      // Para agentes, buscar indicações
      if (profileData?.user_type === 'agente') {
        const { data: referralData } = await supabase.rpc('get_agent_referral_stats', { agent_user_id: id });
        if (referralData && referralData.length > 0) {
          setStats(prev => ({ ...prev, totalReferrals: Number(referralData[0].total_referrals) || 0 }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const startConversation = async () => {
    if (!user || !id) return;

    try {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user_id.eq.${user.id},peer_user_id.eq.${id}),and(user_id.eq.${id},peer_user_id.eq.${user.id})`)
        .limit(1);

      if (existingConv && existingConv.length > 0) {
        navigate(`/messages/${existingConv[0].id}`);
        return;
      }

      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          peer_user_id: id,
          title: userData?.full_name || 'Usuário',
          avatar: userData?.avatar_url,
          last_timestamp: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;
      navigate(`/messages/${newConv.id}`);
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

  const getUserTypeLabel = (type: string | null) => {
    switch (type) {
      case 'agricultor': return 'Agricultor';
      case 'comprador': return 'Comprador';
      case 'agente': return 'Agente';
      default: return 'Usuário';
    }
  };

  const getUserTypeColor = (type: string | null) => {
    switch (type) {
      case 'agricultor': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'comprador': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'agente': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUserTypeIcon = (type: string | null) => {
    switch (type) {
      case 'agricultor': return <Package className="h-3 w-3" />;
      case 'comprador': return <ShoppingCart className="h-3 w-3" />;
      case 'agente': return <Users className="h-3 w-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Usuário não encontrado</p>
        <Button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/app')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/app')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Perfil do Usuário</h1>
      </header>

      {/* Hero Section com Avatar */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
        <div className="px-4 -mt-16">
          <div className="flex flex-col items-center">
            <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
              <AvatarImage src={userData.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {userData.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="mt-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold">{userData.full_name}</h2>
                <CheckCircle className="h-5 w-5 text-primary fill-primary/20" />
              </div>
              
              <Badge variant="outline" className={`mt-2 ${getUserTypeColor(userData.user_type)}`}>
                {getUserTypeIcon(userData.user_type)}
                <span className="ml-1">{getUserTypeLabel(userData.user_type)}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="px-4 mt-6 space-y-4">
        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center border-none shadow-sm bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Produtos</p>
            </CardContent>
          </Card>
          <Card className="text-center border-none shadow-sm bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground">Vendas</p>
            </CardContent>
          </Card>
          <Card className="text-center border-none shadow-sm bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-bold">{stats.rating}</span>
              </div>
              <p className="text-xs text-muted-foreground">Avaliação</p>
            </CardContent>
          </Card>
        </div>

        {/* Informações de Contato */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Localização</p>
                <p className="font-medium">{userData.province_id}, {userData.municipality_id}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-3 text-sm">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Membro desde</p>
                <p className="font-medium">{new Date(userData.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            {userData.user_type === 'agente' && userData.agent_code && (
              <>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Verified className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Código de Agente</p>
                    <p className="font-mono font-bold text-purple-600">{userData.agent_code}</p>
                  </div>
                </div>
              </>
            )}

            {userData.user_type === 'agente' && stats.totalReferrals > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Indicações</p>
                    <p className="font-bold text-green-600">{stats.totalReferrals} usuários indicados</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Button onClick={startConversation} className="flex-1 h-12 shadow-sm">
            <MessageCircle className="h-5 w-5 mr-2" />
            Enviar Mensagem
          </Button>
          {userData.phone && (
            <Button 
              variant="outline" 
              className="h-12 w-12 p-0"
              onClick={() => window.open(`tel:${userData.phone}`, '_self')}
            >
              <Phone className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Produtos do usuário */}
        {userData.user_type !== 'comprador' && (
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Produtos Publicados
              </h3>
              <Badge variant="secondary">{products.length}</Badge>
            </div>

            {products.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum produto publicado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onProductUpdate={handleProductUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;