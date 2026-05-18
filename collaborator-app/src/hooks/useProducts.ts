import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const addProduct = async (product: Database['public']['Tables']['products']['Insert']) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .insert(product)
                .select()
                .single();

            if (error) throw error;
            setProducts(prev => [...prev, data]);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const updateProduct = async (id: string, updates: Database['public']['Tables']['products']['Update']) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === id ? data : p));
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProducts(prev => prev.filter(p => p.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    return { products, loading, error, addProduct, updateProduct, deleteProduct, refresh: fetchProducts };
};
