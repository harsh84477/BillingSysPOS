import React, { useState } from 'react';

/* ═══════════════════════════════════════════════════
   Design Tokens — Premium POS Settings System
   ═══════════════════════════════════════════════════ */
const T = {
    font: "'Inter', 'DM Sans', 'Segoe UI', system-ui, sans-serif",
    radius: { card: '14px', btn: '10px', input: '10px', toggle: '12px' },
    color: {
        pageBg: 'hsl(var(--background))',
        cardBg: 'hsl(var(--card))',
        inputBg: 'hsl(var(--input))',
        border: 'hsl(var(--border))',
        borderFocus: 'hsl(var(--ring))',
        textPri: 'hsl(var(--foreground))',
        textSec: 'hsl(var(--muted-foreground))',
        textMuted: 'hsl(var(--muted-foreground))',
        textLabel: 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--primary))',
        saved: 'hsl(var(--primary))',
        toggleOn: 'hsl(var(--primary))',
        toggleOff: 'hsl(var(--muted))',
        danger: 'hsl(var(--destructive))',
        sectionLabel: 'hsl(var(--primary))',
    },
    shadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        cardHover: '0 4px 12px rgba(0,0,0,0.08)',
        input: '0 1px 2px rgba(0,0,0,0.04)',
    },
};

/* ═══ Helper for dynamic opacity with hex OR css variables ═══ */
export const op = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

/* ═══ SettingsCard ═══ */
export function SettingsCard({ title, subtitle, icon, accent = 'hsl(var(--primary))', children, footer, className }: {
    title: string; subtitle?: string; icon: string; accent?: string;
    children: React.ReactNode; footer?: React.ReactNode; className?: string;
}) {
    return (
        <div style={{
            background: T.color.cardBg,
            borderRadius: T.radius.card,
            boxShadow: T.shadow.card,
            border: `1px solid ${T.color.border}`,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s ease',
        }} className={className}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = T.shadow.cardHover)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = T.shadow.card)}
        >
            {/* Card Header */}
            <div style={{
                padding: '18px 22px 14px',
                borderBottom: `1px solid ${T.color.border}`,
                background: `linear-gradient(135deg, ${op(accent, 4)} 0%, ${op(accent, 1)} 50%, transparent 100%)`,
                position: 'relative',
            }}>
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                    background: accent, borderRadius: '0 3px 3px 0',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: op(accent, 7), display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                    }}>{icon}</div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.color.textPri, letterSpacing: '-0.01em' }}>{title}</div>
                        {subtitle && <div style={{ fontSize: '12px', color: T.color.textMuted, marginTop: '1px', lineHeight: 1.4 }}>{subtitle}</div>}
                    </div>
                </div>
            </div>
            {/* Card Body */}
            <div style={{ padding: '16px 22px 20px' }}>{children}</div>
            {footer && <div style={{ padding: '0 22px 18px' }}>{footer}</div>}
        </div>
    );
}

/* ═══ Toggle ═══ */
export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button type="button" onClick={() => !disabled && onChange(!on)} style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
            background: on ? T.color.toggleOn : T.color.toggleOff,
            transition: 'background 0.25s cubic-bezier(.4,0,.2,1)',
            opacity: disabled ? 0.45 : 1, flexShrink: 0,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }}>
            <span style={{
                position: 'absolute', top: '3px', left: on ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%', background: 'var(--card, #fff)',
                transition: 'left 0.25s cubic-bezier(.4,0,.2,1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
        </button>
    );
}

/* ═══ Counter ═══ */
export function Counter({ value, min = 0, max = 99, onChange, disabled }: {
    value: number; min?: number; max?: number; onChange: (v: number) => void; disabled?: boolean;
}) {
    const btn: React.CSSProperties = {
        width: '32px', height: '32px', border: 'none', background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 700,
        color: T.color.textSec, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
    };
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center',
            border: `1.5px solid ${T.color.border}`, borderRadius: T.radius.btn,
            overflow: 'hidden', opacity: disabled ? 0.45 : 1, background: T.color.inputBg,
        }}>
            <button style={{ ...btn, borderRight: `1px solid ${T.color.border}` }}
                onClick={() => !disabled && onChange(Math.max(min, value - 1))}
                onMouseEnter={e => !disabled && (e.currentTarget.style.background = op(T.color.textPri, 5))}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>−</button>
            <span style={{
                minWidth: '36px', textAlign: 'center', fontSize: '13px', fontWeight: 700,
                color: T.color.textPri, fontFamily: 'monospace', padding: '0 4px',
            }}>{value}</span>
            <button style={{ ...btn, borderLeft: `1px solid ${T.color.border}` }}
                onClick={() => !disabled && onChange(Math.min(max, value + 1))}
                onMouseEnter={e => !disabled && (e.currentTarget.style.background = op(T.color.textPri, 5))}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>+</button>
        </div>
    );
}

