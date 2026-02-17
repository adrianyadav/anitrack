"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .then((rows) => rows[0]);

  if (existing) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "All fields are required" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    // NextAuth throws NEXT_REDIRECT on success, rethrow it
    if ((error as Error).message?.includes("NEXT_REDIRECT")) {
      throw error;
    }
    return { error: "Invalid email or password" };
  }
}
