import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { User as UserProfile, RegisterData } from '@/types/database'
import { toast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: any }>
  register: (userData: RegisterData) => Promise<{ error: any; data?: any }>
  logout: () => Promise<void>
  verifyEmail: (token: string) => Promise<{ error: any }>
  resendVerification: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    // Load userProfile from localStorage on initialization
    try {
      const saved = localStorage.getItem('userProfile')
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Error loading userProfile from localStorage:', error)
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
        return
      }

      const profile = data ? {
        ...data,
        user_type: data.user_type as 'agricultor' | 'agente' | 'comprador'
      } : null

      setUserProfile(profile)

      // Save to localStorage
      if (profile) {
        localStorage.setItem('userProfile', JSON.stringify(profile))
      } else {
        localStorage.removeItem('userProfile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id)
          }, 0)
        } else {
          setUserProfile(null)
        }
        setLoading(false)
      }
    )

    // THEN get existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        let message = 'Erro ao fazer login'
        if (error.message === 'Invalid login credentials') {
          message = 'Email ou senha incorretos'
        } else if (error.message.includes('User not found')) {
          message = 'Usuário não encontrado'
        } else if (error.message.includes('Email not confirmed') || error.message.includes('email not confirmed')) {
          // Tentar confirmar automaticamente se o usuário existir
          message = 'Email não confirmado. Por favor, verifique sua caixa de entrada.'
        } else {
          message = error.message
        }
        
        toast({
          title: "Erro no Login",
          description: message,
          variant: "destructive",
        })
        
        return { error }
      }

      // Se login bem-sucedido, sincronizar email_verified na tabela public.users
      if (data?.user) {
        try {
          await supabase.rpc('sync_user_email_verified', { p_user_id: data.user.id })
        } catch (syncError) {
          console.log('Sync email verified:', syncError)
        }
      }

      return { error: null }
    } catch (err: any) {
      console.error('Erro no login:', err)
      toast({
        title: "Erro no Login",
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: "destructive",
      })
      return { error: err }
    }
  }

  const register = async (userData: RegisterData) => {
    const { user_type, province_id, municipality_id, full_name, identity_document, phone, password, email, referred_by_agent_id } = userData
    
    if (!email) {
      return { error: { message: 'Email é obrigatório' } }
    }
    
    try {
      // Buscar ID do agente usando RPC segura
      let referredByAgentId = null;
      if (referred_by_agent_id) {
        const { data: agentId } = await supabase.rpc('get_agent_id_by_code', { p_code: referred_by_agent_id });
        referredByAgentId = agentId || null;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirmar-email`,
          data: {
            full_name,
            user_type,
            province_id,
            municipality_id,
            identity_document,
            phone,
            referred_by_agent_id: referredByAgentId
          }
        }
      })

      if (error) return { error, data: null }

      // Triggers automáticos criam: perfil, carteira, código agente, referral

      return { error: null, data }
    } catch (err: any) {
      console.error('Erro no registro:', err)
      return { error: err, data: null }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    // Clear localStorage on logout
    localStorage.removeItem('userProfile')
  }

  const verifyEmail = async (token: string) => {
    // For email confirmation, Supabase handles this automatically via the callback URL
    // This function is deprecated - email confirmation happens in EmailConfirmation page
    return { error: null }
  }

  const resendVerification = async () => {
    if (!user?.email) {
      return { error: { message: 'No email found' } }
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/confirmar-email`
      }
    })
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { error }
  }

  const value = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}