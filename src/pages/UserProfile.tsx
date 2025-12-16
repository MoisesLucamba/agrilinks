import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, Calendar, Package, MessageCircle, Phone } from 'lucide-react';
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
}

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Se for o próprio usuário, redireciona para /perfil
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
      
      // Buscar dados do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, user_type, province_id, municipality_id, created_at')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setUserData(profileData);

      // Buscar produtos do usuário (se for agricultor ou agente)
      if (profileData?.user_type !== 'comprador') {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (!productsError && productsData) {
          // Buscar likes para cada produto
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
                comments: Array(commentsCount || 0).fill({}) // Placeholder para contagem
              } as Product;
            })
          );
          setProducts(productsWithData);
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
      // Verificar se já existe uma conversa
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user_id.eq.${user.id},participant_id.eq.${id}),and(user_id.eq.${id},participant_id.eq.${user.id})`)
        .limit(1);

      if (existingConv && existingConv.length > 0) {
        navigate(`/messages/${existingConv[0].id}`);
        return;
      }

      // Criar nova conversa
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          participant_id: id,
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
      case 'agricultor': return 'bg-green-100 text-green-700';
      case 'comprador': return 'bg-blue-100 text-blue-700';
      case 'agente': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
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
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Perfil</h1>
      </header>

      {/* Perfil */}
      <div className="p-4 space-y-4">
        {/* Card do perfil */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20">
                <AvatarImage src={userData.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {userData.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <h2 className="text-xl font-bold">{userData.full_name}</h2>
              
              <Badge className={`mt-2 ${getUserTypeColor(userData.user_type)}`}>
                {getUserTypeLabel(userData.user_type)}
              </Badge>

              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{userData.province_id}, {userData.municipality_id}</span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Membro desde {new Date(userData.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
              </div>

              {/* Botão para enviar mensagem */}
              <Button 
                onClick={startConversation}
                className="mt-4 w-full max-w-xs"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Produtos do usuário (se não for comprador) */}
        {userData.user_type !== 'comprador' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos ({products.length})
            </h3>

            {products.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
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
