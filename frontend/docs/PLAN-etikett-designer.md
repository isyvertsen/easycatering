# Frontend Implementeringsplan: Etikett-Designer

## Oversikt

Frontend-del av etikett-designer systemet. Ansvarlig for:
- Visuell designer med pdfme
- Mal-bibliotek og CRUD UI
- BrowserPrint integrasjon
- Parameter-konfigurasjon og data-binding

**Avhengighet**: Krever backend API (se `LKCserver-backend/docs/PLAN-etikett-designer.md`)

---

## Teknisk Stack

| Komponent | Teknologi | Status |
|-----------|-----------|--------|
| Framework | Next.js 15 | Eksisterer |
| UI Components | Radix UI + TailwindCSS | Eksisterer |
| State | @tanstack/react-query | Eksisterer |
| Forms | react-hook-form + zod | Eksisterer |
| Designer | pdfme | Må installeres |
| Print | Zebra BrowserPrint SDK | Må integreres |

### Nye Avhengigheter

```bash
npm install @pdfme/common @pdfme/schemas @pdfme/ui lodash
npm install -D @types/lodash
```

---

## Fase 3: Frontend Designer

### 3.1 Prosjektstruktur

```
src/
├── app/
│   └── labels/
│       ├── page.tsx                    # Mal-oversikt
│       ├── new/
│       │   └── page.tsx                # Ny mal
│       └── [id]/
│           ├── page.tsx                # Rediger mal
│           └── print/
│               └── page.tsx            # Print-dialog
├── components/
│   └── label-designer/
│       ├── LabelDesigner.tsx           # pdfme Designer wrapper
│       ├── ParameterPanel.tsx          # Parameter-konfigurasjon
│       ├── TemplateLibrary.tsx         # Mal-bibliotek grid
│       ├── TemplateCard.tsx            # Mal-kort i grid
│       ├── PreviewPane.tsx             # Live forhåndsvisning
│       ├── SizeSelector.tsx            # Etikettsstørrelse
│       ├── PrinterSelector.tsx         # Printer dropdown
│       ├── PrintDialog.tsx             # Print modal
│       └── BatchPrintTable.tsx         # Batch data-tabell
├── hooks/
│   ├── useLabelTemplates.ts            # CRUD hooks
│   ├── usePdfPreview.ts                # Preview hook
│   └── useBrowserPrint.ts              # Printer hook
├── lib/
│   ├── api/
│   │   └── labelTemplates.ts           # API-klient
│   └── browserprint/
│       └── index.ts                    # BrowserPrint wrapper
└── types/
    └── labels.ts                       # TypeScript types
```

### 3.2 TypeScript Types

Opprett `src/types/labels.ts`:

```typescript
// Enums
export type ParameterType = 'text' | 'number' | 'date' | 'barcode' | 'qr' | 'image';
export type SourceType = 'manual' | 'database' | 'api';
export type SharePermission = 'view' | 'edit';

// Template Parameter
export interface TemplateParameter {
  id: string;
  template_id: string;
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

// Label Template
export interface LabelTemplate {
  id: string;
  name: string;
  description?: string;
  template_json: PdfmeTemplate;
  width_mm: number;
  height_mm: number;
  owner_id?: string;
  is_global: boolean;
  thumbnail_url?: string;
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
  parameters?: TemplateParameterCreate[];
}

export interface LabelTemplateUpdate {
  name?: string;
  description?: string;
  template_json?: PdfmeTemplate;
  width_mm?: number;
  height_mm?: number;
  is_global?: boolean;
  parameters?: TemplateParameterCreate[];
}

// pdfme Types
export interface PdfmeSchema {
  name: string;
  type: 'text' | 'image' | 'qrcode' | 'code128' | 'ean13' | 'code39';
  position: { x: number; y: number };
  width: number;
  height: number;
  fontSize?: number;
  fontColor?: string;
  alignment?: 'left' | 'center' | 'right';
  [key: string]: unknown;
}

export interface PdfmeTemplate {
  schemas: PdfmeSchema[][];
  basePdf: {
    width: number;
    height: number;
  };
}

// Share
export interface TemplateShare {
  id: string;
  shared_with_user_id: string;
  permission: SharePermission;
  created_at: string;
}

// Print
export interface PrintJob {
  template_id: string;
  inputs: Record<string, unknown>;
  copies: number;
}

export interface PrintHistoryItem {
  id: string;
  template_id: string;
  printer_name: string;
  input_data: Record<string, unknown>;
  copies: number;
  status: 'success' | 'failed';
  error_message?: string;
  printed_at: string;
}

// BrowserPrint
export interface ZebraPrinter {
  name: string;
  uid: string;
  connection: string;
  deviceType: string;
  version: number;
  provider: string;
}
```

