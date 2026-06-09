import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Trash2,
  Info,
  ShieldCheck,
  Zap,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';
const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'pos-admin-key';

export default function WhatsAppSettingsTab() {
  const [status, setStatus] = useState<'Disconnected' | 'QR Waiting' | 'Connecting' | 'Connected'>('Disconnected');
  const [user, setUser] = useState<{ name: string; number: string }>({ name: '', number: '' });
  const [qrCode, setQrCode] = useState<string>('');
  const [connectionError, setConnectionError] = useState(false);
  
  // Test console state
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from Restaurant POS System! 🚀');
  const [sendingTest, setSendingTest] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    // Establish Socket.IO real-time connection
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('Socket.IO connection established for WhatsApp updates');
      setConnectionError(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setConnectionError(true);
      setStatus('Disconnected');
    });

    socket.on('whatsapp-status', (data) => {
      setStatus(data.status);
      setUser(data.user);
      if (data.status !== 'QR Waiting') {
        setQrCode(''); // Clear QR if connection status changes from QR waiting
      }
    });

    socket.on('whatsapp-qr', (qrStr) => {
      setStatus('QR Waiting');
      setQrCode(qrStr);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO connection closed');
      setConnectionError(true);
    });

    // Cleanup socket on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Disconnect / Logout Session
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to log out and disconnect your WhatsApp Web session?')) {
      return;
    }
    
    setLoadingAction(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('WhatsApp session disconnected and logged out successfully.');
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      toast.error(`Disconnect Error: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Test Message Sending
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber) {
      toast.error('Please enter a recipient phone number.');
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          to: testNumber,
          text: testMessage
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Test message sent successfully!');
        setTestNumber('');
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      toast.error(`Send Error: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Header Info Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-5.5 w-5.5 text-emerald-500 shrink-0" />
            WhatsApp Web Integration
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your WhatsApp account to send digital bills, order notifications, and status updates directly.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'Connected' && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 gap-1.5 px-3 py-1 font-semibold text-xs">
              <CheckCircle className="h-3.5 w-3.5" />
              Connected
            </Badge>
          )}
          {status === 'Connecting' && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 gap-1.5 px-3 py-1 font-semibold text-xs animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Connecting...
            </Badge>
          )}
          {status === 'QR Waiting' && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 gap-1.5 px-3 py-1 font-semibold text-xs animate-pulse">
              <QrCode className="h-3.5 w-3.5" />
              QR Waiting
            </Badge>
          )}
          {status === 'Disconnected' && (
            <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 gap-1.5 px-3 py-1 font-semibold text-xs">
              <XCircle className="h-3.5 w-3.5" />
              Disconnected
            </Badge>
          )}
        </div>
      </div>
      
      {/* Connection Offline Alert Banner */}
      {connectionError && (
        <div className="bg-red-50 border border-red-200 dark:bg-red-950/10 dark:border-red-900 rounded-xl p-4 flex gap-3 text-xs items-start">
          <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-red-800 dark:text-red-400">Backend Server Offline / Inaccessible</p>
            <p className="text-red-700 dark:text-red-500 leading-relaxed">
              Cannot connect to the POS backend server on <code className="bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded font-mono">http://localhost:5000</code>. Please ensure the backend Node server is running (run <code className="bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded font-mono">npm run dev</code> inside the <code className="bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded font-mono">backend</code> folder to launch the server).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Connection status section (QR or Dashboard) */}
        {status !== 'Connected' ? (
          // ── QR LINKING STATE ──
          <>
            {/* Instructions */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <Card className="flex-1 border shadow-sm backdrop-blur-md bg-card/60">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-emerald-500" />
                    How to Link Your WhatsApp
                  </CardTitle>
                  <CardDescription>Follow these steps to connect your device and start sending bills.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  
                  <div className="flex gap-3.5 items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm">Open WhatsApp on your Phone</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Make sure you are logged in on the device you want to link.</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm">Navigate to Linked Devices</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tap **Menu** (three dots on Android) or **Settings** (iOS) &gt; select **Linked Devices**.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm">Link Device & Scan QR</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tap **Link a Device** and point your phone camera at the QR code displayed on the right.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-muted rounded-xl flex gap-3 text-xs items-start border">
                    <Info className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">Important Note</p>
                      <p className="text-muted-foreground leading-relaxed">
                        To maintain a stable background connection, ensure your phone remains connected to the internet. The session will recover automatically if the POS server restarts.
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* QR Card */}
            <div className="lg:col-span-5">
              <Card className="h-full flex flex-col justify-center items-center text-center p-6 border shadow-sm backdrop-blur-md bg-card/60 relative overflow-hidden">
                
                {status === 'Connecting' && (
                  <div className="absolute inset-0 bg-background/90 z-20 flex flex-col items-center justify-center p-4">
                    <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
                    <h3 className="font-bold text-sm">Authenticating Session...</h3>
                    <p className="text-xs text-muted-foreground mt-1.5">Checking security keys and syncing profiles</p>
                  </div>
                )}

                {status === 'Disconnected' && (
                  <div className="absolute inset-0 bg-background/90 z-20 flex flex-col items-center justify-center p-4 space-y-4">
                    <AlertCircle className="h-10 w-10 text-amber-500 animate-bounce" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm">Connecting Server Socket...</h3>
                      <p className="text-xs text-muted-foreground">Initializing Baileys local bridge</p>
                    </div>
                    <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                  </div>
                )}

                <CardHeader className="w-full pb-3">
                  <CardTitle className="text-sm font-bold">WhatsApp Login QR</CardTitle>
                  <CardDescription className="text-[11px]">Scan this QR to log in securely</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center w-full relative">
                  {qrCode ? (
                    <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-md">
                      <QRCodeSVG value={qrCode} size={200} level="M" />
                      
                      {/* Laser scanner animation */}
                      <div className="absolute left-4 right-4 h-0.5 bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-[scan_3s_ease-in-out_infinite]"
                        style={{
                          animation: 'scan-laser 3s ease-in-out infinite'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-[234px] w-[234px] bg-muted flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 gap-2">
                      <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                      <span className="text-xs text-muted-foreground">Generating fresh QR...</span>
                    </div>
                  )}

                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scan-laser {
                      0%, 100% { top: 16px; opacity: 0.3; }
                      50% { top: 216px; opacity: 1; }
                    }
                  `}} />
                  
                  <p className="text-[10px] text-muted-foreground mt-4 leading-normal max-w-[200px]">
                    QR code updates automatically. Scanning connects your device instantly.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          // ── CONNECTED STATE ──
          <>
            {/* Session info dashboard */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border shadow-sm backdrop-blur-md bg-card/60">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                    Linked Device Session
                  </CardTitle>
                  <CardDescription>Your POS server is linked to WhatsApp Web.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Info grids */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/60 border rounded-xl">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Connected Profile</p>
                      <p className="text-sm font-semibold mt-1 truncate">{user.name}</p>
                    </div>
                    <div className="p-3 bg-muted/60 border rounded-xl">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">WhatsApp Number</p>
                      <p className="text-sm font-semibold mt-1 font-mono">+{user.number}</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-start gap-3">
                    <Zap className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Device Link Active</p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                        Automatic bill delivery will route through this session. You can send test notifications on the right to check latency.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      variant="ghost"
                      onClick={handleDisconnect}
                      disabled={loadingAction}
                      className="text-xs text-destructive hover:bg-destructive/10 gap-1.5 h-8.5 font-bold"
                    >
                      {loadingAction ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Logging out...</>
                      ) : (
                        <><Trash2 className="h-3.5 w-3.5" /> Logout Session</>
                      )}
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Test console */}
            <div className="lg:col-span-5">
              <Card className="border shadow-sm backdrop-blur-md bg-card/60 h-full flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    Test Connection
                  </CardTitle>
                  <CardDescription>Send a test text message to verify responsiveness.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendTestMessage} className="space-y-4">
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="test-phone-web" className="text-xs font-bold">Mobile Number</Label>
                      <div className="flex gap-2">
                        <span className="bg-muted border rounded-l-lg px-3 flex items-center justify-center text-xs font-bold text-muted-foreground">+91</span>
                        <Input
                          id="test-phone-web"
                          placeholder="10-digit number"
                          value={testNumber}
                          onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="rounded-r-lg text-xs"
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="test-msg-web" className="text-xs font-bold">Message Content</Label>
                      <Input
                        id="test-msg-web"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="text-xs rounded-lg"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs h-9.5 gap-1.5 mt-2"
                      disabled={sendingTest || !testNumber || testNumber.length !== 10}
                    >
                      {sendingTest ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="h-3.5 w-3.5" /> Send Message</>
                      )}
                    </Button>

                  </form>
                </CardContent>
              </Card>
            </div>
          </>
        )}

      </div>

    </div>
  );
}
