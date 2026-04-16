import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: string[] = [];

  // Create demo user
  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
    email: "demouser@safeguard.app",
    password: "demo1234",
    email_confirm: true,
    user_metadata: { name: "Demo User" },
  });
  if (userErr && !userErr.message.includes("already been registered")) {
    results.push(`User error: ${userErr.message}`);
  } else if (userData?.user) {
    results.push(`Demo user created: demouser@safeguard.app`);
  } else {
    results.push("Demo user already exists");
  }

  // Create demo admin
  const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
    email: "demoadmin@safeguard.app",
    password: "demo1234",
    email_confirm: true,
    user_metadata: { name: "Demo Admin" },
  });
  if (adminErr && !adminErr.message.includes("already been registered")) {
    results.push(`Admin error: ${adminErr.message}`);
  } else if (adminData?.user) {
    // Upgrade to admin role
    await supabaseAdmin
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", adminData.user.id);
    results.push(`Demo admin created: demoadmin@safeguard.app`);
  } else {
    results.push("Demo admin already exists");
  }

  // Also ensure existing Google user (munjalsahil559) is admin
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const sahilUser = existingUsers?.users?.find((u) => u.email === "munjalsahil559@gmail.com");
  if (sahilUser) {
    await supabaseAdmin
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", sahilUser.id);
    results.push("munjalsahil559@gmail.com confirmed as admin");
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