### 3.3 API-klient

Opprett `src/lib/api/labelTemplates.ts`:

```typescript
import { apiClient } from './api-client';
import type {
  LabelTemplate,
  LabelTemplateCreate,
  LabelTemplateUpdate,
  TemplateShare,
  PrintHistoryItem,
} from '@/types/labels';

export const labelTemplatesApi = {
  // Templates
  list: async (includeGlobal = true): Promise<LabelTemplate[]> => {
    const response = await apiClient.get('/v1/label-templates', {
      params: { include_global: includeGlobal }
    });
    return response.data;
  },

  get: async (id: string): Promise<LabelTemplate> => {
    const response = await apiClient.get(`/v1/label-templates/${id}`);
    return response.data;
  },

  create: async (data: LabelTemplateCreate): Promise<LabelTemplate> => {
    const response = await apiClient.post('/v1/label-templates', data);
    return response.data;
  },

  update: async (id: string, data: LabelTemplateUpdate): Promise<LabelTemplate> => {
    const response = await apiClient.put(`/v1/label-templates/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/v1/label-templates/${id}`);
  },

  // Sharing
  share: async (id: string, userId: string, permission: string): Promise<TemplateShare> => {
    const response = await apiClient.post(`/v1/label-templates/${id}/share`, {
      shared_with_user_id: userId,
      permission,
    });
    return response.data;
  },

  getShares: async (id: string): Promise<TemplateShare[]> => {
    const response = await apiClient.get(`/v1/label-templates/${id}/shares`);
    return response.data;
  },

  removeShare: async (templateId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/v1/label-templates/${templateId}/shares/${userId}`);
  },

  // PDF Generation
  preview: async (data: {
    template_json: Record<string, unknown>;
    inputs: Record<string, unknown>;
    width_mm: number;
    height_mm: number;
  }): Promise<{ preview: string }> => {
    const response = await apiClient.post('/v1/labels/preview', data);
    return response.data;
  },

  generate: async (data: {
    template_id: string;
    inputs: Record<string, unknown>;
    copies?: number;
  }): Promise<Blob> => {
    const response = await apiClient.post('/v1/labels/generate', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateBatch: async (data: {
    template_id: string;
    inputs_list: Record<string, unknown>[];
  }): Promise<Blob> => {
    const response = await apiClient.post('/v1/labels/batch', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Data Sources
  getTables: async (): Promise<string[]> => {
    const response = await apiClient.get('/v1/label-templates/sources/tables');
    return response.data;
  },

  getColumns: async (table: string): Promise<{ name: string; type: string }[]> => {
    const response = await apiClient.get('/v1/label-templates/sources/columns', {
      params: { table }
    });
    return response.data;
  },

  searchData: async (table: string, column: string, search: string): Promise<unknown[]> => {
    const response = await apiClient.get('/v1/label-templates/sources/data', {
      params: { table, column, search }
    });
    return response.data;
  },

  // Print History
  logPrint: async (data: {
    template_id: string;
    printer_name: string;
    input_data: Record<string, unknown>;
    copies: number;
    status: 'success' | 'failed';
    error_message?: string;
  }): Promise<void> => {
    await apiClient.post('/v1/print-history', data);
  },

  getPrintHistory: async (templateId?: string): Promise<PrintHistoryItem[]> => {
    const response = await apiClient.get('/v1/print-history', {
      params: { template_id: templateId }
    });
    return response.data;
  },
};
```

### 3.4 React Query Hooks

Opprett `src/hooks/useLabelTemplates.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labelTemplatesApi } from '@/lib/api/labelTemplates';
import { toast } from 'sonner';
import type { LabelTemplateCreate, LabelTemplateUpdate } from '@/types/labels';

export function useLabelTemplates(includeGlobal = true) {
  return useQuery({
    queryKey: ['label-templates', { includeGlobal }],
    queryFn: () => labelTemplatesApi.list(includeGlobal),
  });
}

export function useLabelTemplate(id: string) {
  return useQuery({
    queryKey: ['label-templates', id],
    queryFn: () => labelTemplatesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LabelTemplateCreate) => labelTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
      toast.success('Mal opprettet');
    },
    onError: () => {
      toast.error('Kunne ikke opprette mal');
    },
  });
}

