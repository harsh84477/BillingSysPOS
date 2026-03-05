import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import {
    SettingsCard, Toggle, Counter, SettingRow, SectionLabel,
    TextInput, TextArea, FieldLabel, ButtonGroup, SelectInput, TwoColGrid, ColStack,
    FormatGroup,
} from './SettingsUI';
import { toast } from 'sonner';

// ─── Save Button ───
function SaveButton({ dirty, saving, onClick, disabled }: { dirty: boolean; saving: boolean; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            disabled={!dirty || saving || disabled}
            onClick={onClick}
            style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: dirty && !saving && !disabled ? 'pointer' : 'not-allowed',
                background: dirty ? 'hsl(var(--primary))' : '#e5e7eb',
                color: dirty ? '#fff' : '#9ca3af',
                transition: 'all 0.2s ease',
                opacity: saving ? 0.7 : 1,
            }}
        >
            {saving ? '⏳ Saving…' : dirty ? '💾 Save Changes' : '✓ All Saved'}
        </button>
    );
}

// ─── Hook: section-local state management ───
function useSectionState(settings: any, keys: string[]) {
    const [local, setLocal] = useState<Record<string, any>>({});
    const [dirty, setDirty] = useState(false);

    // Sync when settings arrive from server
    useEffect(() => {
        if (settings) {
            const init: Record<string, any> = {};
            keys.forEach(k => { init[k] = (settings as any)?.[k]; });
            setLocal(init);
            setDirty(false);
        }
    }, [settings]);

    const set = useCallback((patch: Record<string, any>) => {
        setLocal(prev => ({ ...prev, ...patch }));
        setDirty(true);
    }, []);

    const get = useCallback((key: string, fallback?: any) => {
        return local[key] !== undefined ? local[key] : fallback;
    }, [local]);

    return { local, set, get, dirty, setDirty };
}

