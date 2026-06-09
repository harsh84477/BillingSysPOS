import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Info,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

export default function WhatsApp() {
  const [connected, setConnected] = useState<boolean>(() => {
    return localStorage.getItem('spos_whatsapp_connected') === 'true';
  });
  
  const [connecting, setConnecting] = useState(false);
  const [connectStep, setConnectStep] = useState(0);
  const [qrVal, setQrVal] = useState('https://wa.me/qr/pos-system-connect-' + Math.random().toString(36).substring(7));
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return localStorage.getItem('spos_whatsapp_phone') || '+91 98765 43210';
  });
  const [deviceName, setDeviceName] = useState(() => {
    return localStorage.getItem('spos_whatsapp_device') || 'Android Terminal (Chrome)';
  });
  
  // Settings
  const [autoSend, setAutoSend] = useState(() => {
    return localStorage.getItem('spos_whatsapp_auto_send') === 'true';
  });
  const [template, setTemplate] = useState(() => {
    return localStorage.getItem('spos_whatsapp_template') || 
      '🧾 *Invoice from {store_name}*\n\nHi {customer_name},\nHere is your invoice *{invoice_no}* for amount *{amount}*.\n\nThank you for shopping with us! 🙏';
  });
  
  // Test message states
  const [testNumber, setTestNumber] = useState('');
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    localStorage.setItem('spos_whatsapp_connected', String(connected));
  }, [connected]);

  useEffect(() => {
    localStorage.setItem('spos_whatsapp_auto_send', String(autoSend));
  }, [autoSend]);

  useEffect(() => {
    localStorage.setItem('spos_whatsapp_template', template);
  }, [template]);

  // QR Code scanning simulator
  const handleStartLinking = () => {
    if (connecting) return;
    setConnecting(true);
    setConnectStep(1);
    
    // Simulate steps
    setTimeout(() => {
      setConnectStep(2);
      setTimeout(() => {
        setConnectStep(3);
        setTimeout(() => {
          setConnected(true);
          setConnecting(false);
          setConnectStep(0);
          localStorage.setItem('spos_whatsapp_phone', '+91 99887 76655');
          localStorage.setItem('spos_whatsapp_device', 'Linked Terminal (WhatsApp Web)');
          setPhoneNumber('+91 99887 76655');
          setDeviceName('Linked Terminal (WhatsApp Web)');
          toast.success('WhatsApp connected successfully!');
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to log out and disconnect your WhatsApp session?')) {
      setConnected(false);
      localStorage.removeItem('spos_whatsapp_connected');
      localStorage.removeItem('spos_whatsapp_phone');
      localStorage.removeItem('spos_whatsapp_device');
      setQrVal('https://wa.me/qr/pos-system-connect-' + Math.random().toString(36).substring(7));
      toast.info('WhatsApp session disconnected');
    }
  };

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setTestSending(true);
    
    // Simulate sending API message
    setTimeout(() => {
      setTestSending(false);
      setTestNumber('');
      toast.success('Test message sent successfully to ' + testNumber);
    }, 2000);
  };

  const regenerateQR = () => {
    setQrVal('https://wa.me/qr/pos-system-connect-' + Math.random().toString(36).substring(7));
    toast.info('QR Code refreshed');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 pb-20">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-500 shrink-0" />
            WhatsApp Integration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Link your WhatsApp account to automatically send invoices, receipts, and order updates to customers.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              <XCircle className="h-3.5 w-3.5" />
              Not Configured
            </span>
          )}
        </div>
      </div>

      {!connected ? (
        // ── UNCONNECTED STATE: QR Scanner flow ──
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Instructions Column */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <Card className="flex-1 border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-emerald-500" />
                  How to link WhatsApp
                </CardTitle>
                <CardDescription>Follow these simple steps on your mobile phone to connect.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex gap-4 items-start">
                  <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Open WhatsApp on your mobile</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Make sure you are logged in to the account you want to use for billing.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Go to Linked Devices</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tap the Menu icon (three dots on Android) or Settings (iOS) and select <span className="font-semibold text-foreground">Linked Devices</span>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Scan QR Code</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tap <span className="font-semibold text-foreground">Link a Device</span> and point your phone camera at the QR code displayed on the right.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-xl flex gap-3 text-xs items-start">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Security Note</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Invoice Adda connects securely via a local sandbox bridge protocol. We never store or read your chat contents. Messages are sent securely only to invoice recipients.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Container */}
          <div className="lg:col-span-5">
            <Card className="h-full flex flex-col justify-center items-center text-center p-6 border shadow-sm relative overflow-hidden">
              
              {connecting && (
                <div className="absolute inset-0 bg-background/90 z-20 flex flex-col items-center justify-center p-4">
                  <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
                  <h3 className="font-semibold text-sm">
                    {connectStep === 1 && 'Scanning QR Code...'}
                    {connectStep === 2 && 'Authenticating session...'}
                    {connectStep === 3 && 'Syncing profile details...'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Please keep this page open</p>
                </div>
              )}

              <CardHeader className="w-full pb-3">
                <CardTitle className="text-base">Scan QR Code</CardTitle>
                <CardDescription>QR code updates every 60 seconds</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col items-center w-full">
                
                {/* QR code block with scrolling scanner laser */}
                <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-md">
                  <QRCodeSVG value={qrVal} size={200} level="M" />
                  
                  {/* Scanner line animation */}
                  {!connecting && (
                    <div className="absolute left-4 right-4 h-0.5 bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-[scan_2.5s_ease-in-out_infinite]"
                      style={{
                        animation: 'scan-laser 3s ease-in-out infinite'
                      }}
                    />
                  )}
                </div>

                {/* Simulated CSS keyframe injection */}
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes scan-laser {
                    0%, 100% { top: 16px; opacity: 0.3; }
                    50% { top: 216px; opacity: 1; }
                  }
                `}} />

                <div className="mt-6 flex flex-col gap-2.5 w-full max-w-[240px]">
                  <Button 
                    className="w-full font-bold bg-emerald-500 hover:bg-emerald-600 text-white gap-2 rounded-xl"
                    onClick={handleStartLinking}
                  >
                    <QrCode className="h-4 w-4" />
                    Simulate Device Link
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs font-bold gap-1.5 rounded-xl text-muted-foreground"
                    onClick={regenerateQR}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      ) : (
        // ── CONNECTED STATE: Connection Dashboard & Settings ──
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Linked Status & Config */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Status card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                  Active Device Session
                </CardTitle>
                <CardDescription>Your POS is actively linked to WhatsApp Web API.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-xl shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Connected Number</p>
                    <p className="text-sm font-semibold mt-1">{phoneNumber}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-xl shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Linked Device</p>
                    <p className="text-sm font-semibold mt-1">{deviceName}</p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-start gap-3">
                  <Zap className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Session Active & Ready</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                      All POS receipts and bills will now route dynamically through this terminal. Auto-sending is configured below.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    variant="ghost" 
                    className="text-xs text-destructive hover:bg-destructive/10 gap-1.5 h-8 font-bold"
                    onClick={handleDisconnect}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Disconnect WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Settings */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Automation Settings
                </CardTitle>
                <CardDescription>Configure auto-actions and messaging content templates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                
                {/* Auto send billing toggle */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div>
                    <Label className="text-sm font-semibold cursor-pointer" htmlFor="auto-send">Auto-Send Invoices</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Send a WhatsApp invoice copy immediately when creating bills.</p>
                  </div>
                  <Switch 
                    id="auto-send"
                    checked={autoSend}
                    onCheckedChange={setAutoSend}
                    className="accent-emerald-500"
                  />
                </div>

                {/* Custom message templates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Billing Message Template</Label>
                    <span className="text-[10px] text-muted-foreground">supports markdown syntax</span>
                  </div>
                  <Textarea
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="font-mono text-xs leading-relaxed"
                    rows={6}
                    placeholder="Enter template format..."
                  />
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Available Variables</p>
                    <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
                      <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;store_name&#125;</span>
                      <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;customer_name&#125;</span>
                      <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;invoice_no&#125;</span>
                      <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground font-semibold">&#123;amount&#125;</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Test connection column */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-500" />
                  Test Integration
                </CardTitle>
                <CardDescription>Send a test text message to verify your connection is responsive.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendTest} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold" htmlFor="test-phone">Mobile Number</Label>
                    <div className="flex gap-2">
                      <span className="bg-muted px-3 py-2 text-sm font-bold text-muted-foreground rounded-lg flex items-center justify-center">+91</span>
                      <Input
                        id="test-phone"
                        placeholder="10-digit number"
                        value={testNumber}
                        onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        maxLength={10}
                        className="rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-xl text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                    <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>This will send a simple connection greeting text message to confirm message queues are active.</span>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
                    disabled={testSending || !testNumber || testNumber.length !== 10}
                  >
                    {testSending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-1.5" /> Send Test Message</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      )}

    </div>
  );
}