export function useUpdateLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LabelTemplateUpdate }) =>
      labelTemplatesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
      queryClient.invalidateQueries({ queryKey: ['label-templates', id] });
      toast.success('Mal oppdatert');
    },
    onError: () => {
      toast.error('Kunne ikke oppdatere mal');
    },
  });
}

export function useDeleteLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => labelTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
      toast.success('Mal slettet');
    },
    onError: () => {
      toast.error('Kunne ikke slette mal');
    },
  });
}

export function usePreviewLabel() {
  return useMutation({
    mutationFn: labelTemplatesApi.preview,
  });
}

export function useGenerateLabel() {
  return useMutation({
    mutationFn: labelTemplatesApi.generate,
  });
}
```

### 3.5 Komponenter

#### LabelDesigner.tsx

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { text, image, barcodes } from '@pdfme/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SizeSelector } from './SizeSelector';
import type { PdfmeTemplate } from '@/types/labels';

interface LabelDesignerProps {
  initialTemplate?: PdfmeTemplate;
  initialName?: string;
  width?: number;
  height?: number;
  onSave: (data: { name: string; template: PdfmeTemplate; width: number; height: number }) => void;
  isSaving?: boolean;
}

const DEFAULT_TEMPLATE: PdfmeTemplate = {
  schemas: [[]],
  basePdf: { width: 100, height: 50 },
};

export function LabelDesigner({
  initialTemplate,
  initialName = '',
  width = 100,
  height = 50,
  onSave,
  isSaving,
}: LabelDesignerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<Designer | null>(null);
  const [name, setName] = useState(initialName);
  const [size, setSize] = useState({ width, height });

  useEffect(() => {
    if (!containerRef.current) return;

    const template = initialTemplate || {
      ...DEFAULT_TEMPLATE,
      basePdf: { width: size.width, height: size.height },
    };

    designerRef.current = new Designer({
      domContainer: containerRef.current,
      template,
      plugins: { text, image, ...barcodes },
    });

    return () => {
      designerRef.current?.destroy();
    };
  }, []);

  const handleSave = () => {
    if (!designerRef.current) return;

    const template = designerRef.current.getTemplate() as PdfmeTemplate;
    onSave({
      name,
      template,
      width: size.width,
      height: size.height,
    });
  };

  const handleSizeChange = (newSize: { width: number; height: number }) => {
    setSize(newSize);
    if (designerRef.current) {
      const template = designerRef.current.getTemplate() as PdfmeTemplate;
      template.basePdf = { width: newSize.width, height: newSize.height };
      designerRef.current.updateTemplate(template);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Malnavn"
          className="w-64"
        />
        <SizeSelector value={size} onChange={handleSizeChange} />
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={isSaving || !name}>
          {isSaving ? 'Lagrer...' : 'Lagre'}
        </Button>
      </div>

      {/* Designer */}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
```

#### TemplateLibrary.tsx

```typescript
'use client';

import { useState } from 'react';
import { useLabelTemplates, useDeleteLabelTemplate } from '@/hooks/useLabelTemplates';
import { TemplateCard } from './TemplateCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

type FilterType = 'all' | 'mine' | 'global' | 'shared';

export function TemplateLibrary() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const { data: templates, isLoading } = useLabelTemplates();
  const deleteMutation = useDeleteLabelTemplate();

  const filteredTemplates = templates?.filter((t) => {
    // Search filter
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Type filter
    switch (filter) {
      case 'mine':
        return !t.is_global && t.owner_id; // TODO: check current user
      case 'global':
        return t.is_global;
      case 'shared':
        return false; // TODO: implement shared check
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Etikett-maler</h1>
        <Link href="/labels/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Ny mal
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i maler..."
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
            <TabsTrigger value="global">Globale</TabsTrigger>
            <TabsTrigger value="shared">Delt med meg</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates?.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={() => deleteMutation.mutate(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3.6 Sider

#### /labels/page.tsx

```typescript
import { TemplateLibrary } from '@/components/label-designer/TemplateLibrary';

