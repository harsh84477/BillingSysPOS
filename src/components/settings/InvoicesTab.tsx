import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import {
    SettingsCard, Toggle, Counter, SettingRow, SectionLabel,
    TextInput, TextArea, FieldLabel, ButtonGroup, SelectInput, TwoColGrid, ColStack,
    FormatGroup,
} from './SettingsUI';

export default function InvoicesTab() {
    const { isAdmin } = useAuth();
    const { data: settings } = useBusinessSettings();
    const updateSettings = useUpdateBusinessSettings();
    const u = (v: any) => isAdmin && updateSettings.mutate(v);

    return (
        <ColStack>
            {/* Row 1 */}
            <TwoColGrid>
                {/* General Layout */}
                <SettingsCard title="General Layout" subtitle="Overall appearance and paper size" icon="📐" accent="#10b981">
                    <div style={{ marginBottom: '16px' }}>
                        <FieldLabel>Layout Style</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: 'classic', label: 'Classic', desc: 'Typewriter' },
                                { id: 'modern', label: 'Modern', desc: 'Clean' },
                                { id: 'detailed', label: 'Detailed', desc: 'Grid' },
                            ]}
                            value={settings?.invoice_style || 'modern'}
                            onChange={(id) => u({ invoice_style: id })}
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
                            value={settings?.invoice_paper_width || 'A4'}
                            onChange={(id) => u({ invoice_paper_width: id })}
                            disabled={!isAdmin}
                            accentColor="#10b981"
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <FieldLabel htmlFor="invoice_title">Document Title</FieldLabel>
                        <TextInput
                            id="invoice_title"
                            defaultValue={settings?.invoice_title ?? 'ESTIMATE'}
                            placeholder="e.g., ESTIMATE or INVOICE (leave blank to hide)"
                            onBlur={(e) => u({ invoice_title: e.target.value })}
                            disabled={!isAdmin}
                        />
                    </div>
                </SettingsCard>

                {/* Grid Borders */}
                <SettingsCard title="Grid Borders & Lines" subtitle="Customizable grid format spacing for A4/A5" icon="⊞" accent="#3b82f6">
                    <SettingRow label="Outer Bill Border" desc="Master border around entire invoice" right={<Toggle on={settings?.invoice_border_whole_bill ?? false} onChange={(v) => u({ invoice_border_whole_bill: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Left & Right Borders" desc="Outer sides of table" right={<Toggle on={(settings?.invoice_border_left ?? true) && (settings?.invoice_border_right ?? true)} onChange={(v) => u({ invoice_border_left: v, invoice_border_right: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Top Border" desc="Table top line" right={<Toggle on={settings?.invoice_border_top ?? true} onChange={(v) => u({ invoice_border_top: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Bottom Border" desc="Table bottom line" right={<Toggle on={settings?.invoice_border_bottom ?? true} onChange={(v) => u({ invoice_border_bottom: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Vertical Row Lines (Columns)" right={<Toggle on={settings?.invoice_border_inner_v ?? true} onChange={(v) => u({ invoice_border_inner_v: v })} disabled={!isAdmin} />} />
                    <SettingRow label="Horizontal Row Lines" noBorder={!settings?.invoice_border_whole_bill} right={<Toggle on={settings?.invoice_border_inner_h ?? true} onChange={(v) => u({ invoice_border_inner_h: v })} disabled={!isAdmin} />} />

                    {settings?.invoice_border_whole_bill && <>
                        <SectionLabel text="Spacing" />
                        <SettingRow label="Border Padding" desc="Space inside the border"
                            right={<Counter value={settings?.invoice_padding ?? 20} min={0} max={60} onChange={(v) => u({ invoice_padding: v })} disabled={!isAdmin} />}
                        />
                        <SettingRow label="Border Margin" desc="Space outside the border" noBorder
                            right={<Counter value={settings?.invoice_margin ?? 0} min={0} max={60} onChange={(v) => u({ invoice_margin: v })} disabled={!isAdmin} />}
                        />
                    </>}
                </SettingsCard>
            </TwoColGrid>

            {/* Row 2 */}
            <TwoColGrid>
                {/* Header Settings */}
                <SettingsCard title="Header Settings" subtitle="Business identity on invoice" icon="🏷️" accent="#f97316">
                    <div style={{ marginBottom: '12px' }}>
                        <FieldLabel>Document Title Alignment</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: 'left', label: '← Left' },
                                { id: 'center', label: '↔ Center' },
                                { id: 'right', label: '→ Right' },
                            ]}
                            value={(settings as any)?.invoice_title_align || 'center'}
                            onChange={(id) => u({ invoice_title_align: id })}
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
                            value={settings?.invoice_header_align || 'center'}
                            onChange={(id) => u({ invoice_header_align: id })}
                            disabled={!isAdmin}
                            accentColor="#f97316"
                        />
                    </div>
                    <SectionLabel text="Targeted Header Formatting" />
                    <SettingRow label="Business Name" right={<FormatGroup value={(settings as any)?.invoice_business_name_style || 'bold'} onChange={(v) => u({ invoice_business_name_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />

                    <SettingRow label="Show Address" desc="Toggle visibility" right={<Toggle on={settings?.invoice_show_business_address !== false} onChange={(v) => u({ invoice_show_business_address: v })} disabled={!isAdmin} />} />
                    {settings?.invoice_show_business_address !== false && <SettingRow label="↳ Address Format" right={<FormatGroup value={(settings as any)?.invoice_address_style || ''} onChange={(v) => u({ invoice_address_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}

                    <SettingRow label="Show Phone Number" desc="Toggle visibility" right={<Toggle on={settings?.invoice_show_business_phone !== false} onChange={(v) => u({ invoice_show_business_phone: v })} disabled={!isAdmin} />} />
                    {settings?.invoice_show_business_phone !== false && <SettingRow label="↳ Phone Format" right={<FormatGroup value={(settings as any)?.invoice_phone_style || ''} onChange={(v) => u({ invoice_phone_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}

                    <SettingRow label="Show Email" desc="Toggle visibility" right={<Toggle on={settings?.invoice_show_business_email !== false} onChange={(v) => u({ invoice_show_business_email: v })} disabled={!isAdmin} />} />
                    {settings?.invoice_show_business_email !== false && <SettingRow label="↳ Email Format" right={<FormatGroup value={(settings as any)?.invoice_email_style || ''} onChange={(v) => u({ invoice_email_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}

                    <SettingRow label="Separate Contact Lines" desc="Show Phone & Email on new lines" right={<Toggle on={(settings as any)?.invoice_contact_separate_lines === true} onChange={(v) => u({ invoice_contact_separate_lines: v })} disabled={!isAdmin} />} />

                    <SettingRow label="Show GST Number" desc="Toggle visibility" right={<Toggle on={settings?.invoice_show_gst !== false} onChange={(v) => u({ invoice_show_gst: v })} disabled={!isAdmin} />} />
                    {settings?.invoice_show_gst !== false && <SettingRow label="↳ GST Format" noBorder right={<FormatGroup value={(settings as any)?.invoice_gst_number_style || ''} onChange={(v) => u({ invoice_gst_number_style: v })} disabled={!isAdmin} accentColor="#f97316" />} />}
                </SettingsCard>

                {/* Body & Table */}
                <SettingsCard title="Body & Table" subtitle="Item list styling" icon="📊" accent="#8b5cf6">
                    <SettingRow label="Main Font Size"
                        right={<Counter value={settings?.invoice_font_size || 12} min={8} max={20} onChange={(v) => u({ invoice_font_size: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Line Spacing"
                        right={<Counter value={settings?.invoice_spacing || 4} min={1} max={8} onChange={(v) => u({ invoice_spacing: v })} disabled={!isAdmin} />}
                    />
                    <SectionLabel text="Targeted Text Formats" />
                    <SettingRow label="Item Description Format" right={<FormatGroup value={(settings as any)?.invoice_item_desc_style || ''} onChange={(v) => u({ invoice_item_desc_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SettingRow label="M.R.P Format" right={<FormatGroup value={(settings as any)?.invoice_mrp_style || ''} onChange={(v) => u({ invoice_mrp_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SettingRow label="Discount Format" right={<FormatGroup value={(settings as any)?.invoice_discount_style || ''} onChange={(v) => u({ invoice_discount_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SettingRow label="GST Label Format" right={<FormatGroup value={(settings as any)?.invoice_gst_style || ''} onChange={(v) => u({ invoice_gst_style: v })} disabled={!isAdmin} accentColor="#8b5cf6" />} />
                    <SectionLabel text="Column Visibility" />
                    <SettingRow label="Bold Column Headers" desc="Make headers like ITEM DESCRIPTION bold"
                        right={<Toggle on={(settings as any)?.invoice_column_headers_bold ?? true} onChange={(v) => u({ invoice_column_headers_bold: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Show Item Price Breakdown" desc="Show price × quantity line"
                        right={<Toggle on={settings?.invoice_show_item_price === true} onChange={(v) => u({ invoice_show_item_price: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Show Price Column" desc="Toggle unit price column in table"
                        right={<Toggle on={settings?.invoice_show_unit_price !== false} onChange={(v) => u({ invoice_show_unit_price: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Show CASE Column" desc="Toggle CASE calculations (A4/A5 grid)" noBorder
                        right={<Toggle on={settings?.invoice_show_case !== false} onChange={(v) => u({ invoice_show_case: v })} disabled={!isAdmin} />}
                    />
                </SettingsCard>
            </TwoColGrid>

            {/* Row 3 */}
            <TwoColGrid>
                {/* Footer Settings */}
                <SettingsCard title="Footer Settings" subtitle="Credits and legal info" icon="📄" accent="#6b7280">
                    <div style={{ marginBottom: '14px' }}>
                        <FieldLabel>Footer Text Alignment</FieldLabel>
                        <ButtonGroup
                            options={[
                                { id: 'left', label: '← Left' },
                                { id: 'center', label: '↔ Center' },
                                { id: 'right', label: '→ Right' },
                            ]}
                            value={(settings as any)?.invoice_footer_align || 'center'}
                            onChange={(id) => u({ invoice_footer_align: id })}
                            disabled={!isAdmin}
                            accentColor="#6b7280"
                        />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                        <FieldLabel htmlFor="footer_msg">Thank You Message</FieldLabel>
                        <TextInput
                            id="footer_msg"
                            defaultValue={settings?.invoice_footer_message || ''}
                            placeholder="Thank you for your business!"
                            onBlur={(e) => u({ invoice_footer_message: e.target.value })}
                            disabled={!isAdmin}
                        />
                        <div className="mt-2">
                            <SettingRow label="Message Format" noBorder right={<FormatGroup value={(settings as any)?.invoice_footer_msg_style || ''} onChange={(v) => u({ invoice_footer_msg_style: v })} disabled={!isAdmin} accentColor="#6b7280" />} />
                        </div>
                    </div>

                    <div style={{ marginTop: '8px', marginBottom: '14px' }}>
                        <FieldLabel htmlFor="invoice_terms">Terms & Conditions</FieldLabel>
                        <TextArea
                            id="invoice_terms"
                            defaultValue={settings?.invoice_terms_conditions || ''}
                            placeholder="Enter your terms and conditions here..."
                            onBlur={(e) => u({ invoice_terms_conditions: e.target.value })}
                            disabled={!isAdmin}
                            rows={3}
                        />
                        <div className="mt-2">
                            <SettingRow label="Terms Format" noBorder right={<FormatGroup value={(settings as any)?.invoice_terms_style || ''} onChange={(v) => u({ invoice_terms_style: v })} disabled={!isAdmin} accentColor="#6b7280" />} />
                        </div>
                    </div>

                    <SectionLabel text="Spacing & Adjustments" />
                    <SettingRow label="Footer Font Size"
                        right={<Counter value={settings?.invoice_footer_font_size || 10} min={6} max={14} onChange={(v) => u({ invoice_footer_font_size: v })} disabled={!isAdmin} />}
                    />
                    <SettingRow label="Footer Block Spacing" desc="Space above the footer" noBorder
                        right={<Counter value={(settings as any)?.invoice_footer_spacing ?? 16} min={0} max={60} onChange={(v) => u({ invoice_footer_spacing: v })} disabled={!isAdmin} />}
                    />
                </SettingsCard>

                {/* QR Code & Payment */}
                <SettingsCard title="QR Code & Payment" subtitle="UPI payment QR code on invoices" icon="📱" accent="#10b981">
                    <SettingRow label="Show Payment QR Code" desc="Generates dynamic UPI QR with total amount"
                        right={<Toggle on={settings?.invoice_show_qr_code === true} onChange={(v) => u({ invoice_show_qr_code: v })} disabled={!isAdmin} />}
                    />
                    {settings?.invoice_show_qr_code && (
                        <div style={{ paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                            <div style={{ marginBottom: '14px' }}>
                                <FieldLabel htmlFor="upi_id">UPI ID (VPA) for Payments</FieldLabel>
                                <TextInput
                                    id="upi_id"
                                    defaultValue={settings?.upi_id || ''}
                                    placeholder="e.g., yourname@bank"
                                    hint="Required for the dynamic QR code to work properly."
                                    onBlur={(e) => u({ upi_id: e.target.value })}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <FieldLabel>QR Code Size</FieldLabel>
                                    <SelectInput
                                        options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
                                        value={settings?.invoice_qr_size ?? 'medium'}
                                        onChange={(v) => u({ invoice_qr_size: v })}
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
                                        value={settings?.invoice_qr_position ?? 'bottom-center'}
                                        onChange={(v) => u({ invoice_qr_position: v })}
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
                                        {settings?.upi_id ? `Active: ${settings.upi_id}` : 'No UPI ID set'}
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
