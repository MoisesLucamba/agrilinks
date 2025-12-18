import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import usePushNotifications from '@/components/usePushNotifications';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Heart,
  MessageCircle,
  Package,
  CheckCircle,
  Settings,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: 'interest' | 'message' | 'product' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
  user_id: string;
}

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'interest' | 'message' | 'product' | 'system';
  timestamp: number;
}

// --- Gerenciador de Som ---

class SoundManager {
  private audioContext: AudioContext | null = null;
  private isSupported: boolean = true;

  constructor() {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('AudioContext não suportado:', error);
      this.isSupported = false;
    }
  }

  // Som de pintos de galinhas (síntese de áudio)
  playChickenSound() {
    if (!this.isSupported || !this.audioContext) {
      this.playFallbackSound();
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Criar osciladores para simular som de galinha
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const gain2 = ctx.createGain();

      // Configurar osciladores
      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Frequências do som de galinha (pinto)
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(400, now + 0.1);

      osc2.frequency.setValueAtTime(1200, now);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.1);

      // Volume
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      // Conectar
      osc1.connect(gain);
      osc2.connect(gain2);
      gain.connect(ctx.destination);
      gain2.connect(ctx.destination);

      // Reproduzir
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.15);
      osc2.stop(now + 0.15);

      // Repetir som 3 vezes
      for (let i = 1; i < 3; i++) {
        const osc3 = ctx.createOscillator();
        const osc4 = ctx.createOscillator();
        const g1 = ctx.createGain();
        const g2 = ctx.createGain();

        osc3.type = 'sine';
        osc4.type = 'triangle';

        osc3.frequency.setValueAtTime(800, now + i * 0.2);
        osc3.frequency.exponentialRampToValueAtTime(400, now + i * 0.2 + 0.1);

        osc4.frequency.setValueAtTime(1200, now + i * 0.2);
        osc4.frequency.exponentialRampToValueAtTime(600, now + i * 0.2 + 0.1);

        g1.gain.setValueAtTime(0.3, now + i * 0.2);
        g1.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.15);

        g2.gain.setValueAtTime(0.2, now + i * 0.2);
        g2.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.15);

        osc3.connect(g1);
        osc4.connect(g2);
        g1.connect(ctx.destination);
        g2.connect(ctx.destination);

        osc3.start(now + i * 0.2);
        osc4.start(now + i * 0.2);
        osc3.stop(now + i * 0.2 + 0.15);
        osc4.stop(now + i * 0.2 + 0.15);
      }
    } catch (error) {
      console.error('Erro ao reproduzir som:', error);
      this.playFallbackSound();
    }
  }

  // Som alternativo (fallback)
  playFallbackSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.play().catch(() => {
        console.log('Áudio não pode ser reproduzido');
      });
    } catch (error) {
      console.warn('Fallback sound não disponível:', error);
    }
  }

  // Som de alerta genérico
  playAlertSound() {
    if (!this.isSupported || !this.audioContext) {
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.2);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (error) {
      console.error('Erro ao reproduzir alerta:', error);
    }
  }
}

// --- Componente Toast de Notificação ---

