import React, { useState } from 'react';

/* ─── Design Tokens ─── */
const T = {
    font: "'DM Sans', 'Segoe UI', sans-serif",
    radius: { card: '16px', btn: '8px', input: '8px', toggle: '12px' },
    color: {
        pageBg: '#f8fafc', cardBg: '#ffffff', inputBg: '#fafafa',
        border: '#e5e7eb', borderFocus: '#10b981',
        textPri: '#111827', textSec: '#374151', textMuted: '#9ca3af', textLabel: '#6b7280',
        accent: '#10b981', saved: '#059669',
        toggleOn: '#10b981', toggleOff: '#d1d5db',
        sectionLabel: '#10b981',
    },
    shadow: { card: '0 1px 3px rgba(0,0,0,0.04)' },
};

/* ─── SettingsCard ─── */
export function SettingsCard({ title, subtitle, icon, accent = '#10b981', children, footer, className }: {
    title: string; subtitle?: string; icon: string; accent?: string;
    children: React.ReactNode; footer?: React.ReactNode; className?: string;
}) {
    return (
        <div style={{
            background: T.color.cardBg, borderRadius: T.radius.card,
            boxShadow: T.shadow.card, border: `1px solid ${T.color.border}`,
            borderLeft: `4px solid ${accent}`, overflow: 'hidden',
        }} className={className}>
            <div style={{
                padding: '20px 24px 14px', background: `linear-gradient(to right, ${accent}08, transparent)`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: T.color.textPri }}>{title}</div>
                        {subtitle && <div style={{ fontSize: '12px', color: T.color.textMuted, marginTop: '2px' }}>{subtitle}</div>}
                    </div>
                </div>
            </div>
            <div style={{ padding: '4px 24px 20px' }}>{children}</div>
            {footer && <div style={{ padding: '0 24px 20px' }}>{footer}</div>}
        </div>
    );
}

/* ─── Toggle ─── */
export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!on)}
            style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: disabled ? 'default' : 'pointer',
                background: on ? T.color.toggleOn : T.color.toggleOff, position: 'relative',
                transition: 'background 0.2s', opacity: disabled ? 0.5 : 1, flexShrink: 0,
            }}
        >
            <span style={{
                position: 'absolute', top: '3px', left: on ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
        </button>
    );
}

/* ─── Counter ─── */
export function Counter({ value, min = 0, max = 99, onChange, disabled }: {
    value: number; min?: number; max?: number; onChange: (v: number) => void; disabled?: boolean;
}) {
    const btnStyle: React.CSSProperties = {
        width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        fontSize: '16px', fontWeight: 600, color: T.color.textSec, display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
    return (
        <div style={{
            display: 'flex', alignItems: 'center', border: `1px solid ${T.color.border}`,
            borderRadius: T.radius.btn, overflow: 'hidden', opacity: disabled ? 0.5 : 1,
        }}>
            <button style={btnStyle} onClick={() => !disabled && onChange(Math.max(min, value - 1))}>−</button>
            <span style={{ width: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: T.color.textPri }}>{value}</span>
            <button style={btnStyle} onClick={() => !disabled && onChange(Math.min(max, value + 1))}>+</button>
        </div>
    );
}

/* ─── SettingRow ─── */
export function SettingRow({ label, desc, right, noBorder }: {
    label: string; desc?: string; right: React.ReactNode; noBorder?: boolean;
}) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            padding: '14px 0', borderBottom: noBorder ? 'none' : `1px solid #f3f4f6`,
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: T.color.textPri }}>{label}</div>
                {desc && <div style={{ fontSize: '12px', color: T.color.textMuted, marginTop: '2px' }}>{desc}</div>}
            </div>
            {right}
        </div>
    );
}

/* ─── SectionLabel ─── */
export function SectionLabel({ text }: { text: string }) {
    return (
        <div style={{
            fontSize: '11px', fontWeight: 700, color: T.color.sectionLabel,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '16px 0 4px',
        }}>{text}</div>
    );
}

/* ─── TextInput ─── */
export function TextInput({ value, defaultValue, placeholder, hint, onBlur, onChange, disabled, id, name, type, style: extraStyle }: {
    value?: string; defaultValue?: string; placeholder?: string; hint?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean; id?: string; name?: string; type?: string; style?: React.CSSProperties;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <input
                id={id} name={name} type={type || 'text'}
                value={value} defaultValue={defaultValue} placeholder={placeholder}
                onFocus={() => setFocused(true)} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
                onChange={onChange} disabled={disabled}
                style={{
                    width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: T.radius.input,
                    border: `1.5px solid ${focused ? T.color.borderFocus : T.color.border}`,
                    background: T.color.inputBg, outline: 'none', transition: 'border-color 0.2s',
                    fontFamily: T.font, color: T.color.textPri, boxSizing: 'border-box' as const,
                    opacity: disabled ? 0.5 : 1, ...extraStyle,
                }}
            />
            {hint && <div style={{ fontSize: '11px', color: T.color.textMuted, marginTop: '4px', fontStyle: 'italic' }}>{hint}</div>}
        </div>
    );
}

/* ─── TextArea ─── */
export function TextArea({ defaultValue, placeholder, onBlur, disabled, id, name, rows }: {
    defaultValue?: string; placeholder?: string; onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean; id?: string; name?: string; rows?: number;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <textarea
            id={id} name={name} defaultValue={defaultValue} placeholder={placeholder} rows={rows || 3}
            onFocus={() => setFocused(true)} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            disabled={disabled}
            style={{
                width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: T.radius.input,
                border: `1.5px solid ${focused ? T.color.borderFocus : T.color.border}`,
                background: T.color.inputBg, outline: 'none', transition: 'border-color 0.2s',
                fontFamily: T.font, color: T.color.textPri, resize: 'vertical' as const,
                boxSizing: 'border-box' as const, opacity: disabled ? 0.5 : 1, minHeight: '70px',
            }}
        />
    );
}

