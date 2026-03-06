import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Edit2, Bookmark, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function CategoriesTab({ categories = [], addCategory, updateCategory, deleteCategory }: any) {
    const [newCat, setNewCat] = useState({ name: '', color: '#3b82f6', icon: 'FolderOpen', sort_order: 0 });
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!newCat.name) return;
        if (editingId) {
            await updateCategory(editingId, newCat);
            setEditingId(null);
        } else {
            await addCategory({ ...newCat, is_default: false });
        }
        setNewCat({ name: '', color: '#3b82f6', icon: 'FolderOpen', sort_order: 0 });
    };

    const handleEdit = (cat: any) => {
        setEditingId(cat.id);
        setNewCat({ name: cat.name, color: cat.color || '#ccc', icon: cat.icon || 'FolderOpen', sort_order: cat.sort_order || 0 });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <Card className="md:col-span-4 border-2 shadow-lg h-fit">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Bookmark className="text-primary h-5 w-5" />
                        {editingId ? 'Edit Category' : 'New Category'}
                    </CardTitle>
                    <CardDescription>Customize expense folders and labels.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Name</Label>
                            <Input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Office Supplies" className="h-12 rounded-xl border-2" />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Color Pin</Label>
                            <div className="flex gap-4 items-center">
                                <input type="color" className="h-12 w-16 p-1 border-2 rounded-xl cursor-pointer" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} />
                                <div className="flex-1 text-xs text-muted-foreground">Used for charts and badges</div>
                            </div>
                        </div>

                        <Button onClick={handleCreate} className="w-full h-12 uppercase font-black tracking-wider rounded-xl">
                            <PlusCircle className="mr-2 h-4 w-4" /> {editingId ? 'Update' : 'Create'} Category
                        </Button>
                        {editingId && (
                            <Button variant="ghost" className="w-full text-xs" onClick={() => { setEditingId(null); setNewCat({ name: '', color: '#3b82f6', icon: 'FolderOpen', sort_order: 0 }); }}>
                                Cancel Edit
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-8 shadow-md border-0 ring-1 ring-border/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 shadow-sm p-4 bg-muted/20 rounded-xl">
                        <FolderOpen className="h-5 w-5 text-primary" /> Active Categories
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Preview</TableHead>
                                <TableHead>Category Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(categories || []).map((c: any) => (
                                <TableRow key={c.id}>
                                    <TableCell>
                                        <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: c.color || '#ccc' }} />
                                    </TableCell>
                                    <TableCell className="font-semibold text-primary">{c.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                                            <Edit2 className="h-4 w-4 text-amber-500" />
                                        </Button>
                                        {!c.is_default && (
                                            <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)}>
                                                <Trash2 className="h-4 w-4 text-rose-500" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!categories || categories.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                                        No custom categories defined.
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
