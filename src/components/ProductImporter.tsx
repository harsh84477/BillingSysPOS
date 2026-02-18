import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function ProductImporter() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();
    const { businessId } = useAuth();

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input to allow selecting same file again if needed
        e.target.value = '';

        try {
            setIsLoading(true);
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (jsonData.length === 0) {
                toast.error('The file appears to be empty.');
                return;
            }

            toast.info(`Processing ${jsonData.length} rows...`);

            // 1. Identification of Category Mapping
            // We aim to map Category Name -> ID
            const categoryMap = new Map<string, string>(); // Name -> ID
            const categoriesToCreate = new Set<string>();

            // Normalize keys and gather categories
            const standardizedData = jsonData.map(row => {
                // Map various possible header names to our internal keys
                const name = row['Product Name'] || row['Name'] || row['name'];
                const categoryName = row['Category'] || row['category'] || 'Uncategorized';
                const sellingPrice = row['Selling Price'] || row['Price'] || row['selling_price'] || 0;
                const costPrice = row['Cost Price'] || row['Cost'] || row['cost_price'] || 0;
                const stock = row['Stock'] || row['Quantity'] || row['stock_quantity'] || 0;
                const lowStock = row['Low Stock Alert'] || row['Low Stock'] || row['low_stock_threshold'] || 10;

                if (!categoryMap.has(categoryName)) {
                    categoriesToCreate.add(categoryName);
                }

                return {
                    name: String(name),
                    categoryName: String(categoryName),
                    selling_price: Number(sellingPrice),
                    cost_price: Number(costPrice),
                    stock_quantity: Number(stock),
                    low_stock_threshold: Number(lowStock),
                    is_active: true
                };
            }).filter(item => item.name); // Filter out rows without product name

            if (standardizedData.length === 0) {
                toast.error('No valid product definition found. Check headers (Product Name, Category, Price, Stock).');
                return;
            }

            // 2. Resolve Categories
            // First, fetch existing categories
            const { data: existingCategories } = await supabase.from('categories').select('id, name').eq('business_id', businessId);

            existingCategories?.forEach(c => {
                categoryMap.set(c.name.toLowerCase(), c.id);
                categoryMap.set(c.name, c.id); // Set exact match too
            });

            // Create missing categories
            for (const catName of categoriesToCreate) {
                const normalizedName = catName.toLowerCase();
                if (!categoryMap.has(normalizedName)) {
                    // Create it
                    const { data: newCat, error } = await supabase
                        .from('categories')
                        .insert({
                            name: catName,
                            color: '#64748b',
                            icon: 'Package',
                            business_id: businessId
                        })
                        .select('id')
                        .single();

                    if (!error && newCat) {
                        categoryMap.set(normalizedName, newCat.id);
                        categoryMap.set(catName, newCat.id);
                    }
                }
            }

            // 3. Prepare Product Batch
            const productsToUpsert = standardizedData.map(item => ({
                name: item.name,
                category_id: categoryMap.get(item.categoryName.toLowerCase()) || categoryMap.get(item.categoryName) || null,
                selling_price: item.selling_price,
                cost_price: item.cost_price,
                stock_quantity: item.stock_quantity,
                low_stock_threshold: item.low_stock_threshold,
                is_active: true,
                business_id: businessId,
            }));

            // 4. Batch Insert
            const { error: insertError } = await supabase.from('products').insert(productsToUpsert);

            if (insertError) throw insertError;

            toast.success(`Successfully imported ${productsToUpsert.length} products!`);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });

        } catch (error: any) {
            console.error(error);
            toast.error('Import failed: ' + error.message);
        } finally {
            setIsLoading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={processFile}
            />
            <Button
                variant="outline"
                onClick={handleClick}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Import Excel
            </Button>
        </>
    );
}
