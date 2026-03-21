import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { 
  SettingsCard, ColStack 
} from '../SettingsUI';
import { RandomSeeder } from '@/components/RandomSeeder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function CategoriesTab() {
  const { businessId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      let query = supabase.from('categories').select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('sort_order');
      if (error) throw error; return data;
    },
    enabled: !!businessId,
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; color: string; icon: string }) => {
      if (editingCategory) {
        const { error } = await supabase.from('categories').update(category).eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert({ ...category, business_id: businessId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast.success(editingCategory ? 'Category updated' : 'Category created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveCategoryMutation.mutate({
      name: fd.get('name') as string,
      color: fd.get('color') as string,
      icon: fd.get('icon') as string || 'Package'
    });
  };

  return (
    <ColStack>
      {isAdmin && <RandomSeeder />}
      <SettingsCard 
        title="Product Categories" 
        subtitle="Organize your products into categories" 
        icon="📁" 
        accent="#10b981"
        footer={isAdmin ? (
          <Dialog open={categoryDialogOpen} onOpenChange={(open) => { setCategoryDialogOpen(open); if (!open) setEditingCategory(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="cat_name">Name</Label><Input id="cat_name" name="name" defaultValue={editingCategory?.name} required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="cat_color">Color</Label><Input id="cat_color" name="color" type="color" defaultValue={editingCategory?.color || '#3B82F6'} /></div>
                  <div className="space-y-2"><Label htmlFor="cat_icon">Icon</Label><Input id="cat_icon" name="icon" defaultValue={editingCategory?.icon || 'Package'} placeholder="Lucide icon name" /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saveCategoryMutation.isPending}>Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : undefined}
      >
        {categories.length > 0 ? (
          <Table>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} />
                      {cat.color}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setCategoryDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete this category?')) deleteCategoryMutation.mutate(cat.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p style={{ color: '#9ca3af', padding: '20px 0' }}>No categories yet</p>}
      </SettingsCard>
    </ColStack>
  );
}