export default function LabelsPage() {
  return (
    <div className="container py-8">
      <TemplateLibrary />
    </div>
  );
}
```

#### /labels/new/page.tsx

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { LabelDesigner } from '@/components/label-designer/LabelDesigner';
import { useCreateLabelTemplate } from '@/hooks/useLabelTemplates';

export default function NewLabelPage() {
  const router = useRouter();
  const createMutation = useCreateLabelTemplate();

  const handleSave = async (data: {
    name: string;
    template: Record<string, unknown>;
    width: number;
    height: number;
  }) => {
    const result = await createMutation.mutateAsync({
      name: data.name,
      template_json: data.template,
      width_mm: data.width,
      height_mm: data.height,
    });
    router.push(`/labels/${result.id}`);
  };

  return (
    <div className="h-screen">
      <LabelDesigner onSave={handleSave} isSaving={createMutation.isPending} />
    </div>
  );
}
```

#### /labels/[id]/page.tsx

```typescript
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { LabelDesigner } from '@/components/label-designer/LabelDesigner';
import { useLabelTemplate, useUpdateLabelTemplate } from '@/hooks/useLabelTemplates';

export default function EditLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: template, isLoading } = useLabelTemplate(id);
  const updateMutation = useUpdateLabelTemplate();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Laster...</div>;
  }

  if (!template) {
    return <div className="h-screen flex items-center justify-center">Mal ikke funnet</div>;
  }

  const handleSave = async (data: {
    name: string;
    template: Record<string, unknown>;
    width: number;
    height: number;
  }) => {
    await updateMutation.mutateAsync({
      id,
      data: {
        name: data.name,
        template_json: data.template,
        width_mm: data.width,
        height_mm: data.height,
      },
    });
  };

  return (
    <div className="h-screen">
      <LabelDesigner
        initialTemplate={template.template_json}
        initialName={template.name}
        width={template.width_mm}
        height={template.height_mm}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}
```

### Leveranser Fase 3

- [ ] pdfme Designer integrert
- [ ] TypeScript types definert
- [ ] API-klient implementert
- [ ] React Query hooks implementert
- [ ] TemplateLibrary med filtrering
- [ ] LabelDesigner wrapper
- [ ] Sider: /labels, /labels/new, /labels/[id]

---

## Fase 4: BrowserPrint Integrasjon

### 4.1 BrowserPrint Wrapper

Opprett `src/lib/browserprint/index.ts`:

