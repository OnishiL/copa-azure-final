import { createContext, useContext } from 'react';
import { Match } from '@/data/matches';
import { Stadium, Sector } from '@/data/stadiums';
import { Team } from '@/data/teams';

export interface CartItem {
  id: string;
  match: Match;
  stadium: Stadium;
  homeTeam: Team;
  awayTeam: Team;
  sector: Sector;
  ticketCategoryId: number; // ID numérico do banco de dados
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
