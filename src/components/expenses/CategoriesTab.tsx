import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Edit2, Bookmark, FolderOpen } from 'lucide-react';

export function CategoriesTab({ categories = [], addCategory, updateCategory, deleteCategory }: any) {
    const [newCat, setNewCat] = useState({ name: '', color: '#6366f1', icon: 'FolderOpen', sort_order: 0 });
    const [editingId, setEditingId] = useState<string | null>(null);

    const safeCategories = categories || [];

    const handleCreate = async () => {
        if (!newCat.name) {
            return;
        }
        if (editingId) {
            await updateCategory?.(editingId, newCat);
            setEditingId(null);
        } else {
            await addCategory?.({ ...newCat, is_default: false });
        }
        setNewCat({ name: '', color: '#6366f1', icon: 'FolderOpen', sort_order: 0 });
    };

    const handleEdit = (cat: any) => {
        setEditingId(cat.id);
        setNewCat({ name: cat.name, color: cat.color || '#6366f1', icon: cat.icon || 'FolderOpen', sort_order: cat.sort_order || 0 });
    };

    // Default category suggestions
    const defaultSuggestions = ['Rent', 'Electricity', 'Salary', 'Transport', 'Internet', 'Maintenance', 'Marketing', 'Office Supplies', 'Miscellaneous'];
    const existingNames = safeCategories.map((c: any) => c.name?.toLowerCase());
    const suggestions = defaultSuggestions.filter(s => !existingNames.includes(s.toLowerCase()));

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <Card className="md:col-span-4 shadow-sm border h-fit">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Bookmark className="text-purple-500 h-5 w-5" />
                        {editingId ? 'Edit Category' : 'New Category'}
                    </CardTitle>
                    <CardDescription>Customize expense categories.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Name</Label>
                        <Input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Office Supplies" className="h-11 rounded-xl border-2" />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Color</Label>
                        <div className="flex gap-3 items-center">
                            <input type="color" className="h-11 w-14 p-1 border-2 rounded-xl cursor-pointer" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} />
                            <span className="text-xs text-muted-foreground">Used for charts & badges</span>
                        </div>
                    </div>

                    {/* Quick suggestions */}
                    {!editingId && suggestions.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Quick Add</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {suggestions.slice(0, 6).map(s => (
                                    <Button
                                        key={s}
                                        variant="outline"
                                        size="sm"
                                        className="text-[10px] h-7 px-2.5"
                                        onClick={() => setNewCat({ ...newCat, name: s })}
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button onClick={handleCreate} disabled={!newCat.name} className="w-full h-11 uppercase font-bold tracking-wider rounded-xl bg-purple-600 hover:bg-purple-700">
                        <PlusCircle className="mr-2 h-4 w-4" /> {editingId ? 'Update' : 'Create'} Category
                    </Button>
                    {editingId && (
                        <Button variant="ghost" className="w-full text-xs" onClick={() => { setEditingId(null); setNewCat({ name: '', color: '#6366f1', icon: 'FolderOpen', sort_order: 0 }); }}>
                            Cancel Edit
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card className="md:col-span-8 shadow-sm border">
                <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-purple-500" /> Active Categories ({safeCategories.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="text-xs w-16">Color</TableHead>
                                <TableHead className="text-xs">Category Name</TableHead>
                                <TableHead className="text-xs text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {safeCategories.map((c: any) => (
                                <TableRow key={c.id} className="hover:bg-muted/20">
                                    <TableCell>
                                        <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: c.color || '#94a3b8' }} />
                                    </TableCell>
                                    <TableCell className="font-semibold">{c.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}>
                                                <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                                            </Button>
                                            {!c.is_default && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory?.(c.id)}>
                                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {safeCategories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                                        No categories defined. Add categories to organize expenses.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