interface NotificationToastProps {
  notification: ToastNotification;
  onClose: (id: string) => void;
  soundEnabled: boolean;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  soundEnabled,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 6000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const getColors = (type: string) => {
    switch (type) {
      case 'interest':
        return 'from-red-500 to-red-600';
      case 'message':
        return 'from-blue-500 to-blue-600';
      case 'product':
        return 'from-green-500 to-green-600';
      case 'system':
        return 'from-yellow-500 to-yellow-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'interest':
        return <Heart className="h-5 w-5" />;
      case 'message':
        return <MessageCircle className="h-5 w-5" />;
      case 'product':
        return <Package className="h-5 w-5" />;
      case 'system':
        return <Zap className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -100, x: 0 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -100, x: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed top-6 right-6 z-50 max-w-sm w-full`}
    >
      <div className={`bg-gradient-to-r ${getColors(notification.type)} text-white rounded-lg shadow-2xl overflow-hidden`}>
        <div className="p-4 flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">{notification.title}</h3>
            <p className="text-sm opacity-90 mt-1">{notification.message}</p>
          </div>
          <button
            onClick={() => onClose(notification.id)}
            className="flex-shrink-0 ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 6, ease: 'linear' }}
          className="h-1 bg-white/30 origin-left"
        />
      </div>
    </motion.div>
  );
};

// --- Componente Principal ---

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const soundManagerRef = useRef<SoundManager>(new SoundManager());

  // Buscar notificações
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data as Notification[]);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reproduzir som
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    soundManagerRef.current.playChickenSound();
  }, [soundEnabled]);

  // Mostrar toast
  const showToastNotification = useCallback(
    (notification: Notification) => {
      const toastId = `${notification.id}-${Date.now()}`;
      setToastNotifications((prev) => [
        ...prev,
        {
          id: toastId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          timestamp: Date.now(),
        },
      ]);

      // Reproduzir som
      playNotificationSound();

      // Vibração
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    },
    [playNotificationSound]
  );

  // Remover toast
  const removeToastNotification = useCallback((id: string) => {
    setToastNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Subscrever a notificações em tempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          showToastNotification(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showToastNotification]);

 useEffect(() => {
  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[App] Service Worker registrado:', registration);
      }
    } catch (error) {
      console.error('[App] Erro ao registrar Service Worker:', error);
    }
  };

  registerServiceWorker();
}, []);  // <--- apenas 1 vez


  // Carregar notificações
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Marcar como lida
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_id', user.id);

        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Erro ao marcar como lida:', error);
      }
    },
    [user]
  );

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, [user]);

  // Deletar notificação
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_id', user.id);

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (error) {
        console.error('Erro ao deletar notificação:', error);
      }
    },
    [user]
  );

  // Ícone por tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'interest':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'product':
        return <Package className="h-5 w-5 text-green-500" />;
      case 'system':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Cor por tipo
  const getNotificationColor = (notification: Notification) => {
    if (!notification.read) return 'bg-blue-50 border-blue-200';
    switch (notification.type) {
      case 'interest':
        return 'bg-red-50 border-red-200';
      case 'message':
        return 'bg-blue-50 border-blue-200';
      case 'product':
        return 'bg-green-50 border-green-200';
      case 'system':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="pb-20 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Toasts de Notificação */}
      <AnimatePresence>
        {toastNotifications.map((toast) => (
          <NotificationToast
            key={toast.id}
            notification={toast}
            onClose={removeToastNotification}
            soundEnabled={soundEnabled}
          />
        ))}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-sm">{unreadCount}</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Som */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Som ativado' : 'Som desativado'}
              className="hover:bg-gray-100"
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-green-600" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
            </Button>

            {/* Botão Marcar Todas */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Marcar todas
              </Button>
            )}

            {/* Botão de Configurações */}
            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Status de Push */}
        {pushEnabled && (
          <div className="px-4 py-2 bg-green-50 border-t border-green-200 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Push Notifications ativadas
          </div>
        )}
      </div>

      {/* Lista de Notificações */}
      <div className="px-4 py-4 space-y-3 max-h-[calc(100vh-150px)] overflow-y-auto">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className={`shadow-md cursor-pointer transition-all hover:shadow-lg border ${getNotificationColor(
                  notification
                )} ${!notification.read ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold text-sm ${
                            !notification.read
                              ? 'text-gray-900'
                              : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {notification.message}
                      </p>

                      {!notification.read && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-xs text-blue-600 font-medium">
                            Não lida
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {notifications.length === 0 && (
          <div className="text-center py-16">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium">Nenhuma notificação</p>
            <p className="text-sm text-gray-500 mt-2">
              Você receberá alertas sobre atividades importantes
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;