import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, Map, Bell, MessageSquare, User, Plus, FileText, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

const BottomNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile, isAdmin, user } = useAuth()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Buscar contagem de notificações e mensagens não lidas
  useEffect(() => {
    if (!user?.id) return

    const fetchCounts = async () => {
      // Notificações não lidas
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      setUnreadNotifications(notifCount || 0)

      // Mensagens não lidas
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false)

      setUnreadMessages(msgCount || 0)
    }

    fetchCounts()

    // Escutar mudanças em tempo real
    const notifChannel = supabase
      .channel('notifications-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, fetchCounts)
      .subscribe()

    const msgChannel = supabase
      .channel('messages-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, fetchCounts)
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [user?.id])

  // Determinar o ícone e caminho de publicação baseado no tipo de usuário
  const getPublishAction = () => {
    if (!userProfile) return null
    
    if (userProfile.user_type === 'comprador') {
      return { icon: FileText, label: 'Ficha', path: '/ficharecebimento', badge: 0 }
    } else {
      return { icon: Plus, label: 'Publicar', path: '/publicar-produto', badge: 0 }
    }
  }

  const publishAction = getPublishAction()

  // Para admins, mostrar Dashboard em vez de Mapa
  const navItems = [
    { icon: Home, label: 'Home', path: '/app', badge: 0 },
    ...(publishAction ? [publishAction] : []),
    // Admins veem Dashboard, outros veem Mapa
    isAdmin 
      ? { icon: LayoutDashboard, label: 'Dashboard', path: '/admindashboard', badge: 0 }
      : { icon: Map, label: 'Mapa', path: '/mapa', badge: 0 },
    { icon: Bell, label: 'Alertas', path: '/notificacoes', badge: unreadNotifications },
    { icon: MessageSquare, label: 'Chat', path: '/listamensagens', badge: unreadMessages },
    { icon: User, label: 'Perfil', path: '/perfil', badge: 0 }
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
      <div className="grid grid-cols-6 gap-1 p-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={`relative flex flex-col items-center gap-1 h-auto py-2 px-1 ${
              isActive(item.path)
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1 animate-pulse">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export default BottomNavigation