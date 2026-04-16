import { z } from 'zod';

// Patient validation schema
export const patientSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.'\-]+$/, 'Name can only contain letters, spaces, dots, apostrophes, and hyphens'),
  phone: z.string()
    .trim()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(/^[0-9+\s\-()]+$/, 'Phone number can only contain digits, +, spaces, hyphens, and parentheses'),
});

// Auth validation schemas
export const emailSchema = z.string()
  .trim()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const fullNameSchema = z.string()
  .trim()
  .min(2, 'Full name must be at least 2 characters')
  .max(100, 'Full name must be less than 100 characters')
  .regex(/^[a-zA-Z\s.'\-]+$/, 'Full name can only contain letters, spaces, dots, apostrophes, and hyphens');

export const phoneSchema = z.string()
  .trim()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be less than 15 digits')
  .regex(/^[0-9+\s\-()]+$/, 'Phone number can only contain digits, +, spaces, hyphens, and parentheses');

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Admin registration schema
export const adminRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: fullNameSchema,
  phone: phoneSchema.optional(),
  shopName: z.string().max(200, 'Shop name must be less than 200 characters').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type exports
export type PatientInput = z.infer<typeof patientSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminRegistrationInput = z.infer<typeof adminRegistrationSchema>;