/* ─── SaveBtn ─── */
export function SaveBtn({ label = 'Save Changes', onClick, disabled, color = T.color.accent }: {
    label?: string; onClick?: () => void; disabled?: boolean; color?: string;
}) {
    const [saved, setSaved] = useState(false);
    const handleClick = () => { onClick?.(); setSaved(true); setTimeout(() => setSaved(false), 2000); };
    return (
        <button
            type="submit" onClick={onClick ? handleClick : undefined} disabled={disabled}
            style={{
                padding: '10px 24px', fontSize: '13px', fontWeight: 700, borderRadius: T.radius.btn,
                border: 'none', cursor: disabled ? 'default' : 'pointer',
                background: saved ? T.color.saved : color, color: '#fff',
                transition: 'background 0.2s', opacity: disabled ? 0.6 : 1, fontFamily: T.font,
            }}
        >{saved ? '✓ Saved!' : label}</button>
    );
}

/* ─── ButtonGroup ─── */
export function ButtonGroup({ options, value, onChange, disabled, accentColor = T.color.accent }: {
    options: { id: string; label: string; desc?: string }[]; value: string;
    onChange: (id: string) => void; disabled?: boolean; accentColor?: string;
}) {
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            {options.map(opt => {
                const active = value === opt.id;
                return (
                    <button
                        key={opt.id} type="button" disabled={disabled}
                        onClick={() => !disabled && onChange(opt.id)}
                        style={{
                            flex: 1, minWidth: '70px', padding: '10px 8px', borderRadius: '10px', cursor: disabled ? 'default' : 'pointer',
                            border: `2px solid ${active ? accentColor : T.color.border}`,
                            background: active ? `${accentColor}10` : '#fafafa',
                            transition: 'all 0.2s', textAlign: 'center' as const, fontFamily: T.font,
                        }}
                    >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: active ? accentColor : T.color.textPri }}>{opt.label}</div>
                        {opt.desc && <div style={{ fontSize: '9px', color: T.color.textMuted, marginTop: '2px' }}>{opt.desc}</div>}
                    </button>
                );
            })}
        </div>
    );
}

/* ─── SelectInput ─── */
export function SelectInput({ options, value, onChange, disabled }: {
    options: { value: string; label: string }[]; value: string;
    onChange: (v: string) => void; disabled?: boolean;
}) {
    return (
        <select
            value={value} onChange={e => !disabled && onChange(e.target.value)} disabled={disabled}
            style={{
                padding: '6px 12px', fontSize: '12px', borderRadius: T.radius.input,
                border: `1.5px solid ${T.color.border}`, background: T.color.inputBg,
                fontFamily: T.font, color: T.color.textPri, outline: 'none', cursor: 'pointer',
                opacity: disabled ? 0.5 : 1, minWidth: '120px',
            }}
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

/* ─── InfoBox ─── */
export function InfoBox({ bg, border, icon, title, titleColor, value, valueColor }: {
    bg: string; border: string; icon?: string; title: string; titleColor?: string;
    value?: string; valueColor?: string;
}) {
    return (
        <div style={{
            background: bg, border, borderRadius: '10px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: '10px',
        }}>
            {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
            <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: titleColor || T.color.textPri }}>{title}</div>
                {value && <div style={{ fontSize: '13px', fontWeight: 700, color: valueColor || T.color.textPri, marginTop: '2px' }}>{value}</div>}
            </div>
        </div>
    );
}

/* ─── TabBar ─── */
export function TabBar({ tabs, active, onSelect }: {
    tabs: { id: string; label: string; icon: string }[]; active: string; onSelect: (id: string) => void;
}) {
    return (
        <div style={{
            display: 'flex', gap: '0', borderBottom: `1px solid ${T.color.border}`,
            overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as const,
        }}>
            {tabs.map(tab => {
                const isActive = tab.id === active;
                return (
                    <button
                        key={tab.id} type="button" onClick={() => onSelect(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '12px 16px', fontSize: '13px', fontWeight: isActive ? 700 : 500,
                            color: isActive ? T.color.accent : T.color.textLabel, border: 'none', background: 'transparent',
                            borderBottom: isActive ? `2.5px solid ${T.color.accent}` : '2.5px solid transparent',
                            cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const,
                            fontFamily: T.font, flexShrink: 0,
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ─── Page Layout Helpers ─── */
export const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontFamily: T.font, background: T.color.pageBg, minHeight: '100vh' }}>
        {children}
    </div>
);

export const TwoColGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {children}
    </div>
);

export const ColStack: React.FC<{ children: React.ReactNode; gap?: string }> = ({ children, gap = '20px' }) => (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap }}>{children}</div>
);

/* ─── Field Label ─── */
export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
    return (
        <label htmlFor={htmlFor} style={{ fontSize: '13px', fontWeight: 600, color: T.color.textSec, display: 'block', marginBottom: '6px' }}>
            {children}
        </label>
    );
}

/* ─── ComingSoon ─── */
export function ComingSoon({ icon, label }: { icon: string; label: string }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
            padding: '80px 20px', color: T.color.textMuted, gap: '12px',
        }}>
            <span style={{ fontSize: '48px' }}>{icon}</span>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: '13px' }}>This section is coming soon!</div>
        </div>
    );
}

export { T };
