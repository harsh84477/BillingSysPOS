import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function CustomerImporter() {
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

        e.target.value = '';

        try {
            setIsLoading(true);
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            let headerRowIndex = 0;
            const nameAliases = ['Name', 'name', 'Customer Name', 'customer_name'];
            for (let i = 0; i < Math.min(allRows.length, 20); i++) {
                const row = allRows[i];
                if (Array.isArray(row) && row.some(cell => nameAliases.includes(String(cell).trim()))) {
                    headerRowIndex = i;
                    break;
                }
            }

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex }) as any[];

            if (jsonData.length === 0) {
                toast.error('The file appears to be empty.');
                return;
            }

            toast.info(`Processing ${jsonData.length} rows...`);

            const pick = (row: any, ...keys: string[]) => {
                for (const k of keys) {
                    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
                }
                return undefined;
            };

            const customersToUpsert = jsonData.map(row => {
                const name = pick(row, 'Name', 'Customer Name', 'name', 'customer_name');
                const phone = pick(row, 'Phone', 'phone', 'Mobile', 'Contact');
                const email = pick(row, 'Email', 'email', 'Mail');
                const storeType = pick(row, 'Store Type', 'store_type', 'Type');
                const locationName = pick(row, 'Location', 'Location Name', 'location_name', 'Area');
                const pincode = pick(row, 'Pincode', 'pincode', 'Pin Code', 'Zip');
                const address = pick(row, 'Address', 'address');
                const notes = pick(row, 'Notes', 'notes');

                return {
                    name: name ? String(name) : '',
                    phone: phone ? String(phone) : null,
                    email: email ? String(email) : null,
                    store_type: storeType ? String(storeType) : null,
                    location_name: locationName ? String(locationName) : null,
                    pincode: pincode ? String(pincode) : null,
                    address: address ? String(address) : null,
                    notes: notes ? String(notes) : null,
                    business_id: businessId,
                };
            }).filter(item => item.name);

            if (customersToUpsert.length === 0) {
                toast.error('No valid customer rows found. Ensure the sheet has a "Name" column.');
                return;
            }

            // Batch insert
            const { error: insertError } = await supabase.from('customers').insert(customersToUpsert);

            if (insertError) throw insertError;

            toast.success(`Successfully imported ${customersToUpsert.length} customers!`);
            queryClient.invalidateQueries({ queryKey: ['customers'] });

        } catch (error: any) {
            console.error(error);
            toast.error('Import failed: ' + error.message);
        } finally {
            setIsLoading(false);
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
