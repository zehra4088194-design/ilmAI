# Role-Based Signup & Pricing - Implementation Checklist

## ✅ COMPLETED

### 1. Signup Flow
- [x] Identity-first chooser: Parent, University Student, School/College Student, Institutional
- [x] Principal role added (teacher/principal choice in institutional path)
- [x] Database migration for 'principal' role
- [x] TypeScript types updated

### 2. Navigation & Portals
- [x] Parent nav (My Children, Performance)
- [x] Teacher nav (Test Studio, Library, Quran)
- [x] Principal admin portal (Dashboard, Teachers, Classes, Students, Invoices, Payroll, Settings)
- [x] University Hub visibility gated to university students only
- [x] Role-specific nav separation (no cross-contamination)

### 3. Pricing Configuration
- [x] Parent plans (Free/Paid/Elite) with pricing + child limits
- [x] University plans (Free/Paid/Elite) with pricing + AI credits
- [x] Teacher plans (Free/Paid/Elite) with pricing + classroom limits
- [x] Institution plans (School/College) with pricing + discounts
- [x] Admin panel controls for all pricing tiers
- [x] Environment variables for all pricing (NEXT_PUBLIC_*_PRICE_USD, etc.)

### 4. Pricing Pages
- [x] /parent/pricing - Parent subscription page
- [x] /university-hub/pricing - University student subscription page
- [x] /teacher/pricing - Teacher subscription page
- [x] General /pricing - School/College student pricing (existing)

### 5. Platform Settings
- [x] ParentPlanSettings type + defaults
- [x] UniversityPlanSettings type + defaults
- [x] TeacherPlanSettings type + defaults
- [x] Normalization functions for all plan types
- [x] Environment variable loading (loadPricingFromEnv)

---

## 🔄 STILL NEEDED

### Settings Pages (Role-Specific)

**Path Strategy:**
```
/settings (Student settings - existing, keep as-is)
/parent/settings (New - Parent account settings)
/university/settings (New - University student settings)  
/teacher/settings (New - Teacher account settings)
/school-admin/settings (Already done - Principal settings)
```

### Settings Page Features

#### Parent Settings (/parent/settings)
- [ ] Account profile
- [ ] Linked children management
- [ ] Current plan/subscription info
- [ ] Payment methods
- [ ] Billing history

#### University Student Settings (/university/settings)
- [ ] Account profile
- [ ] University Hub quick link (prominent)
- [ ] Current plan/subscription info
- [ ] AI credits usage
- [ ] Payment methods

#### Teacher Settings (/teacher/settings)
- [ ] Account profile
- [ ] Classroom management
- [ ] Current plan/subscription info
- [ ] Payment methods
- [ ] Teaching resources

#### Principal Settings (/school-admin/settings) - DONE
- [x] School Information (name, code, address, contact)
- [x] Teachers management tab
- [x] Curriculum & subjects tab
- [x] Academic calendar tab
- [x] Billing & fees tab
- [x] School plan/subscription tab

---

## 💳 Paddle Price IDs Environment Variables

**Add to Coolify:**

```env
═══════════════════════════════════════════════════════
  PARENT PLANS - Paddle Price IDs
═══════════════════════════════════════════════════════
NEXT_PUBLIC_PADDLE_PRICE_PARENT_PRO_MONTHLY=
NEXT_PUBLIC_PADDLE_PRICE_PARENT_PRO_ANNUAL=
NEXT_PUBLIC_PADDLE_PRICE_PARENT_ELITE_MONTHLY=
NEXT_PUBLIC_PADDLE_PRICE_PARENT_ELITE_ANNUAL=

═══════════════════════════════════════════════════════
  UNIVERSITY STUDENT PLANS - Paddle Price IDs
═══════════════════════════════════════════════════════
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_PRO_MONTHLY=
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_PRO_ANNUAL=
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_ELITE_MONTHLY=
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_ELITE_ANNUAL=

═══════════════════════════════════════════════════════
  TEACHER PLANS - Paddle Price IDs
═══════════════════════════════════════════════════════
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_PRO_MONTHLY=
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_PRO_ANNUAL=
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_ELITE_MONTHLY=
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_ELITE_ANNUAL=

═══════════════════════════════════════════════════════
  PRICE AMOUNTS (USD) - You Control
═══════════════════════════════════════════════════════
NEXT_PUBLIC_PARENT_PLAN_PAID_PRICE_USD=1.99
NEXT_PUBLIC_PARENT_PLAN_ELITE_PRICE_USD=3.49

NEXT_PUBLIC_UNIVERSITY_PLAN_PAID_PRICE_USD=4.99
NEXT_PUBLIC_UNIVERSITY_PLAN_ELITE_PRICE_USD=9.99

NEXT_PUBLIC_TEACHER_PLAN_PAID_PRICE_USD=2.99
NEXT_PUBLIC_TEACHER_PLAN_ELITE_PRICE_USD=6.99
```

---

## 🔗 University Hub Quick Access

**In university student settings:** Add prominent button/link to jump to University Hub

```
Settings → [Quick Access Card]
├─ Title: "University Hub"
├─ Icon: GraduationCap
├─ Button: "Go to University Hub"
└─ Link: /university-hub
```

---

## 📋 Database Queries (Already Set)

- [x] user_role enum includes 'principal'
- [x] profiles.role can be: student, teacher, admin, parent, principal
- [x] school_memberships already tracks member_role (maps to principal)
- [x] college_memberships already tracks member_role (maps to principal)

---

## 🎯 Workflow for User

### Setup (First Time - Coolify)
1. Add PADDLE_PRICE_* IDs from your Paddle account
2. Set NEXT_PUBLIC_*_PRICE_USD values (your chosen prices)
3. Deploy to Coolify

### Ongoing (Admin Panel)
1. Go to /admin/settings
2. Adjust prices/limits anytime
3. Changes apply immediately (no deploy needed)

### For End Users
- Signup → Identity choice → Correct flow + nav
- Settings → Role-specific dashboard
- Pricing page → See their tier options
- Checkout → Paddle handles payment (price from env var)

---

## 🚀 Deployment Order

1. ✅ Role-based signup (DONE)
2. ✅ Principal portal (DONE)
3. ✅ Pricing pages & config (DONE)
4. ✅ Admin panel controls (DONE)
5. ✅ Env var support (DONE)
6. 🔄 **Role-specific settings pages** (NEXT)
7. 🔄 **Paddle price ID env vars** (NEXT)
8. 🔄 **University Hub quick-link** (NEXT)
