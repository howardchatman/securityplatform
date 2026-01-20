import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client-side Supabase client (limited access via RLS)
// Only create if we have the required env vars
let _supabase: SupabaseClient | null = null;
export const supabase: SupabaseClient = (() => {
  if (!_supabase && supabaseUrl && supabaseAnonKey) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  if (!_supabase) {
    // Return a mock client that won't crash but won't work
    // This allows the app to load even without env vars configured
    console.warn("Supabase client not initialized - missing environment variables");
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: new Error("Supabase not configured") }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error("Supabase not configured") }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: new Error("Supabase not configured") }) }) }) }),
        upsert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error("Supabase not configured") }) }) }),
      }),
    } as unknown as SupabaseClient;
  }
  return _supabase;
})();

// Server-side Supabase client (full access for API routes)
let _supabaseAdmin: SupabaseClient | null = null;
export const supabaseAdmin: SupabaseClient = (() => {
  if (!_supabaseAdmin && supabaseUrl && supabaseServiceKey) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin || supabase;
})();

// ============================================
// LEAD FUNCTIONS
// ============================================

export interface Lead {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  preferred_contact?: "email" | "phone" | "text";
  source?: string;
  status?: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  created_at?: string;
  updated_at?: string;
}

export async function createLead(lead: Lead) {
  const { data, error } = await supabaseAdmin
    .from("security_leads")
    .insert([
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone || null,
        message: lead.message || null,
        preferred_contact: lead.preferred_contact || "email",
        source: lead.source || "website",
        status: "new",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLeads(status?: string) {
  let query = supabaseAdmin
    .from("security_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateLeadStatus(id: string, status: string) {
  const { data, error } = await supabaseAdmin
    .from("security_leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// CUSTOMER FUNCTIONS
// ============================================

export interface Customer {
  id?: string;
  auth_user_id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  status?: "active" | "inactive" | "prospect";
  created_at?: string;
  updated_at?: string;
}

export async function createCustomer(customer: Customer) {
  const { data, error } = await supabaseAdmin
    .from("security_customers")
    .insert([customer])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCustomers() {
  const { data, error } = await supabaseAdmin
    .from("security_customers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("security_customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SERVICE TICKET FUNCTIONS
// ============================================

export interface ServiceTicket {
  id?: string;
  customer_id: string;
  property_id?: string;
  title: string;
  description?: string;
  priority?: "emergency" | "urgent" | "normal" | "low";
  status?: "open" | "assigned" | "scheduled" | "in_progress" | "completed" | "cancelled";
  assigned_to?: string;
  scheduled_date?: string;
  completed_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export async function createServiceTicket(ticket: ServiceTicket) {
  const { data, error } = await supabaseAdmin
    .from("security_service_tickets")
    .insert([
      {
        ...ticket,
        status: ticket.status || "open",
        priority: ticket.priority || "normal",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getServiceTickets(status?: string) {
  let query = supabaseAdmin
    .from("security_service_tickets")
    .select(`
      *,
      customer:security_customers(id, name, email, phone)
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================
// CHAT CONVERSATION FUNCTIONS
// ============================================

export interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface ChatConversation {
  id?: string;
  lead_id?: string;
  customer_id?: string;
  session_id: string;
  messages: ChatMessage[];
  created_at?: string;
  updated_at?: string;
}

export async function saveConversation(conversation: ChatConversation) {
  const { data, error } = await supabaseAdmin
    .from("security_chat_conversations")
    .upsert(
      {
        session_id: conversation.session_id,
        lead_id: conversation.lead_id,
        customer_id: conversation.customer_id,
        messages: conversation.messages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// CALL LOG FUNCTIONS
// ============================================

export interface CallLog {
  id?: string;
  lead_id?: string;
  customer_id?: string;
  caller_name?: string;
  caller_phone?: string;
  duration_seconds?: number;
  call_type?: "inbound" | "outbound";
  sentiment?: "positive" | "neutral" | "negative";
  summary?: string;
  transcript?: object;
  retell_call_id?: string;
  created_at?: string;
}

export async function saveCallLog(callLog: CallLog) {
  const { data, error } = await supabaseAdmin
    .from("security_call_logs")
    .insert([callLog])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCallLogs() {
  const { data, error } = await supabaseAdmin
    .from("security_call_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