/* ═══ SettingRow ═══ */
export function SettingRow({ label, desc, right, noBorder }: {
    label: string; desc?: string; right: React.ReactNode; noBorder?: boolean;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-3" style={{
            borderBottom: noBorder ? 'none' : `1px solid ${op(T.color.border, 50)}`,
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 550, color: T.color.textPri, lineHeight: 1.3 }}>{label}</div>
                {desc && <div style={{ fontSize: '11.5px', color: T.color.textMuted, marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>}
            </div>
            <div className="w-full sm:w-auto flex justify-end" style={{ flexShrink: 0 }}>{right}</div>
        </div>
    );
}

/* ═══ SectionLabel ═══ */
export function SectionLabel({ text }: { text: string }) {
    return (
        <div style={{
            fontSize: '10.5px', fontWeight: 700, color: T.color.sectionLabel,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            padding: '18px 0 6px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
            <span>{text}</span>
            <div style={{ flex: 1, height: '1px', background: op(T.color.sectionLabel, 12) }} />
        </div>
    );
}

/* ═══ TextInput ═══ */
export function TextInput({ value, defaultValue, placeholder, hint, onBlur, onChange, disabled, id, name, type, style: extraStyle, maxLength }: {
    value?: string; defaultValue?: string; placeholder?: string; hint?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean; id?: string; name?: string; type?: string;
    style?: React.CSSProperties; maxLength?: number;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <input id={id} name={name} type={type || 'text'} value={value} defaultValue={defaultValue}
                placeholder={placeholder} maxLength={maxLength}
                onFocus={() => setFocused(true)} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
                onChange={onChange} disabled={disabled}
                style={{
                    width: '100%', padding: '9px 13px', fontSize: '13px', borderRadius: T.radius.input,
                    border: `1.5px solid ${focused ? T.color.borderFocus : T.color.border}`,
                    background: disabled ? op(T.color.textPri, 5) : T.color.inputBg, outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s', fontFamily: T.font,
                    color: T.color.textPri, boxSizing: 'border-box' as const,
                    opacity: disabled ? 0.6 : 1, boxShadow: focused ? `0 0 0 3px ${op(T.color.borderFocus, 8)}` : T.shadow.input,
                    ...extraStyle,
                }}
            />
            {hint && <div style={{ fontSize: '11px', color: T.color.textMuted, marginTop: '5px', fontStyle: 'italic' }}>{hint}</div>}
        </div>
    );
}

/* ═══ TextArea ═══ */
export function TextArea({ value, defaultValue, placeholder, onBlur, onChange, disabled, id, name, rows }: {
    value?: string; defaultValue?: string; placeholder?: string;
    onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean; id?: string; name?: string; rows?: number;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <textarea id={id} name={name} value={value} defaultValue={defaultValue} placeholder={placeholder} rows={rows || 3}
            onFocus={() => setFocused(true)} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            onChange={onChange} disabled={disabled}
            style={{
                width: '100%', padding: '9px 13px', fontSize: '13px', borderRadius: T.radius.input,
                border: `1.5px solid ${focused ? T.color.borderFocus : T.color.border}`,
                background: disabled ? op(T.color.textPri, 5) : T.color.inputBg, outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s', fontFamily: T.font,
                color: T.color.textPri, resize: 'vertical' as const, boxSizing: 'border-box' as const,
                opacity: disabled ? 0.6 : 1, minHeight: '70px',
                boxShadow: focused ? `0 0 0 3px ${op(T.color.borderFocus, 8)}` : T.shadow.input,
            }}
        />
    );
}

/* ═══ SaveBtn ═══ */
export function SaveBtn({ label = 'Save Changes', onClick, disabled, color = T.color.accent, className }: {
    label?: string; onClick?: () => void; disabled?: boolean; color?: string; className?: string;
}) {
    const [saved, setSaved] = useState(false);
    const [hovered, setHovered] = useState(false);
    const handleClick = () => { onClick?.(); setSaved(true); setTimeout(() => setSaved(false), 2000); };
    return (
        <button type="submit" onClick={onClick ? handleClick : undefined} disabled={disabled}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            className={className || "w-full sm:w-auto"}
            style={{
                padding: '12px 28px', minHeight: '44px', fontSize: '13px', fontWeight: 600, borderRadius: T.radius.btn,
                border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '-0.01em',
                background: saved ? T.color.saved : color, color: '#fff',
                transition: 'all 0.2s', opacity: disabled ? 0.5 : 1, fontFamily: T.font,
                boxShadow: hovered && !disabled ? `0 4px 14px ${op(color, 25)}` : `0 2px 8px ${op(color, 15)}`,
                transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
            }}
        >{saved ? '✓ Saved!' : label}</button>
    );
}

/* ═══ ButtonGroup ═══ */
export function ButtonGroup({ options, value, onChange, disabled, accentColor = T.color.accent }: {
    options: { id: string; label: string; desc?: string }[]; value: string;
    onChange: (id: string) => void; disabled?: boolean; accentColor?: string;
}) {
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            {options.map(opt => {
                const active = value === opt.id;
                return (
                    <button key={opt.id} type="button" disabled={disabled}
                        onClick={() => !disabled && onChange(opt.id)}
                        style={{
                            flex: 1, minWidth: '72px', padding: '10px 10px', borderRadius: '10px',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            border: `2px solid ${active ? accentColor : T.color.border}`,
                            background: active ? op(accentColor, 4) : T.color.cardBg,
                            boxShadow: active ? `0 0 0 3px ${op(accentColor, 7)}` : 'none',
                            transition: 'all 0.2s', textAlign: 'center' as const, fontFamily: T.font,
                        }}>
                        <div style={{ fontSize: '12.5px', fontWeight: active ? 700 : 500, color: active ? accentColor : T.color.textPri }}>{opt.label}</div>
                        {opt.desc && <div style={{ fontSize: '10px', color: T.color.textMuted, marginTop: '2px' }}>{opt.desc}</div>}
                    </button>
                );
            })}
        </div>
    );
}

/* ═══ SelectInput ═══ */
export function SelectInput({ options, value, onChange, disabled }: {
    options: { value: string; label: string }[]; value: string;
    onChange: (v: string) => void; disabled?: boolean;
}) {
    return (
        <select value={value} onChange={e => !disabled && onChange(e.target.value)} disabled={disabled}
            style={{
                padding: '8px 14px', fontSize: '12.5px', borderRadius: T.radius.input,
                border: `1.5px solid ${T.color.border}`, background: T.color.inputBg,
                fontFamily: T.font, color: T.color.textPri, outline: 'none', cursor: 'pointer',
                opacity: disabled ? 0.5 : 1, minWidth: '128px', boxShadow: T.shadow.input,
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                paddingRight: '32px',
            }}
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

/* ═══ InfoBox ═══ */
export function InfoBox({ bg, border, icon, title, titleColor, value, valueColor }: {
    bg: string; border: string; icon?: string; title: string; titleColor?: string;
    value?: string; valueColor?: string;
}) {
    return (
        <div style={{
            background: bg, border, borderRadius: '10px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: '12px',
        }}>
            {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
            <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: titleColor || T.color.textPri }}>{title}</div>
                {value && <div style={{ fontSize: '13px', fontWeight: 700, color: valueColor || T.color.textPri, marginTop: '2px', fontFamily: 'monospace' }}>{value}</div>}
            </div>
        </div>
    );
}

/* ═══ TabBar ═══ */
export function TabBar({ tabs, active, onSelect }: {
    tabs: { id: string; label: string; icon: string }[]; active: string; onSelect: (id: string) => void;
}) {
    return (
        <div className="scrollbar-hide" style={{
            display: 'flex', gap: '0', borderBottom: `2px solid ${T.color.border}`,
            overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as const,
            scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
            {tabs.map(tab => {
                const isActive = tab.id === active;
                return (
                    <button key={tab.id} type="button" onClick={() => onSelect(tab.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '7px', padding: '11px 18px',
                        fontSize: '13px', fontWeight: isActive ? 650 : 450,
                        color: isActive ? T.color.accent : T.color.textLabel,
                        border: 'none', background: isActive ? op(T.color.accent, 5) : 'transparent',
                        borderBottom: isActive ? `2.5px solid ${T.color.accent}` : '2.5px solid transparent',
                        marginBottom: '-2px', cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(.4,0,.2,1)', whiteSpace: 'nowrap' as const,
                        fontFamily: T.font, flexShrink: 0, borderRadius: '8px 8px 0 0',
                    }}>
                        <span style={{ fontSize: '15px' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ═══ Layout Helpers ═══ */
export const TwoColGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
);

export const ColStack: React.FC<{ children: React.ReactNode; gap?: string }> = ({ children, gap = '20px' }) => (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap }}>{children}</div>
);

/* ═══ FieldLabel ═══ */
export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
    return (
        <label htmlFor={htmlFor} style={{
            fontSize: '12.5px', fontWeight: 600, color: T.color.textSec,
            display: 'block', marginBottom: '6px', letterSpacing: '-0.01em',
        }}>{children}</label>
    );
}

/* ═══ ComingSoon ═══ */
export function ComingSoon({ icon, label }: { icon: string; label: string }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
            padding: '80px 20px', color: T.color.textMuted, gap: '16px',
            background: T.color.cardBg, borderRadius: T.radius.card, border: `1px solid ${T.color.border}`,
            boxShadow: T.shadow.card,
        }}>
            <span style={{ fontSize: '56px', filter: 'grayscale(0.3)' }}>{icon}</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: T.color.textPri }}>{label}</div>
            <div style={{ fontSize: '13px', color: T.color.textMuted }}>This section is coming soon</div>
            <div style={{
                padding: '6px 16px', borderRadius: '20px', background: op(T.color.accent, 6),
                color: T.color.accent, fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em',
            }}>UNDER DEVELOPMENT</div>
        </div>
    );
}

/* ═══ FormatGroup ═══ */
export function FormatGroup({ value = '', onChange, disabled, accentColor = T.color.accent }: {
    value?: string; onChange: (v: string) => void; disabled?: boolean; accentColor?: string;
}) {
    const formats = value ? value.split(',') : [];
    const toggle = (fmt: string) => {
        if (formats.includes(fmt)) onChange(formats.filter(f => f !== fmt).join(','));
        else onChange([...formats, fmt].join(','));
    };

    const btnStyle = (active: boolean): React.CSSProperties => ({
        width: '32px', height: '32px', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1.5px solid ${active ? accentColor : T.color.border}`,
        background: active ? op(accentColor, 8) : T.color.cardBg, fontSize: '15px',
        color: active ? accentColor : T.color.textPri, transition: 'all 0.2s', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    });

    return (
        <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" disabled={disabled} onClick={() => toggle('bold')} style={{ ...btnStyle(formats.includes('bold')), fontWeight: 800 }}>B</button>
            <button type="button" disabled={disabled} onClick={() => toggle('italic')} style={{ ...btnStyle(formats.includes('italic')), fontStyle: 'italic', fontFamily: 'serif' }}>I</button>
            <button type="button" disabled={disabled} onClick={() => toggle('underline')} style={{ ...btnStyle(formats.includes('underline')), textDecoration: 'underline' }}>U</button>
        </div>
    );
}

export { T };