export default function InvoicesTab() {
    const { isAdmin } = useAuth();
    const { data: settings } = useBusinessSettings();
    const updateSettings = useUpdateBusinessSettings();
    const [savingSection, setSavingSection] = useState<string | null>(null);

    // ─── Section 1: General Layout ───
    const layout = useSectionState(settings, ['invoice_style', 'invoice_paper_width', 'invoice_title']);

    // ─── Section 2: Grid Borders ───
    const borders = useSectionState(settings, [
        'invoice_border_whole_bill', 'invoice_border_left', 'invoice_border_right',
        'invoice_border_top', 'invoice_border_bottom', 'invoice_border_inner_v',
        'invoice_border_inner_h', 'invoice_padding', 'invoice_margin',
    ]);

    // ─── Section 3: Header Settings ───
    const header = useSectionState(settings, [
        'invoice_title_align', 'invoice_header_align',
        'invoice_business_name_style', 'invoice_show_business_address', 'invoice_address_style',
        'invoice_show_business_phone', 'invoice_phone_style',
        'invoice_show_business_email', 'invoice_email_style',
        'invoice_contact_separate_lines', 'invoice_show_gst', 'invoice_gst_number_style',
    ]);

    // ─── Section 4: Body & Table ───
    const body = useSectionState(settings, [
        'invoice_font_size', 'invoice_spacing',
        'invoice_item_desc_style', 'invoice_mrp_style', 'invoice_discount_style', 'invoice_gst_style',
        'invoice_column_headers_bold', 'invoice_show_item_price', 'invoice_show_unit_price', 'invoice_show_case',
    ]);

    // ─── Section 5: Footer Settings ───
    const footer = useSectionState(settings, [
        'invoice_footer_align', 'invoice_footer_message', 'invoice_footer_msg_style',
        'invoice_terms_conditions', 'invoice_terms_style',
        'invoice_footer_font_size', 'invoice_footer_spacing',
    ]);

    // ─── Section 6: QR Code ───
    const qr = useSectionState(settings, [
        'invoice_show_qr_code', 'upi_id', 'invoice_qr_size', 'invoice_qr_position',
    ]);

    // ─── Generic save function ───
    const saveSection = async (sectionName: string, sectionState: ReturnType<typeof useSectionState>) => {
        if (!isAdmin) return;
        setSavingSection(sectionName);
        try {
            await updateSettings.mutateAsync(sectionState.local);
            sectionState.setDirty(false);
            toast.success(`${sectionName} saved successfully`);
        } catch (err) {
            toast.error(`Failed to save ${sectionName}`);
        } finally {
            setSavingSection(null);
        }
    };

    return (
        <ColStack>
            {/* Row 1 */}
            <TwoColGrid>
                {/* General Layout */}
                <SettingsCard title="General Layout" subtitle="Overall appearance and paper size" icon="📐" accent="#10b981"
                    footer={<SaveButton dirty={layout.dirty} saving={savingSection === 'General Layout'} onClick={() => saveSection('General Layout', layout)} disabled={!isAdmin} />}
                >
                    <div style={{ marginBottom: '16px' }}>
                        <FieldLabel>Layout Style</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: 'classic', label: 'Classic', desc: 'Typewriter' },
                                { id: 'modern', label: 'Modern', desc: 'Clean' },
                                { id: 'detailed', label: 'Detailed', desc: 'Grid' },
                            ]}
                            value={layout.get('invoice_style', 'modern')}
                            onChange={(id) => layout.set({ invoice_style: id })}
                            disabled={!isAdmin}
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <FieldLabel>Paper Size</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: '58mm', label: '58mm' },
                                { id: '80mm', label: '80mm' },
                                { id: 'A5', label: 'A5' },
                                { id: 'A4', label: 'A4' },
                            ]}
                            value={layout.get('invoice_paper_width', 'A4')}
                            onChange={(id) => layout.set({ invoice_paper_width: id })}
                            disabled={!isAdmin}
                            accentColor="#10b981"
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <FieldLabel htmlFor="invoice_title">Document Title</FieldLabel>
                        <TextInput
                            id="invoice_title"
                            value={layout.get('invoice_title') ?? 'ESTIMATE'}
                            placeholder="e.g., ESTIMATE or INVOICE (leave blank to hide)"
                            onChange={(e) => layout.set({ invoice_title: e.target.value })}
                            disabled={!isAdmin}
                        />
                    </div>
                </SettingsCard>

                {/* Grid Borders */}
                <SettingsCard title="Grid Borders & Lines" subtitle="Customizable grid format spacing for A4/A5" icon="⊞" accent="#3b82f6"
                    footer={<SaveButton dirty={borders.dirty} saving={savingSection === 'Grid Borders'} onClick={() => saveSection('Grid Borders', borders)} disabled={!isAdmin} />}
                >
                    <SettingRow label="Outer Bill Border" desc="Master border around entire invoice" right={<Toggle on={borders.get('invoice_border_whole_bill', false)} onChange={(v) => borders.set({ invoice_border_whole_bill: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Left & Right Borders" desc="Outer sides of table" right={<Toggle on={borders.get('invoice_border_left', true) && borders.get('invoice_border_right', true)} onChange={(v) => borders.set({ invoice_border_left: v, invoice_border_right: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Top Border" desc="Table top line" right={<Toggle on={borders.get('invoice_border_top', true)} onChange={(v) => borders.set({ invoice_border_top: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Bottom Border" desc="Table bottom line" right={<Toggle on={borders.get('invoice_border_bottom', true)} onChange={(v) => borders.set({ invoice_border_bottom: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Vertical Row Lines (Columns)" right={<Toggle on={borders.get('invoice_border_inner_v', true)} onChange={(v) => borders.set({ invoice_border_inner_v: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Horizontal Row Lines" noBorder={!borders.get('invoice_border_whole_bill', false)} right={<Toggle on={borders.get('invoice_border_inner_h', true)} onChange={(v) => borders.set({ invoice_border_inner_h: v })} disabled={!isAdmin} />} />

                    {borders.get('invoice_border_whole_bill', false) && <>
                        <SectionLabel text="Spacing" />
                        <SettingRow label="Border Padding" desc="Space inside the border"
                            right={<Counter value={borders.get('invoice_padding', 20)} min={0} max={60} onChange={(v) => borders.set({ invoice_padding: v })} disabled={!isAdmin} />}
                        />
                        <SettingRow label="Border Margin" desc="Space outside the border" noBorder
                            right={<Counter value={borders.get('invoice_margin', 0)} min={0} max={60} onChange={(v) => borders.set({ invoice_margin: v })} disabled={!isAdmin} />}
                        />
                    </>}
                </SettingsCard>
            </TwoColGrid>

            {/* Row 2 */}
            <TwoColGrid>
                {/* Header Settings */}
                <SettingsCard title="Header Settings" subtitle="Business identity on invoice" icon="🏷️" accent="#f97316"
                    footer={<SaveButton dirty={header.dirty} saving={savingSection === 'Header Settings'} onClick={() => saveSection('Header Settings', header)} disabled={!isAdmin} />}
                >
                    <div style={{ marginBottom: '12px' }}>
                        <FieldLabel>Document Title Alignment</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: 'left', label: '← Left' },
                                { id: 'center', label: '↔ Center' },
                                { id: 'right', label: '→ Right' },
                            ]}
                            value={header.get('invoice_title_align', 'center')}
                            onChange={(id) => header.set({ invoice_title_align: id })}
                            disabled={!isAdmin}
                            accentColor="#f97316"
                        />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <FieldLabel>Header Text Alignment</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: 'left', label: '← Left' },
                                { id: 'center', label: '↔ Center' },
                                { id: 'right', label: '→ Right' },
                            ]}
                            value={header.get('invoice_header_align', 'center')}
                            onChange={(id) => header.set({ invoice_header_align: id })}
                            disabled={!isAdmin}
                            accentColor="#f97316"
                        />
                    </div>
                    <SectionLabel text="Targeted Header Formatting" />
                    <SettingRow label="Business Name" right={<FormatGroup value={header.get('invoice_business_name_style', 'bold')} onChange={(v) => header.set({ invoice_business_name_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />

                    <SettingRow label="Show Address" desc="Toggle visibility" right={<Toggle on={header.get('invoice_show_business_address') !== false} onChange={(v) => header.set({ invoice_show_business_address: v })} disabled={!isAdmin} />} />
                    {header.get('invoice_show_business_address') !== false && <SettingRow label="↳ Address Format" right={<FormatGroup value={header.get('invoice_address_style', '')} onChange={(v) => header.set({ invoice_address_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}

                    <SettingRow label="Show Phone Number" desc="Toggle visibility" right={<Toggle on={header.get('invoice_show_business_phone') !== false} onChange={(v) => header.set({ invoice_show_business_phone: v })} disabled={!isAdmin} />} />
                    {header.get('invoice_show_business_phone') !== false && <SettingRow label="↳ Phone Format" right={<FormatGroup value={header.get('invoice_phone_style', '')} onChange={(v) => header.set({ invoice_phone_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}

                    <SettingRow label="Show Email" desc="Toggle visibility" right={<Toggle on={header.get('invoice_show_business_email') !== false} onChange={(v) => header.set({ invoice_show_business_email: v })} disabled={!isAdmin} />} />
                    {header.get('invoice_show_business_email') !== false && <SettingRow label="↳ Email Format" right={<FormatGroup value={header.get('invoice_email_style', '')} onChange={(v) => header.set({ invoice_email_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}

                    <SettingRow label="Separate Contact Lines" desc="Show Phone & Email on new lines" right={<Toggle on={header.get('invoice_contact_separate_lines') === true} onChange={(v) => header.set({ invoice_contact_separate_lines: v })} disabled={!isAdmin} />} />

                    <SettingRow label="Show GST Number" desc="Toggle visibility" right={<Toggle on={header.get('invoice_show_gst') !== false} onChange={(v) => header.set({ invoice_show_gst: v })} disabled={!isAdmin} />} />
                    {header.get('invoice_show_gst') !== false && <SettingRow label="↳ GST Format" noBorder right={<FormatGroup value={header.get('invoice_gst_number_style', '')} onChange={(v) => header.set({ invoice_gst_number_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}
                </SettingsCard>

                {/* Body & Table */}
                <SettingsCard title="Body & Table" subtitle="Item list styling" icon="📊" accent="#8b5cf6"
                    footer={<SaveButton dirty={body.dirty} saving={savingSection === 'Body & Table'} onClick={() => saveSection('Body & Table', body)} disabled={!isAdmin} />}
                >
                    <SettingRow label="Main Font Size"
                        right={<Counter value={body.get('invoice_font_size', 12)} min={8} max={20} onChange={(v) => body.set({ invoice_font_size: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Line Spacing"
                        right={<Counter value={body.get('invoice_spacing', 4)} min={1} max={8} onChange={(v) => body.set({ invoice_spacing: v })} disabled={!isAdmin} />}
                    />
                    <SectionLabel text="Targeted Text Formats" />
                    <SettingRow label="Item Description Format" right={<FormatGroup value={body.get('invoice_item_desc_style', '')} onChange={(v) => body.set({ invoice_item_desc_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SettingRow label="M.R.P Format" right={<FormatGroup value={body.get('invoice_mrp_style', '')} onChange={(v) => body.set({ invoice_mrp_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SettingRow label="Discount Format" right={<FormatGroup value={body.get('invoice_discount_style', '')} onChange={(v) => body.set({ invoice_discount_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SettingRow label="GST Label Format" right={<FormatGroup value={body.get('invoice_gst_style', '')} onChange={(v) => body.set({ invoice_gst_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SectionLabel text="Column Visibility" />
                    <SettingRow label="Bold Column Headers" desc="Make headers like ITEM DESCRIPTION bold"
                        right={<Toggle on={body.get('invoice_column_headers_bold') ?? true} onChange={(v) => body.set({ invoice_column_headers_bold: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Show Item Price Breakdown" desc="Show price × quantity line"
                        right={<Toggle on={body.get('invoice_show_item_price') === true} onChange={(v) => body.set({ invoice_show_item_price: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Show Price Column" desc="Toggle unit price column in table"
                        right={<Toggle on={body.get('invoice_show_unit_price') !== false} onChange={(v) => body.set({ invoice_show_unit_price: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Show CASE Column" desc="Toggle CASE calculations (A4/A5 grid)" noBorder
                        right={<Toggle on={body.get('invoice_show_case') !== false} onChange={(v) => body.set({ invoice_show_case: v })} disabled={!isAdmin} />}
                    />
                </SettingsCard>
            </TwoColGrid>

            {/* Row 3 */}
            <TwoColGrid>
                {/* Footer Settings */}
                <SettingsCard title="Footer Settings" subtitle="Credits and legal info" icon="📄" accent="#6b7280"
                    footer={<SaveButton dirty={footer.dirty} saving={savingSection === 'Footer Settings'} onClick={() => saveSection('Footer Settings', footer)} disabled={!isAdmin} />}
                >
                    <div style={{ marginBottom: '14px' }}>
                        <FieldLabel>Footer Text Alignment</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: 'left', label: '← Left' },
                                { id: 'center', label: '↔ Center' },
                                { id: 'right', label: '→ Right' },
                            ]}
                            value={footer.get('invoice_footer_align', 'center')}
                            onChange={(id) => footer.set({ invoice_footer_align: id })}
                            disabled={!isAdmin}
                            accentColor="#6b7280"
                        />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                        <FieldLabel htmlFor="footer_msg">Thank You Message</FieldLabel>
                        <TextInput
                            id="footer_msg"
                            value={footer.get('invoice_footer_message') || ''}
                            placeholder="Thank you for your business!"
                            onChange={(e) => footer.set({ invoice_footer_message: e.target.value })}
                            disabled={!isAdmin}
                        />
                        <div className="mt-2">
                            <SettingRow label="Message Format" noBorder right={<FormatGroup value={footer.get('invoice_footer_msg_style', '')} onChange={(v) => footer.set({ invoice_footer_msg_style: v })} disabled={!isAdmin} accentColor="#6b7280" />} />
                        </div>
                    </div>

                    <div style={{ marginTop: '8px', marginBottom: '14px' }}>
                        <FieldLabel htmlFor="invoice_terms">Terms & Conditions</FieldLabel>
                        <TextArea
                            id="invoice_terms"
                            value={footer.get('invoice_terms_conditions') || ''}
                            placeholder="Enter your terms and conditions here..."
                            onChange={(e) => footer.set({ invoice_terms_conditions: e.target.value })}
                            disabled={!isAdmin}
                            rows={3}
                        />
                        <div className="mt-2">
                            <SettingRow label="Terms Format" noBorder right={<FormatGroup value={footer.get('invoice_terms_style', '')} onChange={(v) => footer.set({ invoice_terms_style: v })} disabled={!isAdmin} accentColor="#6b7280" />} />
                        </div>
                    </div>

                    <SectionLabel text="Spacing & Adjustments" />
                    <SettingRow label="Footer Font Size"
                        right={<Counter value={footer.get('invoice_footer_font_size', 10)} min={6} max={14} onChange={(v) => footer.set({ invoice_footer_font_size: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Footer Block Spacing" desc="Space above the footer" noBorder
                        right={<Counter value={footer.get('invoice_footer_spacing', 16)} min={0} max={60} onChange={(v) => footer.set({ invoice_footer_spacing: v })} disabled={!isAdmin} />}
                    />
                </SettingsCard>

                {/* QR Code & Payment */}
                <SettingsCard title="QR Code & Payment" subtitle="UPI payment QR code on invoices" icon="📱" accent="#10b981"
                    footer={<SaveButton dirty={qr.dirty} saving={savingSection === 'QR Code'} onClick={() => saveSection('QR Code', qr)} disabled={!isAdmin} />}
                >
                    <SettingRow label="Show Payment QR Code" desc="Generates dynamic UPI QR with total amount"
                        right={<Toggle on={qr.get('invoice_show_qr_code') === true} onChange={(v) => qr.set({ invoice_show_qr_code: v })} disabled={!isAdmin} />}
                    />
                    {qr.get('invoice_show_qr_code') && (
                        <div style={{ paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                            <div style={{ marginBottom: '14px' }}>
                                <FieldLabel htmlFor="upi_id">UPI ID (VPA) for Payments</FieldLabel>
                                <TextInput
                                    id="upi_id"
                                    value={qr.get('upi_id') || ''}
                                    placeholder="e.g., yourname@bank"
                                    hint="Required for the dynamic QR code to work properly."
                                    onChange={(e) => qr.set({ upi_id: e.target.value })}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <FieldLabel>QR Code Size</FieldLabel>
                                    <SelectInput
                                        options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
                                        value={qr.get('invoice_qr_size', 'medium')}
                                        onChange={(v) => qr.set({ invoice_qr_size: v })}
                                        disabled={!isAdmin}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>QR Code Position</FieldLabel>
                                    <SelectInput
                                        options={[
                                            { value: 'top-left', label: 'Top Left' }, { value: 'top-right', label: 'Top Right' },
                                            { value: 'below-title', label: 'Below Document Title' },
                                            { value: 'bottom-left', label: 'Bottom Left' }, { value: 'bottom-center', label: 'Bottom Center' },
                                            { value: 'bottom-right', label: 'Bottom Right' },
                                        ]}
                                        value={qr.get('invoice_qr_position', 'bottom-center')}
                                        onChange={(v) => qr.set({ invoice_qr_position: v })}
                                        disabled={!isAdmin}
                                    />
                                </div>
                            </div>
                            <div style={{
                                background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '14px 16px',
                                display: 'flex', alignItems: 'center', gap: '10px',
                            }}>
                                <span style={{ fontSize: '22px' }}>▣</span>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#065f46' }}>QR Preview</div>
                                    <div style={{ fontSize: '11px', color: '#059669' }}>
                                        {qr.get('upi_id') ? `Active: ${qr.get('upi_id')}` : 'No UPI ID set'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SettingsCard>
            </TwoColGrid>
        </ColStack>
    );
}
