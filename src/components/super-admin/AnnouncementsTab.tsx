import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Megaphone, Plus, Pencil, Trash2, Eye, Archive,
  Send, FileText, Info, AlertTriangle, Bell, Sparkles,
  Calendar, Users, Filter, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'critical' | 'feature';
  status: 'draft' | 'published' | 'archived';
  target: 'all' | string; // 'all' or plan name
  created_at: string;
  published_at: string | null;
}

const STORAGE_KEY = 'pos_announcements';
const generateId = () => `ANN-${Date.now().toString(36).toUpperCase()}`;

function loadAnnouncements(): Announcement[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveAnnouncements(items: Announcement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const TYPE_CONFIG = {
  info: { label: 'Info', color: 'bg-blue-100 text-blue-700', icon: Info, borderColor: 'border-l-blue-500' },
  warning: { label: 'Warning', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle, borderColor: 'border-l-amber-500' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700', icon: Bell, borderColor: 'border-l-red-500' },
  feature: { label: 'Feature', color: 'bg-violet-100 text-violet-700', icon: Sparkles, borderColor: 'border-l-violet-500' },
};

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-500' },
};

export default function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>(loadAnnouncements);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [previewItem, setPreviewItem] = useState<Announcement | null>(null);

  const [form, setForm] = useState({
    title: '', body: '', type: 'info' as Announcement['type'], target: 'all', status: 'draft' as Announcement['status'],
  });

  const updateItems = useCallback((updater: (prev: Announcement[]) => Announcement[]) => {
    setItems(prev => {
      const next = updater(prev);
      saveAnnouncements(next);
      return next;
    });
  }, []);

  const resetForm = () => {
    setForm({ title: '', body: '', type: 'info', target: 'all', status: 'draft' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setIsDialogOpen(true); };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    setForm({ title: item.title, body: item.body, type: item.type, target: item.target, status: item.status });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.body.trim()) { toast.error('Body is required'); return; }

    if (editing) {
      updateItems(prev => prev.map(a =>
        a.id === editing.id ? {
          ...a,
          title: form.title.trim(),
          body: form.body.trim(),
          type: form.type,
          target: form.target,
          status: form.status,
          published_at: form.status === 'published' && a.status !== 'published' ? new Date().toISOString() : a.published_at,
        } : a
      ));
      toast.success('Announcement updated');
    } else {
      const item: Announcement = {
        id: generateId(),
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        target: form.target,
        status: form.status,
        created_at: new Date().toISOString(),
        published_at: form.status === 'published' ? new Date().toISOString() : null,
      };
      updateItems(prev => [item, ...prev]);
      toast.success(`Announcement created${form.status === 'published' ? ' & published' : ''}`);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handlePublish = (id: string) => {
    updateItems(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'published' as const, published_at: new Date().toISOString() } : a
    ));
    toast.success('Announcement published');
  };

  const handleArchive = (id: string) => {
    updateItems(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'archived' as const } : a
    ));
    toast.success('Announcement archived');
  };

  const handleDelete = (id: string) => {
    updateItems(prev => prev.filter(a => a.id !== id));
    toast.success('Announcement deleted');
  };

  const stats = useMemo(() => ({
    total: items.length,
    draft: items.filter(i => i.status === 'draft').length,
    published: items.filter(i => i.status === 'published').length,
    archived: items.filter(i => i.status === 'archived').length,
  }), [items]);

  const filtered = useMemo(() => {
    return items
      .filter(i => {
        const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.body.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || i.status === statusFilter;
        const matchType = typeFilter === 'all' || i.type === typeFilter;
        return matchSearch && matchStatus && matchType;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [items, search, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage platform-wide announcements and notifications.</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start" onClick={openCreate}><Plus className="h-3.5 w-3.5" />New Announcement</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'total', label: 'Total', icon: Megaphone, color: 'text-blue-600 bg-blue-500/10' },
          { key: 'draft', label: 'Drafts', icon: FileText, color: 'text-slate-600 bg-slate-500/10' },
          { key: 'published', label: 'Published', icon: Send, color: 'text-emerald-600 bg-emerald-500/10' },
          { key: 'archived', label: 'Archived', icon: Archive, color: 'text-gray-600 bg-gray-500/10' },
        ] as const).map(item => (
          <Card key={item.key} className="border-slate-200/70 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
                  <p className="text-3xl font-bold tracking-tight mt-1">{stats[item.key]}</p>
                </div>
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', item.color)}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search announcements..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Announcement Cards */}
      {filtered.length === 0 ? (
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto opacity-10 mb-4" />
            <p className="font-semibold text-foreground">{items.length === 0 ? 'No announcements yet' : 'No matching announcements'}</p>
            <p className="text-sm mt-1">{items.length === 0 ? 'Create your first announcement to broadcast to your users.' : 'Try adjusting your filters.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => {
            const tConfig = TYPE_CONFIG[item.type];
            const sConfig = STATUS_CONFIG[item.status];
            const TIcon = tConfig.icon;
            return (
              <Card key={item.id} className={cn('border-slate-200/70 shadow-sm border-l-4 transition-all hover:shadow-md', tConfig.borderColor)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className={cn('text-[10px] gap-1', tConfig.color)}><TIcon className="h-3 w-3" />{tConfig.label}</Badge>
                        <Badge className={cn('text-[10px]', sConfig.color)}>{sConfig.label}</Badge>
                        {item.target !== 'all' && <Badge variant="outline" className="text-[10px]">{item.target}</Badge>}
                      </div>
                      <CardTitle className="text-base truncate">{item.title}</CardTitle>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewItem(item)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashed">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(item.created_at), 'MMM dd, yyyy')}
                      {item.published_at && <span className="ml-2">· Published {format(new Date(item.published_at), 'MMM dd')}</span>}
                    </div>
                    <div className="flex gap-1">
                      {item.status === 'draft' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-emerald-600" onClick={() => handlePublish(item.id)}>
                          <Send className="h-3 w-3" />Publish
                        </Button>
                      )}
                      {item.status === 'published' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleArchive(item.id)}>
                          <Archive className="h-3 w-3" />Archive
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{item.title}". This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription>Create an announcement to broadcast to platform users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs">Title *</Label><Input className="mt-1" placeholder="Announcement title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label className="text-xs">Body *</Label><Textarea className="mt-1 min-h-[100px]" placeholder="Announcement content..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Announcement['type'] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="feature">✨ Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Target</Label>
                <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="Pro">Pro Plan</SelectItem>
                    <SelectItem value="Basic">Basic Plan</SelectItem>
                    <SelectItem value="Freemium">Freemium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Announcement['status'] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Publish Now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          {previewItem && (() => {
            const tConfig = TYPE_CONFIG[previewItem.type];
            const TIcon = tConfig.icon;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-[10px] gap-1', tConfig.color)}><TIcon className="h-3 w-3" />{tConfig.label}</Badge>
                    {previewItem.target !== 'all' && <Badge variant="outline" className="text-[10px]">{previewItem.target} only</Badge>}
                  </div>
                  <DialogTitle className="text-lg">{previewItem.title}</DialogTitle>
                  <DialogDescription className="text-xs">{format(new Date(previewItem.created_at), 'MMMM dd, yyyy')}</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{previewItem.body}</p>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
