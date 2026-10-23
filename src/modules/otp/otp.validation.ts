import { z } from 'zod';

/**
 * Normalizes phone numbers to standard format (with country code, digits only)
 * E.g. "+91 98765-43210" -> "919876543210"
 * E.g. "9876543210" (10 digits) -> assumes India "919876543210"
 */
export const normalizePhoneNumber = (rawPhone: string, defaultCountryCode = '91'): string => {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
  return digits;
};

// Regex requiring 8 to 15 digits according to ITU E.164 phone specification
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(8, 'Phone number must have at least 8 digits')
    .max(16, 'Phone number cannot exceed 16 characters')
    .refine((val) => phoneRegex.test(val.replace(/[\s-]/g, '')), {
      message: 'Invalid phone number format. Must include valid country code (e.g. +919876543210).',
    }),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(8, 'Phone number must have at least 8 digits')
    .max(16, 'Phone number cannot exceed 16 characters'),
  otp: z
    .string()
    .trim()
    .min(4, 'OTP must be at least 4 digits')
    .max(8, 'OTP cannot exceed 8 digits')
    .regex(/^\d+$/, 'OTP must contain numbers only.'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
