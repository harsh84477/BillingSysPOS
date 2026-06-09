/**
 * components/settings/tabs/AccountTab.tsx — User Profile & Security Settings
 *
 * Allows any logged-in user to manage their username/display name,
 * mobile number, and update their password using Supabase Auth.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, Mail, Shield, KeyRound, Loader2 } from 'lucide-react';
import {
  SettingsCard, ColStack, FieldLabel, TextInput, SaveBtn, T, op
} from '../SettingsUI';

export default function AccountTab() {
  const { user, userRole, refreshBusinessInfo } = useAuth();
  
  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, mobile_number')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setDisplayName(data.display_name || '');
          setMobileNumber(data.mobile_number || '');
        } else {
          setDisplayName(user.user_metadata?.display_name || '');
          setMobileNumber(user.phone || '');
        }
      } catch (err: any) {
        toast.error('Failed to load profile details: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Username/Display Name cannot be empty');
      return;
    }

    setSavingProfile(true);
    try {
      // 1. Update profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: trimmedName,
          mobile_number: mobileNumber.trim() || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (profileErr) throw profileErr;

      // 2. Update Supabase Auth User Metadata (updates display_name)
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          display_name: trimmedName
        }
      });

      if (authErr) throw authErr;

      toast.success('Profile updated successfully!');
      
      // Refresh context/auth details
      await refreshBusinessInfo();
    } catch (err: any) {
      toast.error('Failed to update profile: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('Failed to change password: ' + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
    : 'User';

  const initialLetter = displayName
    ? displayName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Loader2 className="animate-spin" style={{ color: 'hsl(var(--primary))', width: '32px', height: '32px' }} />
      </div>
    );
  }

  return (
    <ColStack>
      {/* Profile summary card */}
      <div style={{
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 100%)',
        border: '1px solid hsl(var(--primary) / 0.2)',
        borderRadius: T.radius.card,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Large premium avatar with gradient */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 800,
          color: '#fff',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {initialLetter}
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: T.color.textPri }}>{displayName || 'User'}</h2>
            <div style={{
              background: 'hsl(var(--primary) / 0.1)',
              color: 'hsl(var(--primary))',
              border: '1px solid hsl(var(--primary) / 0.2)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Shield style={{ width: '10px', height: '10px' }} />
              {roleLabel}
            </div>
          </div>
          <p style={{ fontSize: '12.5px', color: T.color.textSec, margin: '4px 0 0' }}>{user?.email}</p>
        </div>
      </div>

      {/* Profile Details Edit Card */}
      <SettingsCard title="Profile Details" subtitle="Edit your personal details and contact number" icon="👤" accent="hsl(var(--primary))">
        <form onSubmit={handleUpdateProfile}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <FieldLabel htmlFor="displayName">Username / Full Name</FieldLabel>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: T.color.textMuted }} />
                <TextInput
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter username"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>
            
            <div>
              <FieldLabel htmlFor="mobileNumber">Mobile Number</FieldLabel>
              <div style={{ position: 'relative' }}>
                <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: T.color.textMuted }} />
                <TextInput
                  id="mobileNumber"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. +91 9999999999"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <FieldLabel htmlFor="email">Email Address (Read-only)</FieldLabel>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: T.color.textMuted }} />
              <TextInput
                id="email"
                value={user?.email || ''}
                disabled={true}
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: T.color.textMuted, marginTop: '6px', fontStyle: 'italic' }}>
              Email address cannot be changed as it is used for account verification and sign-in.
            </p>
          </div>

          <SaveBtn label="Save Profile Changes" disabled={savingProfile} />
        </form>
      </SettingsCard>

      {/* Security settings card */}
      <SettingsCard title="Change Password" subtitle="Keep your account secure by updating your password regularly" icon="🔑" accent="hsl(var(--destructive))">
        <form onSubmit={handleChangePassword}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
              <div style={{ position: 'relative' }}>
                <KeyRound style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: T.color.textMuted }} />
                <TextInput
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>
            
            <div>
              <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
              <div style={{ position: 'relative' }}>
                <KeyRound style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: T.color.textMuted }} />
                <TextInput
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>
          </div>

          <SaveBtn label="Change Password" color="hsl(var(--destructive))" disabled={savingPassword} />
        </form>
      </SettingsCard>
    </ColStack>
  );
}
