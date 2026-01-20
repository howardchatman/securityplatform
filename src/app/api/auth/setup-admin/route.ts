import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

// This endpoint creates/updates the admin user with correct password hash
// Call this once to set up the admin account
export async function POST() {
  const adminEmail = "howard@chatmaninc.com";
  const adminPassword = "Howard1234";

  try {
    // Hash the password properly with bcrypt
    const passwordHash = await hashPassword(adminPassword);

    // Upsert the admin user
    const { data, error } = await supabaseAdmin
      .from("security_admin_users")
      .upsert(
        {
          email: adminEmail,
          password_hash: passwordHash,
          name: "Howard",
          role: "admin",
          is_active: true,
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error creating admin user:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created/updated successfully",
      userId: data.id,
    });
  } catch (error) {
    console.error("Error in setup-admin:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}

// Also allow GET for easy browser access
export async function GET() {
  return POST();
}
