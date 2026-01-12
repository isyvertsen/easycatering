/**
 * Types for Label Designer
 */

// Enums
export type ParameterType = 'text' | 'number' | 'date' | 'barcode' | 'qr' | 'image';
export type SourceType = 'manual' | 'database' | 'api';
export type SharePermission = 'view' | 'edit';
export type PrintStatus = 'success' | 'failed';

// Zebra Printer Configuration
export interface PrinterConfig {
  darkness?: number;  // 0-30 (ZPL: ~SD)
  speed?: number;     // 2-14 inches per second (ZPL: ^PR)
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  darkness: 15,
  speed: 4,
};

// Template Parameter
export interface TemplateParameter {
  id: number;
  template_id: number;
  field_name: string;
  display_name: string;
  parameter_type: ParameterType;
  source_type: SourceType;
  source_config?: {
    table?: string;
    column?: string;
    endpoint?: string;
  };
  is_required: boolean;
  default_value?: string;
  validation_regex?: string;
  sort_order: number;
}

export interface TemplateParameterCreate {
  field_name: string;
  display_name: string;
  parameter_type?: ParameterType;
  source_type?: SourceType;
  source_config?: Record<string, unknown>;
  is_required?: boolean;
  default_value?: string;
  validation_regex?: string;
  sort_order?: number;
}

// pdfme Types
export interface PdfmePosition {
  x: number;
  y: number;
}

export interface PdfmeSchema {
  name: string;
  type: 'text' | 'image' | 'qrcode' | 'code128' | 'ean13' | 'code39';
  position: PdfmePosition;
  width: number;
  height: number;
  fontSize?: number;
  fontColor?: string;
  fontName?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  [key: string]: unknown;
}

export interface PdfmeBasePdf {
  width: number;
  height: number;
}

export interface PdfmeTemplate {
  schemas: PdfmeSchema[][];
  basePdf: PdfmeBasePdf;
}

// Label Template
export interface LabelTemplate {
  id: number;
  name: string;
  description?: string;
  template_json: PdfmeTemplate;
  width_mm: number;
  height_mm: number;
  owner_id?: number;
  is_global: boolean;
  thumbnail_url?: string;
  printer_config?: PrinterConfig;
  created_at: string;
  updated_at?: string;
  parameters: TemplateParameter[];
}

export interface LabelTemplateCreate {
  name: string;
  description?: string;
  template_json: PdfmeTemplate;
  width_mm?: number;
  height_mm?: number;
  is_global?: boolean;
  printer_config?: PrinterConfig;
  parameters?: TemplateParameterCreate[];
}

export interface LabelTemplateUpdate {
  name?: string;
  description?: string;
  template_json?: PdfmeTemplate;
  width_mm?: number;
  height_mm?: number;
  is_global?: boolean;
  printer_config?: PrinterConfig;
  parameters?: TemplateParameterCreate[];
}

export interface LabelTemplateListItem {
  id: number;
  name: string;
  description?: string;
  width_mm: number;
  height_mm: number;
  owner_id?: number;
  is_global: boolean;
  thumbnail_url?: string;
  created_at: string;
  updated_at?: string;
}

// Template Share
export interface TemplateShare {
  id: number;
  template_id: number;
  shared_with_user_id: number;
  permission: SharePermission;
  created_at: string;
}

export interface TemplateShareCreate {
  shared_with_user_id: number;
  permission: SharePermission;
}

// Print History
export interface PrintHistoryItem {
  id: number;
  template_id?: number;
  user_id?: number;
  printer_name?: string;
  input_data?: Record<string, unknown>;
  copies: number;
  status: PrintStatus;
  error_message?: string;
  printed_at: string;
}

export interface PrintHistoryCreate {
  template_id: number;
  printer_name: string;
  input_data: Record<string, unknown>;
  copies: number;
  status: PrintStatus;
  error_message?: string;
}

// PDF Generation
export interface PreviewLabelRequest {
  template_json: PdfmeTemplate;
  inputs: Record<string, unknown>;
  width_mm: number;
  height_mm: number;
}

export interface PreviewLabelResponse {
  preview: string; // base64 encoded PDF
  content_type: string;
}

export interface GenerateLabelRequest {
  template_id: number;
  inputs: Record<string, unknown>;
  copies?: number;
}

export interface BatchGenerateRequest {
  template_id: number;
  inputs_list: Record<string, unknown>[];
}

// Data Sources
export interface TableColumn {
  name: string;
  type: string;
}

export interface DataSourceResult {
  id: number | string;
  value: string;
  display?: string;
}

// BrowserPrint
export interface ZebraPrinter {
  name: string;
  uid: string;
  connection: string;
  deviceType: string;
  version: number;
  provider: string;
  manufacturer: string;
}

// Component Props
export interface LabelDesignerProps {
  initialTemplate?: any; // pdfme template structure
  initialName?: string;
  width?: number;
  height?: number;
  initialPrinterConfig?: PrinterConfig;
  onSave: (data: {
    name: string;
    template: any; // pdfme template structure
    width: number;
    height: number;
    printerConfig?: PrinterConfig;
  }) => void;
  isSaving?: boolean;
}

export interface TemplateLibraryProps {
  onSelect?: (template: LabelTemplate) => void;
}

export interface PrintDialogProps {
  template: LabelTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Label Size Presets
export interface LabelSizePreset {
  name: string;
  width_mm: number;
  height_mm: number;
}

export const LABEL_SIZE_PRESETS: LabelSizePreset[] = [
  { name: '100 x 50 mm', width_mm: 100, height_mm: 50 },
  { name: '100 x 100 mm', width_mm: 100, height_mm: 100 },
  { name: '104 x 127 mm', width_mm: 104, height_mm: 127 },
  { name: '50 x 25 mm', width_mm: 50, height_mm: 25 },
  { name: '76 x 51 mm', width_mm: 76, height_mm: 51 },
  { name: '102 x 76 mm', width_mm: 102, height_mm: 76 },
];

// Note: Default template is created dynamically in LabelDesigner component
// using BLANK_PDF from @pdfme/common
