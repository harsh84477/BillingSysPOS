import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Send,
  ShieldCheck,
  Zap,
  Key,
  Smartphone,
  FileText,
  Check,
  Settings,
  ExternalLink,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Globe,
  ArrowRight
} from 'lucide-react';

export default function WhatsApp() {
  // Configured provider
  const [provider, setProvider] = useState<'wa_redirect' | 'meta_api'>(() => {
    return (localStorage.getItem('spos_whatsapp_provider') as 'wa_redirect' | 'meta_api') || 'wa_redirect';
  });

  // Direct Redirect Settings
  const [autoSendRedirect, setAutoSendRedirect] = useState(() => {
    return localStorage.getItem('spos_whatsapp_auto_send') === 'true';
  });
  const [redirectTemplate, setRedirectTemplate] = useState(() => {
    return localStorage.getItem('spos_whatsapp_template') || 
      '🧾 *Invoice from {store_name}*\n\nHi {customer_name},\nHere is your invoice *{invoice_no}* for amount *{amount}*.\n\nThank you for shopping with us! 🙏';
  });

  // Meta Cloud API Settings
  const [metaToken, setMetaToken] = useState(() => localStorage.getItem('spos_whatsapp_meta_token') || '');
  const [metaPhoneId, setMetaPhoneId] = useState(() => localStorage.getItem('spos_whatsapp_meta_phone_id') || '');
  const [metaAccountId, setMetaAccountId] = useState(() => localStorage.getItem('spos_whatsapp_meta_account_id') || '');
  const [metaTemplateName, setMetaTemplateName] = useState(() => localStorage.getItem('spos_whatsapp_meta_template_name') || 'hello_world');
  const [metaLanguage, setMetaLanguage] = useState(() => localStorage.getItem('spos_whatsapp_meta_language') || 'en_US');
  const [autoSendMeta, setAutoSendMeta] = useState(() => {
    return localStorage.getItem('spos_whatsapp_meta_auto_send') === 'true';
  });

  // UI States
  const [showToken, setShowToken] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('config');

  // Save configurations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      localStorage.setItem('spos_whatsapp_provider', provider);
      
      // Save Redirect settings
      localStorage.setItem('spos_whatsapp_auto_send', String(autoSendRedirect));
      localStorage.setItem('spos_whatsapp_template', redirectTemplate);

      // Save Meta API settings
      localStorage.setItem('spos_whatsapp_meta_token', metaToken.trim());
      localStorage.setItem('spos_whatsapp_meta_phone_id', metaPhoneId.trim());
      localStorage.setItem('spos_whatsapp_meta_account_id', metaAccountId.trim());
      localStorage.setItem('spos_whatsapp_meta_template_name', metaTemplateName.trim());
      localStorage.setItem('spos_whatsapp_meta_language', metaLanguage.trim());
      localStorage.setItem('spos_whatsapp_meta_auto_send', String(autoSendMeta));

      setTimeout(() => {
        setSavingSettings(false);
        toast.success('WhatsApp integration settings saved successfully!');
      }, 800);
    } catch (err) {
      setSavingSettings(false);
      toast.error('Failed to save settings. Please try again.');
    }
  };

  // Live test send
  const handleSendTestMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!metaToken || !metaPhoneId) {
      toast.error('Configure and save Meta Access Token and Phone Number ID first.');
      return;
    }

    setTestSending(true);
    setTestLogs([]);
    const addLog = (msg: string) => setTestLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    // Format phone
    let cleanPhone = testNumber.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone; // Fallback to Indian prefix
    }
    
    addLog(`Initiating test WhatsApp send to +${cleanPhone}...`);
    addLog(`Targeting Graph API endpoint: https://graph.facebook.com/v19.0/${metaPhoneId}/messages`);

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: metaTemplateName.trim(),
            language: {
              code: metaLanguage.trim(),
            },
          },
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        addLog(`Response Status: 200 OK`);
        addLog(`Message Queued Successfully!`);
        addLog(`Message ID: ${data.messages?.[0]?.id || 'N/A'}`);
        toast.success('Test message sent successfully! Check WhatsApp.');
      } else {
        addLog(`Response Status: ${response.status} ${response.statusText}`);
        addLog(`Error Code: ${data.error?.code || 'N/A'} (${data.error?.type || 'N/A'})`);
        addLog(`Error Message: ${data.error?.message || 'No details provided.'}`);
        toast.error(`Meta API Error: ${data.error?.message || 'Verification failed'}`);
      }
    } catch (err: any) {
      addLog(`Network Request Failed: ${err.message || 'Unknown network error'}`);
      toast.error(`Network Error: ${err.message || 'Request failed'}`);
    } finally {
      setTestSending(false);
    }
  };

  // Meta credentials verification check
  const isMetaConfigured = metaToken && metaPhoneId && metaAccountId;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-500 shrink-0" />
            WhatsApp Integration Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how your billing system sends invoices, receipts, and outstanding payment reminders to customers.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {provider === 'meta_api' ? (
            isMetaConfigured ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 gap-1.5 px-3 py-1 font-semibold text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                Meta API: Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900 gap-1.5 px-3 py-1 font-semibold text-xs animate-pulse">
                <AlertCircle className="h-3.5 w-3.5" />
                Meta API: Setup Pending
              </Badge>
            )
          ) : (
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 gap-1.5 px-3 py-1 font-semibold text-xs">
              <Globe className="h-3.5 w-3.5" />
              Direct Link: Active
            </Badge>
          )}
        </div>
      </div>

      {/* Info Alert on QR Code scanning replacement */}
      <Alert className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/15 dark:border-emerald-900">
        <AlertCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
        <AlertTitle className="text-emerald-800 dark:text-emerald-400 font-semibold text-sm">Security & Reliability Notice</AlertTitle>
        <AlertDescription className="text-emerald-700 dark:text-emerald-500 text-xs leading-relaxed mt-1">
          WhatsApp's standard multi-device protocol restricts third-party apps from scanning login QR codes directly inside custom apps without strict limits, which often causes login failures and risks number bans. We provide the **Official Meta Cloud API** for direct background automation and **WhatsApp Web redirects** for zero-setup manual sending.
        </AlertDescription>
      </Alert>

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Redirect Provider */}
        <Card 
          className={`cursor-pointer transition-all duration-300 border-2 rounded-2xl hover:shadow-md ${
            provider === 'wa_redirect' 
              ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5' 
              : 'border-border opacity-70 hover:opacity-100'
          }`}
          onClick={() => {
            setProvider('wa_redirect');
            toast.info('Selected Direct WhatsApp Web link provider');
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${provider === 'wa_redirect' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Direct WhatsApp Link</CardTitle>
                  <CardDescription className="text-xs">Manual trigger via browser redirect</CardDescription>
                </div>
              </div>
              <input 
                type="radio" 
                name="whatsapp_provider" 
                checked={provider === 'wa_redirect'} 
                onChange={() => {}}
                className="accent-emerald-600 h-4 w-4 cursor-pointer"
              />
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Quickly opens a WhatsApp Web page or App tab during checkout with prefilled text templates. Completely free, requires zero credentials, and sends messages immediately via user confirmation.
          </CardContent>
        </Card>

        {/* Meta Cloud API Provider */}
        <Card 
          className={`cursor-pointer transition-all duration-300 border-2 rounded-2xl hover:shadow-md ${
            provider === 'meta_api' 
              ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5' 
              : 'border-border opacity-70 hover:opacity-100'
          }`}
          onClick={() => {
            setProvider('meta_api');
            toast.info('Selected Official Meta Cloud API provider');
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${provider === 'meta_api' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Official Meta Cloud API</CardTitle>
                  <CardDescription className="text-xs">Automated background delivery</CardDescription>
                </div>
              </div>
              <input 
                type="radio" 
                name="whatsapp_provider" 
                checked={provider === 'meta_api'} 
                onChange={() => {}}
                className="accent-emerald-600 h-4 w-4 cursor-pointer"
              />
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Sends customer invoices programmatically in the background directly from Meta servers without launching any extra browser pages. Extremely reliable, handles 1,000 free template messages per month.
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted rounded-xl p-1 mb-6">
          <TabsTrigger value="config" className="rounded-lg text-xs font-semibold py-1.5 flex items-center justify-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="guide" className="rounded-lg text-xs font-semibold py-1.5 flex items-center justify-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Setup Guide
          </TabsTrigger>
          <TabsTrigger 
            value="test" 
            disabled={provider === 'wa_redirect'} 
            className="rounded-lg text-xs font-semibold py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Test Console
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Configuration Form */}
        <TabsContent value="config" className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {provider === 'wa_redirect' ? (
              // ── DIRECT LINK OPTIONS ──
              <Card className="border shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-5 w-5 text-emerald-500" />
                    Direct Link Settings
                  </CardTitle>
                  <CardDescription>Customize the message template and toggle auto-actions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Auto-Open checkout */}
                  <div className="flex items-center justify-between p-3.5 bg-muted rounded-xl">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-send-redirect" className="text-sm font-semibold cursor-pointer">Auto-Open WhatsApp on Checkout</Label>
                      <p className="text-xs text-muted-foreground">Automatically trigger a redirect tab when bills are completed.</p>
                    </div>
                    <Switch 
                      id="auto-send-redirect"
                      checked={autoSendRedirect}
                      onCheckedChange={setAutoSendRedirect}
                    />
                  </div>

                  {/* Template Text */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Billing Message Template</Label>
                      <span className="text-[10px] text-muted-foreground">Supports markdown styling (*bold*, _italic_)</span>
                    </div>
                    <Textarea 
                      value={redirectTemplate} 
                      onChange={(e) => setRedirectTemplate(e.target.value)}
                      className="font-mono text-xs leading-relaxed"
                      rows={7}
                      placeholder="Enter prefilled message format..."
                    />
                    
                    <div className="p-3 bg-muted rounded-xl space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Available Template Variables</p>
                      <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
                        <span className="bg-background border px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;store_name&#125;</span>
                        <span className="bg-background border px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;customer_name&#125;</span>
                        <span className="bg-background border px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;invoice_no&#125;</span>
                        <span className="bg-background border px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;amount&#125;</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // ── META CLOUD API OPTIONS ──
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Meta Form Column */}
                <div className="md:col-span-7 space-y-6">
                  <Card className="border shadow-sm rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Key className="h-5 w-5 text-emerald-500" />
                        Meta API Credentials
                      </CardTitle>
                      <CardDescription>Enter credentials copied from your Meta Business account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* Access Token */}
                      <div className="space-y-1.5">
                        <Label htmlFor="meta-token" className="text-xs font-bold">System User Access Token</Label>
                        <div className="relative">
                          <Input 
                            id="meta-token" 
                            type={showToken ? "text" : "password"} 
                            placeholder="EAAGz..."
                            value={metaToken}
                            onChange={(e) => setMetaToken(e.target.value)}
                            className="pr-10 rounded-lg text-sm font-mono"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Phone ID & Account ID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="meta-phone-id" className="text-xs font-bold">Phone Number ID</Label>
                          <Input 
                            id="meta-phone-id" 
                            placeholder="e.g. 109287340294821" 
                            value={metaPhoneId}
                            onChange={(e) => setMetaPhoneId(e.target.value.replace(/\D/g, ''))}
                            className="rounded-lg text-sm font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="meta-account-id" className="text-xs font-bold">WhatsApp Business Account ID</Label>
                          <Input 
                            id="meta-account-id" 
                            placeholder="e.g. 293849182740928" 
                            value={metaAccountId}
                            onChange={(e) => setMetaAccountId(e.target.value.replace(/\D/g, ''))}
                            className="rounded-lg text-sm font-mono"
                          />
                        </div>
                      </div>

                      {/* Template details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="meta-template" className="text-xs font-bold">Approved Template Name</Label>
                          <Input 
                            id="meta-template" 
                            placeholder="e.g. hello_world" 
                            value={metaTemplateName}
                            onChange={(e) => setMetaTemplateName(e.target.value)}
                            className="rounded-lg text-sm font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="meta-lang" className="text-xs font-bold">Language Code</Label>
                          <Input 
                            id="meta-lang" 
                            placeholder="e.g. en_US" 
                            value={metaLanguage}
                            onChange={(e) => setMetaLanguage(e.target.value)}
                            className="rounded-lg text-sm font-mono"
                          />
                        </div>
                      </div>

                      {/* Auto Send Toggle */}
                      <div className="flex items-center justify-between p-3 bg-muted rounded-xl mt-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="auto-send-meta" className="text-sm font-semibold cursor-pointer">Auto-Send on Checkout</Label>
                          <p className="text-xs text-muted-foreground">Send background WhatsApp messages immediately when final invoice is saved.</p>
                        </div>
                        <Switch 
                          id="auto-send-meta"
                          checked={autoSendMeta}
                          onCheckedChange={setAutoSendMeta}
                        />
                      </div>

                    </CardContent>
                  </Card>
                </div>

                {/* Quick Info & Tips Column */}
                <div className="md:col-span-5 space-y-6">
                  <Card className="border shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-emerald-500" />
                        Meta Developer Account Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                      <div>
                        <p className="font-semibold text-foreground mb-1">1. Developer Sandbox Testing</p>
                        <p>Meta provides a free testing sandbox out-of-the-box. You can use their pre-approved template <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">hello_world</code> to verify your API connection immediately.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">2. Custom Templates</p>
                        <p>To send actual invoice details, you must create and register custom templates (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">invoice_sent</code>) inside the Meta App WhatsApp Manager portal. Once approved by Meta, you can set the template name here.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">3. Live Numbers</p>
                        <p>Ensure you add a payment method or use the free tier limit in your Meta App settings to transition from sandbox numbers to live customer numbers.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>
            )}

            {/* Save Buttons */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button 
                type="submit" 
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 rounded-xl gap-2 shadow-sm"
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Settings</>
                )}
              </Button>
            </div>

          </form>
        </TabsContent>

        {/* Tab 2: Setup Guide */}
        <TabsContent value="guide" className="space-y-6">
          <Card className="border shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-500" />
                Step-by-Step Meta Developer API Guide
              </CardTitle>
              <CardDescription>Follow these instructions to configure automated WhatsApp background sending for free.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* List steps */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                    <div>
                      <h4 className="font-semibold">Create a Meta Developer App</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-0.5">Meta for Developers <ExternalLink className="h-3 w-3 inline" /></a>. Log in with your Facebook account, click "My Apps", and create a new **Business App**.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                    <div>
                      <h4 className="font-semibold">Add WhatsApp Product Integration</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inside your App Dashboard, scroll down to "Add products to your app" and select **WhatsApp**. Click "Set Up" to initialize.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                    <div>
                      <h4 className="font-semibold">Copy IDs & Verify Test Phone Number</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Navigate to **WhatsApp &gt; API Setup** in the left sidebar. Copy the **Phone Number ID** and **WhatsApp Business Account ID** and paste them into the settings page here. Click "Verify number" under recipients to whitelist a phone number for testing.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</div>
                    <div>
                      <h4 className="font-semibold">Generate a Permanent Access Token</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        The token in "API Setup" expires in 24 hours. For production use, go to your **Meta Business Manager &gt; Users &gt; System Users**. Add a system user, select your app, assign permissions for **whatsapp_business_messaging** and generate a permanent access token.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info Box */}
                <div className="lg:col-span-5 bg-muted rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Important Templates Rule</h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Because Meta requires template pre-approval, you must register a template formatting invoices in the Developer Manager panel.
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      An invoice template must register variables corresponding to customer name, number, subtotal, and total amount.
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-start gap-2.5">
                    <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">
                      Sandbox works immediately using Meta's `hello_world` template on test phone numbers.
                    </span>
                  </div>
                </div>

              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Test Console */}
        <TabsContent value="test" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Form card */}
            <div className="md:col-span-6">
              <Card className="border shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-500" />
                    API Message Test Console
                  </CardTitle>
                  <CardDescription>Send a test template message to confirm access tokens and endpoint parameters are active.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendTestMeta} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="test-phone-api" className="text-xs font-bold">Recipient Mobile Number</Label>
                      <div className="flex gap-2">
                        <span className="bg-muted border border-r-0 rounded-l-lg px-3 flex items-center justify-center text-sm font-bold text-muted-foreground">+91</span>
                        <Input 
                          id="test-phone-api"
                          placeholder="10-digit number"
                          value={testNumber}
                          onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="rounded-r-lg text-sm"
                          maxLength={10}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">If using Sandbox credentials, this must be a whitelisted tester phone number.</p>
                    </div>

                    <div className="space-y-2 text-xs border bg-muted/30 rounded-xl p-3.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target Template:</span>
                        <span className="font-semibold font-mono">{metaTemplateName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Language Code:</span>
                        <span className="font-semibold font-mono">{metaLanguage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone Number ID:</span>
                        <span className="font-semibold font-mono text-right truncate max-w-[150px]">{metaPhoneId || 'Not set'}</span>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
                      disabled={testSending || !testNumber || testNumber.length !== 10 || !isMetaConfigured}
                    >
                      {testSending ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Dispatching...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-1.5" /> Dispatch Test Template</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Logs card */}
            <div className="md:col-span-6">
              <Card className="border shadow-sm rounded-2xl h-full flex flex-col min-h-[300px]">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">Request Logs & Debugger</CardTitle>
                    {testLogs.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setTestLogs([])}
                        className="h-7 text-xs text-muted-foreground font-semibold"
                      >
                        Clear Logs
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-y-auto min-h-[200px] max-h-[350px]">
                  {testLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center space-y-2 pt-10">
                      <AlertCircle className="h-8 w-8" />
                      <p>Logs will appear here once you send a test template message.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {testLogs.map((log, index) => (
                        <div key={index} className="border-b border-slate-900 pb-1 last:border-0">{log}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
