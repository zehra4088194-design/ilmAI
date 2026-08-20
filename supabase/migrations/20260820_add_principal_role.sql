-- Add 'principal' to the user_role enum type
-- Allows institution principals to be tracked separately from generic teachers
ALTER TYPE "public"."user_role" ADD VALUE 'principal' AFTER 'teacher';
