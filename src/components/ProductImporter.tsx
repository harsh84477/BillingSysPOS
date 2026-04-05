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

            // Auto-detect header row: scan for a row containing "Product Name" or "Name"
            const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            let headerRowIndex = 0;
            const nameAliases = ['Product Name', 'Name', 'name', 'product_name'];
            for (let i = 0; i < Math.min(allRows.length, 20); i++) {
                const row = allRows[i];
                if (Array.isArray(row) && row.some(cell => nameAliases.includes(String(cell).trim()))) {
                    headerRowIndex = i;
                    break;
                }
            }

            // Re-parse using the detected header row
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex }) as any[];

            if (jsonData.length === 0) {
                toast.error('The file appears to be empty.');
                return;
            }

            toast.info(`Processing ${jsonData.length} rows...`);

            // 1. Identification of Category Mapping
            // We aim to map Category Name -> ID
            const categoryMap = new Map<string, string>(); // Name -> ID
            const categoriesToCreate = new Set<string>();

            // Helper to find a value from multiple possible header names
            const pick = (row: any, ...keys: string[]) => {
                for (const k of keys) {
                    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
                }
                return undefined;
            };

            // Normalize keys and gather categories
            const standardizedData = jsonData.map(row => {
                const name = pick(row, 'Product Name', 'Name', 'name', 'product_name');
                const categoryName = pick(row, 'Category', 'category', 'Category Name') || 'Uncategorized';
                const sellingPrice = pick(row, 'Selling Price', 'Price', 'selling_price', 'Sell Price') || 0;
                const costPrice = pick(row, 'Cost Price', 'Cost', 'cost_price') || 0;
                const mrpPrice = pick(row, 'MRP', 'mrp_price', 'MRP Price') || sellingPrice;
                const wholesalePrice = pick(row, 'Wholesale Price', 'Wholesale', 'wholesale_price') || 0;
                const stock = pick(row, 'Stock', 'Quantity', 'stock_quantity', 'Stock (PCS)', 'Stock Qty') || 0;
                const lowStock = pick(row, 'Low Stock Alert', 'Low Stock', 'low_stock_threshold') || 10;
                const itemsPerCase = pick(row, 'PCS/Case', 'Items/Case', 'items_per_case', 'Pcs Per Case') || 0;
                const itemCode = pick(row, 'Item Code', 'item_code', 'Code') || null;
                const sku = pick(row, 'SKU', 'sku') || null;
                const hsnCode = pick(row, 'HSN Code', 'hsn_code', 'HSN') || null;
                const barcode = pick(row, 'Barcode', 'barcode', 'Bar Code') || null;
                const baseUnit = pick(row, 'Unit', 'base_unit', 'Base Unit') || 'PCS';
                const batchNumber = pick(row, 'Batch No.', 'Batch Number', 'batch_number', 'Batch') || null;
                const expiryDate = pick(row, 'Expiry Date', 'expiry_date', 'Expiry') || null;
                const discountPercent = pick(row, 'Discount %', 'Discount', 'discount_percent') || 0;
                const imageUrl = pick(row, 'Image URL', 'image_url', 'Image', 'Product Image') || null;

                if (!categoryMap.has(categoryName)) {
                    categoriesToCreate.add(categoryName);
                }

                return {
                    name: name ? String(name) : '',
                    categoryName: String(categoryName),
                    selling_price: Number(sellingPrice) || 0,
                    cost_price: Number(costPrice) || 0,
                    mrp_price: Number(mrpPrice) || Number(sellingPrice) || 0,
                    wholesale_price: Number(wholesalePrice) || 0,
                    stock_quantity: Number(stock) || 0,
                    low_stock_threshold: Number(lowStock) || 10,
                    items_per_case: Number(itemsPerCase) || 0,
                    item_code: itemCode ? String(itemCode) : null,
                    sku: sku ? String(sku) : null,
                    hsn_code: hsnCode ? String(hsnCode) : null,
                    barcode: barcode ? String(barcode) : null,
                    base_unit: String(baseUnit).toUpperCase(),
                    batch_number: batchNumber ? String(batchNumber) : null,
                    expiry_date: expiryDate ? String(expiryDate) : null,
                    discount_percent: Number(discountPercent) || 0,
                    image_url: imageUrl ? String(imageUrl) : null,
                    is_active: true,
                };
            }).filter(item => item.name); // Filter out rows without product name

            if (standardizedData.length === 0) {
                toast.error('No valid product rows found. Ensure the sheet has a "Product Name" or "Name" column.');
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
                mrp_price: item.mrp_price,
                wholesale_price: item.wholesale_price,
                stock_quantity: item.stock_quantity,
                low_stock_threshold: item.low_stock_threshold,
                items_per_case: item.items_per_case,
                item_code: item.item_code,
                sku: item.sku,
                hsn_code: item.hsn_code,
                barcode: item.barcode,
                base_unit: item.base_unit,
                batch_number: item.batch_number,
                expiry_date: item.expiry_date,
                discount_percent: item.discount_percent,
                image_url: item.image_url,
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
                size="sm"
                onClick={handleClick}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="mr-1 sm:mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <FileSpreadsheet className="mr-1 sm:mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Import Excel</span>
                <span className="sm:hidden">Import</span>
            </Button>
        </>
    );
}
