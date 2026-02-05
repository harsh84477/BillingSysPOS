import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function Categories() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: productCounts = {} } = useQuery({
    queryKey: ['productCountsByCategory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((product) => {
        if (product.category_id) {
          counts[product.category_id] = (counts[product.category_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (category: { name: string; color: string; icon: string }) => {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(category)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(category);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
      setEditingCategory(null);
      toast.success(editingCategory ? 'Category updated' : 'Category created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: formData.get('name') as string,
      color: formData.get('color') as string,
      icon: formData.get('icon') as string || 'Package',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Organize your products into categories</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingCategory(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingCategory?.name}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      name="color"
                      type="color"
                      defaultValue={editingCategory?.color || '#3B82F6'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Input
                      id="icon"
                      name="icon"
                      defaultValue={editingCategory?.icon || 'Package'}
                      placeholder="Lucide icon name"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingCategory(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {editingCategory ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            All Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <FolderOpen className="mb-2 h-8 w-8" />
              No categories yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <span
                        className="inline-block h-6 w-6 rounded-full"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {productCounts[category.id] || 0} products
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCategory(category);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Delete this category?')) {
                                deleteMutation.mutate(category.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
