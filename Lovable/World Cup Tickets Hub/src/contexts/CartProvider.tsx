import React, { useState, useCallback } from 'react';
import { CartContext, type CartItem } from '@/contexts/CartContext';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, 'id' | 'totalPrice'>) => {
    const id = `${item.match.id}-${item.ticketCategoryId}-${Date.now()}`;
    const newItem: CartItem = {
      ...item,
      id,
      totalPrice: item.unitPrice * item.quantity,
    };

    setItems(prev => {
      // Check if same match and ticket category already exists
      const existingIndex = prev.findIndex(
        i => i.match.id === item.match.id && i.ticketCategoryId === item.ticketCategoryId
      );

      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
          totalPrice: (updated[existingIndex].quantity + item.quantity) * item.unitPrice,
        };
        return updated;
      }

      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
          : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
