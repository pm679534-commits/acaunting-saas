import { z } from "zod";

export const uploadDocumentSchema = z.object({
  organizationId: z.string().uuid(),
});

export const editedFieldsSchema = z.object({
  date: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  vendor_name: z.string().max(255).nullable().optional(),
  tax_id: z
    .string()
    .regex(/^\d{10}$/, "VÖEN 10 rəqəmli olmalıdır")
    .nullable()
    .optional(),
  category: z.string().max(100).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const patchDocumentSchema = z.object({
  edited_fields: editedFieldsSchema,
  finalized: z.boolean().optional(),
});

export const exportDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()).optional(),
});

export const checkoutSchema = z.object({
  planId: z.enum(["starter", "pro", "enterprise"]),
});

export const listDocumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["pending", "processing", "done", "error"])
    .optional(),
  search: z.string().max(200).optional(),
});

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
