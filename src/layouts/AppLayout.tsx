import React from 'react'
import { useLocation } from 'react-router-dom'
import BottomNavigation from '@/components/BottomNavigation'
import FloatingActionButton from '@/components/FloatingActionButton'

interface AppLayoutProps {
  children: React.ReactNode
}

// Páginas onde o BottomNavigation não deve aparecer
const HIDDEN_NAV_ROUTES = ['/mapa', '/notificacoes', '/listamensagens', '/messages']

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation()
  
  // Verificar se deve esconder a navegação inferior
  const shouldHideNav = HIDDEN_NAV_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith('/messages/')
  )

  return (
    <div className="min-h-screen bg-background">
      {children}
      {!shouldHideNav && <FloatingActionButton />}
      {!shouldHideNav && <BottomNavigation />}
    </div>
  )
}

export default AppLayout