import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Home, Map, Bell, MessageSquare, User, Plus, FileText, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

const BottomNavigation = () => {
  const { t } = useTranslation()
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
      return { icon: FileText, label: t('profile.fichas'), path: '/ficharecebimento', badge: 0 }
    } else {
      return { icon: Plus, label: t('navigation.publish'), path: '/publicar-produto', badge: 0 }
    }
  }

  const publishAction = getPublishAction()

  // Para admins, mostrar Dashboard em vez de Mapa
  const navItems = [
    { icon: Home, label: t('navigation.home'), path: '/app', badge: 0 },
    ...(publishAction ? [publishAction] : []),
    // Admins veem Dashboard, outros veem Mapa
    isAdmin 
      ? { icon: LayoutDashboard, label: t('navigation.dashboard'), path: '/admindashboard', badge: 0 }
      : { icon: Map, label: t('navigation.map'), path: '/mapa', badge: 0 },
    { icon: Bell, label: t('navigation.notifications'), path: '/notificacoes', badge: unreadNotifications },
    { icon: MessageSquare, label: t('navigation.messages'), path: '/listamensagens', badge: unreadMessages },
    { icon: User, label: t('navigation.profile'), path: '/perfil', badge: 0 }
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-6 gap-0.5 px-1 py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`
                relative flex flex-col items-center gap-0.5 h-auto py-2 px-1 rounded-xl
                transition-all duration-200
                ${active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <div className="relative">
                <item.icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full px-1 animate-pulse-soft">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavigation