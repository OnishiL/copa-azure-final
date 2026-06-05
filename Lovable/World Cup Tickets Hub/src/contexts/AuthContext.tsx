import { createContext, useContext } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'user' | string;
  phone?: string;
  cpf?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: {
    matchId: string;
    sectorId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  paymentMethod?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<User | null>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'userId' | 'createdAt'>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
