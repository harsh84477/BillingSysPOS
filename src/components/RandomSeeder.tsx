import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORY_NAMES = ['Electronics', 'Clothing', 'Groceries', 'Home & Garden', 'Toys', 'Books', 'Sports', 'Beauty', 'Automotive', 'Pets'];
const PRODUCT_ADJECTIVES = ['Premium', 'Budget', 'Deluxe', 'Standard', 'Pro', 'Ultra', 'Smart', 'Eco', 'Super', 'Mega'];
const PRODUCT_NOUNS = ['Widget', 'Gadget', 'Device', 'Tool', 'Kit', 'Pack', 'Bundle', 'Unit', 'System', 'Set'];

export function RandomSeeder() {
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();

    const generateRandomColor = () => {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    };

    const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    const handleSeed = async () => {
        try {
            setIsLoading(true);

            // 1. Create 3-5 Random Categories
            const numCategories = Math.floor(Math.random() * 3) + 3; // 3 to 5
            const selectedCategories = [];

            // Shuffle and pick
            const shuffledCats = [...CATEGORY_NAMES].sort(() => 0.5 - Math.random());
            const catsToCreate = shuffledCats.slice(0, numCategories);

            const createdCategoryIds: string[] = [];

            for (const catName of catsToCreate) {
                // Check if exists to avoid duplicates (optional, strictly speaking unique constraint might handle it or just append numbers)
                // For simplicity, we just try to insert. If collision, we might skip or append random
                const uniqueName = `${catName} ${Math.floor(Math.random() * 1000)}`;

                const { data, error } = await supabase
                    .from('categories')
                    .insert({
                        name: uniqueName,
                        color: generateRandomColor(),
                        icon: 'Package'
                    })
                    .select('id')
                    .single();

                if (error) {
                    console.error('Error creating category:', error);
                    continue;
                }
                if (data) createdCategoryIds.push(data.id);
            }

            if (createdCategoryIds.length === 0) {
                throw new Error("Failed to create any categories");
            }

            // 2. Create 15-20 Random Products linked to these categories
            const numProducts = Math.floor(Math.random() * 6) + 15; // 15 to 20
            const productsToInsert = [];

            for (let i = 0; i < numProducts; i++) {
                const categoryId = createdCategoryIds[Math.floor(Math.random() * createdCategoryIds.length)];
                const name = `${getRandomElement(PRODUCT_ADJECTIVES)} ${getRandomElement(PRODUCT_NOUNS)} ${Math.floor(Math.random() * 1000)}`;
                const costPrice = Math.floor(Math.random() * 500) + 10; // 10 to 510
                const sellingPrice = Math.floor(costPrice * (1.2 + Math.random() * 0.5)); // 20% to 70% markup
                const stock = Math.floor(Math.random() * 100);

                productsToInsert.push({
                    name,
                    category_id: categoryId,
                    cost_price: costPrice,
                    selling_price: sellingPrice,
                    stock_quantity: stock,
                    is_active: true,
                    low_stock_threshold: 10
                });
            }

            const { error: prodError } = await supabase.from('products').insert(productsToInsert);
            if (prodError) throw prodError;

            toast.success(`Added ${createdCategoryIds.length} categories and ${productsToInsert.length} products!`);

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });

        } catch (error: any) {
            toast.error('Failed to generate data: ' + error.message);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm('Are you sure you want to DELETE ALL products and categories? This cannot be undone.')) return;

        try {
            setIsLoading(true);

            // Delete products first (foreign key constraint)
            const { error: prodError } = await supabase
                .from('products')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (prodError) throw prodError;

            // Delete categories
            const { error: catError } = await supabase
                .from('categories')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (catError) throw catError;

            toast.success('All inventory data deleted.');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });

        } catch (error: any) {
            toast.error('Failed to delete data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-secondary/10 mb-6 flex items-center justify-between">
            <div>
                <h3 className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Inventory Tools
                </h3>
                <p className="text-sm text-muted-foreground">
                    Manage bulk data for testing and development.
                </p>
            </div>
            <div className="flex gap-2">
                <Button
                    onClick={handleDeleteAll}
                    disabled={isLoading}
                    variant="destructive"
                    size="sm"
                >
                    Delete All Data
                </Button>
                <Button onClick={handleSeed} disabled={isLoading} variant="secondary" size="sm">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Generate Random Data'
                    )}
                </Button>
            </div>
        </div>
    );
}
