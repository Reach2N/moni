import { z } from 'zod'
import { BOOKING_UNITS, BUSINESS_TYPES, CURRENCIES } from '../types.ts'

const businessTypeIds = BUSINESS_TYPES.map((type) => type.id) as [string, ...string[]]
const currencyCodes = Object.keys(CURRENCIES) as [string, ...string[]]

const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable()

const SetupHours = z
  .array(
    z
      .object({
        dow: z.number().int().min(0).max(6),
        open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      })
      .strict(),
  )
  .max(7)
  .superRefine((hours, context) => {
    const days = new Set<number>()
    for (const [index, day] of hours.entries()) {
      if (days.has(day.dow)) {
        context.addIssue({ code: 'custom', path: [index, 'dow'], message: 'weekday appears more than once' })
      }
      days.add(day.dow)
      if (day.open >= day.close) {
        context.addIssue({ code: 'custom', path: [index, 'close'], message: 'close must be after open' })
      }
    }
  })

const SetupService = z
  .object({
    name: z.string().trim().min(1).max(120),
    name_en: nullableText(120).optional().default(null),
    description: nullableText(500).optional().default(null),
    price_minor: z.number().int().min(0).max(100_000_000),
    currency: z.enum(currencyCodes),
    unit: z.enum(BOOKING_UNITS),
    duration_min: z.number().int().min(5).max(10_080),
    buffer_min: z.number().int().min(0).max(1_440).default(0),
    capacity: z.number().int().min(1).max(500).default(1),
    requires_deposit: z.boolean().default(false),
    deposit_minor: z.number().int().positive().max(100_000_000).nullable().optional().default(null),
  })
  .strict()
  .superRefine((service, context) => {
    if (service.requires_deposit && service.deposit_minor == null) {
      context.addIssue({ code: 'custom', path: ['deposit_minor'], message: 'deposit is required for this service' })
    }
    if (!service.requires_deposit && service.deposit_minor != null) {
      context.addIssue({ code: 'custom', path: ['deposit_minor'], message: 'remove the deposit or require it' })
    }
    if (service.deposit_minor != null && service.deposit_minor > service.price_minor) {
      context.addIssue({ code: 'custom', path: ['deposit_minor'], message: 'deposit cannot exceed the service price' })
    }
  })

export const SetupRequestSchema = z
  .object({
    raw_description: z.string().trim().min(8).max(8_000),
    model: z.string().trim().min(1).max(120).optional(),
    // The owner's standing instructions for the assistant, saved alongside the
    // catalogue because they are written on the same screen. Optional and
    // nullable are different answers here: absent means "leave what is there",
    // null means "clear it". Defaulting it would silently wipe an owner's
    // instructions every time they re-saved a price.
    ai_instructions: z.string().trim().max(2_000).nullable().optional(),
    business: z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        phone: nullableText(40).optional(),
        address: nullableText(300).optional(),
        province: nullableText(100).optional(),
      })
      .strict()
      .optional(),
    shop: z
      .object({
        business_type: z.enum(businessTypeIds),
        default_currency: z.enum(currencyCodes),
        services: z.array(SetupService).min(1).max(100),
        hours: SetupHours,
        resource_count: z.number().int().min(1).max(100),
        notes: nullableText(1_000).optional().default(null),
      })
      .strict()
      .superRefine((shop, context) => {
        const names = new Set<string>()
        for (const [index, service] of shop.services.entries()) {
          const normalized = normalizeServiceName(service.name)
          if (names.has(normalized)) {
            context.addIssue({ code: 'custom', path: ['services', index, 'name'], message: 'service name is duplicated' })
          }
          names.add(normalized)
        }
      }),
  })
  .strict()

export type SetupRequest = z.infer<typeof SetupRequestSchema>

export function normalizeServiceName(name: string) {
  return name.normalize('NFKC').trim().toLocaleLowerCase('en')
}
