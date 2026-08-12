import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAllCollegesForSuperAdmin } from "@/lib/college/queries";
import { CollegesTable } from "@/components/college/super-admin/CollegesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CollegeActionForm } from "@/components/features/college-erp/CollegeActionForm";
import { DEFAULT_COLLEGE_MODULES, COLLEGE_MODULES } from "@/lib/college-erp/modules";
import { createCollegeOrganization, updateCollegePlanSettings } from "@/lib/college-erp/admin-actions";

export const metadata = { title: "Colleges | Admin | ilm AI" };

const selectClass = "border-input bg-background h-10 w-full rounded-lg border px-3 text-sm";

export default async function AdminCollegesPage() {
  const supabase = await createClient();
  const colleges = await getAllCollegesForSuperAdmin(supabase);

  // New-schema (college_organizations / college_memberships) provisioning — see
  // docs/SCHOOL_COLLEGE_SEPARATION_TODO.md "college organization provisioning" for why this is a
  // second section on the same page rather than a new route: it keeps one admin URL and mirrors how
  // /college-admin's layout already OR-gates old vs. new schema per-request, without touching the
  // legacy table/flow below (untouched, still reads from `colleges`/`college_admins`).
  const db = (await createAdminClient()) as any;
  const { data: orgData } = await db
    .from("college_organizations")
    .select(
      "*, college_campuses(id), college_memberships(id, member_role, profiles(full_name, email)), college_organization_plan_settings(*)"
    )
    .order("created_at", { ascending: false });
  const { data: planTiers } = await db
    .from("institution_plan_tiers")
    .select("*")
    .eq("is_active", true)
    .eq("institution_type", "college")
    .order("max_students");
  const orgs = orgData || [];

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Colleges</h1>
        <Button asChild>
          <Link href="/admin/colleges/new">
            <Plus className="h-4 w-4" />
            Add College (legacy)
          </Link>
        </Button>
      </div>
      <CollegesTable colleges={colleges} />

      <section className="space-y-4 border-t pt-8">
        <div>
          <h2 className="text-lg font-bold">College organizations (new system)</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Provisions the new <code>college_organizations</code> / <code>college_memberships</code> schema
            that powers <code>/college-admin</code>'s full feature set. Independent of the legacy colleges
            above — no data bridge exists between the two yet.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <CollegeActionForm
              action={createCollegeOrganization}
              submitLabel="Create college"
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            >
              <Input name="name" placeholder="College name" required />
              <Input name="slug" placeholder="Public slug (optional)" />
              <select name="organization_type" className={selectClass} defaultValue="college">
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="institute">Institute</option>
              </select>
              <Input name="owner_email" type="email" placeholder="Registered owner email" required />
              <Input name="campus_name" placeholder="Main Campus" />
              <Input name="email" type="email" placeholder="College email" />
              <Input name="phone" placeholder="College phone" />
              <Input name="address" placeholder="Address" />
            </CollegeActionForm>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orgs.map((org: any) => {
            const ownerLink = (org.college_memberships || []).find((item: any) => item.member_role === "owner");
            const owner = Array.isArray(ownerLink?.profiles) ? ownerLink.profiles[0] : ownerLink?.profiles;
            const plan = Array.isArray(org.college_organization_plan_settings)
              ? org.college_organization_plan_settings[0]
              : org.college_organization_plan_settings;
            return (
              <Card key={org.id}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{org.name}</h3>
                      <p className="text-muted-foreground mt-1 text-xs">
                        /{org.slug} - {org.organization_type}
                      </p>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${org.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  </div>
                  <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                    <span>{org.college_campuses?.length || 0} campuses</span>
                    <span>{org.college_memberships?.length || 0} memberships</span>
                    <span>Students max {plan?.max_students ?? 200}</span>
                    <span>${Number(plan?.monthly_price_usd ?? 10).toLocaleString()}/mo</span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    Owner: {owner?.full_name || owner?.email || "Not assigned"}
                  </p>
                  <CollegeActionForm action={updateCollegePlanSettings} submitLabel="Save plan" className="grid gap-2">
                    <input type="hidden" name="organization_id" value={org.id} />
                    <select name="plan_tier_id" className={selectClass} defaultValue={plan?.plan_tier_id || ""}>
                      <option value="">Custom plan</option>
                      {(planTiers || []).map((tier: any) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name} - max {tier.max_students}
                        </option>
                      ))}
                    </select>
                    <select name="billing_status" className={selectClass} defaultValue={plan?.billing_status || "trial"}>
                      {["trial", "active", "past_due", "manual_review", "suspended", "cancelled"].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <Input name="max_students" type="number" min={0} defaultValue={plan?.max_students ?? 200} placeholder="Students" />
                      <Input name="max_teachers" type="number" min={0} defaultValue={plan?.max_teachers ?? 25} placeholder="Teachers" />
                      <Input name="max_storage_gb" type="number" min={0} defaultValue={plan?.max_storage_gb ?? 10} placeholder="GB" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="monthly_price_usd" type="number" min={0} step="0.01" defaultValue={plan?.monthly_price_usd ?? 10} placeholder="USD/mo" />
                      <Input name="monthly_price_pkr" type="number" min={0} step="1" defaultValue={plan?.monthly_price_pkr ?? 0} placeholder="PKR/mo" />
                    </div>
                    <fieldset className="border-border rounded-lg border p-3">
                      <legend className="text-muted-foreground px-1 text-[11px]">Enabled modules</legend>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {COLLEGE_MODULES.map((module) => {
                          const enabled = plan?.enabled_modules
                            ? plan.enabled_modules.includes(module.key)
                            : DEFAULT_COLLEGE_MODULES.includes(module.key);
                          return (
                            <label key={module.key} className="flex items-center gap-2 text-xs" title={module.description}>
                              <input
                                type="checkbox"
                                name="enabled_modules"
                                value={module.key}
                                defaultChecked={enabled}
                                disabled={module.key === "dashboard"}
                                className="h-3.5 w-3.5 rounded"
                              />
                              {module.label}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                    <Input name="notes" defaultValue={plan?.notes || ""} placeholder="Internal notes" />
                  </CollegeActionForm>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
