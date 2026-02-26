// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { wallet_address, signature, message } = await req.json();

    if (!wallet_address || !signature || !message) {
      return new Response(JSON.stringify({ error: "Missing wallet_address, signature, or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedAddress = wallet_address.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/i.test(normalizedAddress)) {
      return new Response(JSON.stringify({ error: "Invalid wallet address format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^0x[a-f0-9]{130}$/i.test(signature)) {
      return new Response(JSON.stringify({ error: "Invalid signature format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message.includes("NexusFin") || !message.includes("Nonce:")) {
      return new Response(JSON.stringify({ error: "Invalid authentication message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const walletEmail = `${normalizedAddress}@wallet.nexusfin.app`;
    // Use a deterministic password based only on wallet address (not signature)
    const walletPassword = `wallet_nexusfin_${normalizedAddress}`;

    // Check if user already exists by listing users with this email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === walletEmail);

    let isNew = false;

    if (existingUser) {
      // Existing user — update password to our deterministic one (in case it was set with old signature-based password)
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        password: walletPassword,
      });
      console.log("Wallet user found, updated password:", normalizedAddress);
    } else {
      // New user — create
      isNew = true;
      console.log("Creating new wallet user:", normalizedAddress);

      const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true,
        user_metadata: {
          display_name: `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
          wallet_address: normalizedAddress,
          auth_method: "web3",
        },
      });

      if (signUpError) {
        console.error("Signup error:", signUpError);
        throw signUpError;
      }

      if (signUpData.user) {
        await adminClient
          .from("profiles")
          .update({ wallet_address: normalizedAddress })
          .eq("user_id", signUpData.user.id);
      }
    }

    // Sign in with the deterministic password
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: walletEmail,
      password: walletPassword,
    });

    if (signInError || !signInData.session) {
      console.error("Sign-in error:", signInError);
      throw new Error("Failed to create session");
    }

    return new Response(JSON.stringify({
      session: signInData.session,
      user: signInData.user,
      is_new: isNew,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wallet-auth error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Authentication failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
