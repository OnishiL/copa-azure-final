import React, { useState, useCallback, useEffect } from 'react';
import api, { type ApiUser } from '@/lib/api';
import { AuthContext, type User, type Order } from '@/contexts/AuthContext';

const STORAGE_KEY = 'copa2026_user';
const ORDERS_KEY = 'copa2026_orders';

function mapApiUser(raw: ApiUser): User {
  return {
    id: String(raw?.id ?? ''),
    email: String(raw?.email ?? ''),
    name: String(raw?.name ?? ''),
    role: raw?.role,
    createdAt: raw?.created_at || raw?.createdAt || new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap auth + orders
  useEffect(() => {
    const init = async () => {
      // Load cached orders
      const storedOrders = localStorage.getItem(ORDERS_KEY);
      if (storedOrders) {
        try {
          setOrders(JSON.parse(storedOrders));
        } catch {
          localStorage.removeItem(ORDERS_KEY);
        }
      }

      // Load cached user (quick UI)
      const cachedUser = localStorage.getItem(STORAGE_KEY);
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // If we have a token, validate/refresh user from API
      const token = localStorage.getItem('auth_token');
      if (token) {
        const meRes = await api.getMe();
        if (meRes.data?.user) {
          setUser(mapApiUser(meRes.data.user));
        } else {
          // Only force logout on explicit token errors; keep cached user if server is offline
          const msg = meRes.error || '';
          if (/token/i.test(msg) || /n[ãa]o fornecido/i.test(msg) || /inv[áa]lido/i.test(msg)) {
            api.logout();
            setUser(null);
          }
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  // Persist user
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // Persist orders
  useEffect(() => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    const result = await api.login(email, password);
    if (result.data?.user) {
      // Best effort to load full profile (created_at)
      const meRes = await api.getMe();
      const mapped = meRes.data?.user ? mapApiUser(meRes.data.user) : mapApiUser(result.data.user);
      setUser(mapped);
      return mapped;
    }
    return null;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<User | null> => {
    const result = await api.register(name, email, password);
    if (result.data?.user) {
      const meRes = await api.getMe();
      const mapped = meRes.data?.user ? mapApiUser(meRes.data.user) : mapApiUser(result.data.user);
      setUser(mapped);
      return mapped;
    }
    return null;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    if (!data.name) return true;

    const res = await api.updateProfile({ name: data.name });
    if (res.data?.user) {
      setUser((prev) => (prev ? { ...prev, ...mapApiUser(res.data!.user) } : mapApiUser(res.data!.user)));
      return true;
    }

    return false;
  }, [user]);

  const addOrder = useCallback((order: Omit<Order, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;

    const newOrder: Order = {
      ...order,
      id: `order-${Date.now()}`,
      userId: String(user.id),
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        orders: orders.filter((o) => o.userId === String(user?.id)),
        addOrder,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
