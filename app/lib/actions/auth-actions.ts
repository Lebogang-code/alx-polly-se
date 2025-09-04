'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { validateLogin, validateRegister } from '@/lib/validation';
import { checkRateLimit, sanitizeError } from '@/lib/security';

export async function login(data: LoginFormData) {
  try {
    // Rate limiting check
    if (!checkRateLimit(`login_${data.email}`, 5, 300000)) { // 5 attempts per 5 minutes
      return { error: "Too many login attempts. Please try again later." };
    }

    // Input validation
    const validation = validateLogin(data);
    if (!validation.isValid) {
      return { error: validation.error };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });

    if (error) {
      return { error: sanitizeError(error) };
    }

    // Success: no error
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function register(data: RegisterFormData) {
  try {
    // Rate limiting check
    if (!checkRateLimit(`register_${data.email}`, 3, 600000)) { // 3 attempts per 10 minutes
      return { error: "Too many registration attempts. Please try again later." };
    }

    // Input validation
    const validation = validateRegister(data);
    if (!validation.isValid) {
      return { error: validation.error };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          name: data.name.trim(),
        },
      },
    });

    if (error) {
      return { error: sanitizeError(error) };
    }

    // Success: no error
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: sanitizeError(error) };
    }
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (error) {
    return null;
  }
}