```typescript
import type { ZebraPrinter } from '@/types/labels';

declare global {
  interface Window {
    BrowserPrint: {
      getLocalDevices: (
        callback: (devices: ZebraPrinter[]) => void,
        errorCallback: (error: string) => void,
        deviceType?: string
      ) => void;
      getDefaultDevice: (
        deviceType: string,
        callback: (device: ZebraPrinter | null) => void,
        errorCallback: (error: string) => void
      ) => void;
    };
  }
}

const BROWSERPRINT_URL = 'http://localhost:9100/';
const SDK_URL = `${BROWSERPRINT_URL}BrowserPrint.js`;

class BrowserPrintService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.BrowserPrint) {
        this.initialized = true;
        resolve();
        return;
      }

      // Load SDK
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.onload = () => {
        this.initialized = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Kunne ikke laste BrowserPrint SDK. Er Zebra Browser Print kjørende?'));
      };
      document.head.appendChild(script);
    });

    return this.initPromise;
  }

  async getLocalPrinters(): Promise<ZebraPrinter[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      window.BrowserPrint.getLocalDevices(
        (devices) => resolve(devices),
        (error) => reject(new Error(error)),
        'printer'
      );
    });
  }

  async getDefaultPrinter(): Promise<ZebraPrinter | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      window.BrowserPrint.getDefaultDevice(
        'printer',
        (device) => resolve(device),
        (error) => reject(new Error(error))
      );
    });
  }

  async print(printer: ZebraPrinter, pdfData: ArrayBuffer): Promise<void> {
    // Send PDF via BrowserPrint
    const response = await fetch(`${BROWSERPRINT_URL}write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: pdfData,
    });

    if (!response.ok) {
      throw new Error('Utskrift feilet');
    }
  }

  async printRaw(printer: ZebraPrinter, data: string): Promise<void> {
    // Send raw ZPL data
    const response = await fetch(`${BROWSERPRINT_URL}write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error('Utskrift feilet');
    }
  }
}

export const browserPrintService = new BrowserPrintService();
```

### 4.2 useBrowserPrint Hook

Opprett `src/hooks/useBrowserPrint.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { browserPrintService } from '@/lib/browserprint';
import type { ZebraPrinter } from '@/types/labels';

export function useBrowserPrint() {
  const [printers, setPrinters] = useState<ZebraPrinter[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState<ZebraPrinter | null>(null);
  const [selectedPrinter, setSelectedPrinter] = useState<ZebraPrinter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [printerList, defaultDevice] = await Promise.all([
        browserPrintService.getLocalPrinters(),
        browserPrintService.getDefaultPrinter(),
      ]);

      setPrinters(printerList);
      setDefaultPrinter(defaultDevice);

      if (!selectedPrinter && defaultDevice) {
        setSelectedPrinter(defaultDevice);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente printere');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrinter]);

  useEffect(() => {
    refresh();
  }, []);

  const print = useCallback(async (pdfData: ArrayBuffer) => {
    if (!selectedPrinter) {
      throw new Error('Ingen printer valgt');
    }
    await browserPrintService.print(selectedPrinter, pdfData);
  }, [selectedPrinter]);

  return {
    printers,
    defaultPrinter,
    selectedPrinter,
    setSelectedPrinter,
    isLoading,
    error,
    refresh,
    print,
  };
}
```

### 4.3 PrintDialog Komponent

```typescript
'use client';

import { useState } from 'react';
import { useBrowserPrint } from '@/hooks/useBrowserPrint';
import { useGenerateLabel, usePreviewLabel } from '@/hooks/useLabelTemplates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrinterSelector } from './PrinterSelector';
import type { LabelTemplate, TemplateParameter } from '@/types/labels';
import { toast } from 'sonner';

interface PrintDialogProps {
  template: LabelTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintDialog({ template, open, onOpenChange }: PrintDialogProps) {
  const { selectedPrinter, print } = useBrowserPrint();
  const generateMutation = useGenerateLabel();
  const previewMutation = usePreviewLabel();

  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    template.parameters.forEach((p) => {
      initial[p.field_name] = p.default_value || '';
    });
    return initial;
  });
  const [copies, setCopies] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);

  const handleInputChange = (fieldName: string, value: string) => {
    setInputs((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handlePreview = async () => {
    try {
      const result = await previewMutation.mutateAsync({
        template_json: template.template_json,
        inputs,
        width_mm: template.width_mm,
        height_mm: template.height_mm,
      });
      setPreview(result.preview);
    } catch {
      toast.error('Kunne ikke generere forhåndsvisning');
    }
  };

  const handlePrint = async () => {
    if (!selectedPrinter) {
      toast.error('Velg en printer først');
      return;
    }

    try {
      const pdfBlob = await generateMutation.mutateAsync({
        template_id: template.id,
        inputs,
        copies,
      });

      const arrayBuffer = await pdfBlob.arrayBuffer();
      await print(arrayBuffer);

      toast.success('Utskrift sendt');
      onOpenChange(false);
    } catch {
      toast.error('Utskrift feilet');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Skriv ut: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Parameters */}
          <div className="space-y-4">
            <PrinterSelector />

            <div>
              <Label>Antall kopier</Label>
              <Input
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              />
            </div>

            {template.parameters.map((param) => (
              <div key={param.id}>
                <Label>{param.display_name}</Label>
                <Input
                  value={inputs[param.field_name] || ''}
                  onChange={(e) => handleInputChange(param.field_name, e.target.value)}
                  required={param.is_required}
                />
              </div>
            ))}
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <Button variant="outline" onClick={handlePreview} className="w-full">
              Oppdater forhåndsvisning
            </Button>

            <div className="border rounded-lg p-4 bg-muted min-h-[200px] flex items-center justify-center">
              {preview ? (
                <img src={`data:image/png;base64,${preview}`} alt="Preview" className="max-w-full" />
              ) : (
                <span className="text-muted-foreground">Klikk for å se forhåndsvisning</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handlePrint} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? 'Skriver ut...' : 'Skriv ut'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Leveranser Fase 4

- [ ] BrowserPrint service wrapper
- [ ] useBrowserPrint hook
- [ ] PrinterSelector komponent
- [ ] PrintDialog komponent
- [ ] /labels/[id]/print side
- [ ] Feilhåndtering og retry

---

## Fase 5: Parameter-binding (Frontend)

### 5.1 DatabaseSourceConfig

```typescript
'use client';

import { useState, useEffect } from 'react';
import { labelTemplatesApi } from '@/lib/api/labelTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface DatabaseSourceConfigProps {
  value?: { table?: string; column?: string };
  onChange: (config: { table: string; column: string }) => void;
}

export function DatabaseSourceConfig({ value, onChange }: DatabaseSourceConfigProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([]);
  const [selectedTable, setSelectedTable] = useState(value?.table || '');
  const [selectedColumn, setSelectedColumn] = useState(value?.column || '');

  useEffect(() => {
    labelTemplatesApi.getTables().then(setTables);
  }, []);

  useEffect(() => {
    if (selectedTable) {
      labelTemplatesApi.getColumns(selectedTable).then(setColumns);
    }
  }, [selectedTable]);

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
    setSelectedColumn('');
  };

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column);
    onChange({ table: selectedTable, column });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Tabell</Label>
        <Select value={selectedTable} onValueChange={handleTableChange}>
          <SelectTrigger>
            <SelectValue placeholder="Velg tabell" />
          </SelectTrigger>
          <SelectContent>
            {tables.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTable && (
        <div>
          <Label>Kolonne</Label>
          <Select value={selectedColumn} onValueChange={handleColumnChange}>
            <SelectTrigger>
              <SelectValue placeholder="Velg kolonne" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
```

### 5.2 BatchPrintTable

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Upload } from 'lucide-react';
import type { TemplateParameter } from '@/types/labels';

interface BatchPrintTableProps {
  parameters: TemplateParameter[];
  data: Record<string, string>[];
  onChange: (data: Record<string, string>[]) => void;
}

export function BatchPrintTable({ parameters, data, onChange }: BatchPrintTableProps) {
  const addRow = () => {
    const newRow: Record<string, string> = {};
    parameters.forEach((p) => {
      newRow[p.field_name] = p.default_value || '';
    });
    onChange([...data, newRow]);
  };

  const updateRow = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  const removeRow = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim());

      const imported = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || '';
        });
        return row;
      });

      onChange([...data, ...imported]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" onClick={addRow}>
          <Plus className="w-4 h-4 mr-2" />
          Legg til rad
        </Button>
        <label>
          <Button variant="outline" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              Importer CSV
            </span>
          </Button>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {parameters.map((p) => (
              <TableHead key={p.field_name}>{p.display_name}</TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {parameters.map((p) => (
                <TableCell key={p.field_name}>
                  <Input
                    value={row[p.field_name] || ''}
                    onChange={(e) => updateRow(i, p.field_name, e.target.value)}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Leveranser Fase 5

- [ ] DatabaseSourceConfig komponent
- [ ] DatabaseSelect med autocomplete
- [ ] BatchPrintTable med CSV-import
- [ ] Dynamisk skjema-generering

---

## Fase 6: Testing (Frontend)

### Jest Tester

```typescript
// __tests__/components/LabelDesigner.test.tsx
describe('LabelDesigner', () => {
  it('should mount and render toolbar', () => {});
  it('should call onSave with correct data', () => {});
  it('should update size when SizeSelector changes', () => {});
});

// __tests__/hooks/useLabelTemplates.test.ts
describe('useLabelTemplates', () => {
  it('should fetch templates', () => {});
  it('should create template', () => {});
  it('should handle errors', () => {});
});
```

### Playwright E2E

```typescript
// e2e/labels.spec.ts
test.describe('Label Designer', () => {
  test('should create new template', async ({ page }) => {
    await page.goto('/labels/new');
    await page.fill('input[placeholder="Malnavn"]', 'Test Etikett');
    // Add elements...
    await page.click('button:has-text("Lagre")');
    await expect(page).toHaveURL(/\/labels\/[\w-]+/);
  });

  test('should edit existing template', async ({ page }) => {
    await page.goto('/labels');
    await page.click('text=Test Etikett');
    // Edit...
  });
});
```

### Leveranser Fase 6

- [ ] Jest komponent-tester
- [ ] Hook-tester med MSW
- [ ] Playwright E2E-tester (valgfritt)
- [ ] Loading states på alle async ops
- [ ] Error boundaries

---

## Navigasjon

Legg til i sidebar/meny:
```typescript
{
  title: 'Etiketter',
  href: '/labels',
  icon: Tag, // fra lucide-react
}
```
