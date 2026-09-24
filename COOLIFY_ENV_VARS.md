# Coolify Environment Variables - ilm AI Pricing & Paddle Setup

> **Last Updated**: 2026-08-20
> **Version**: 1.0
> **Purpose**: Configure pricing, Paddle payment IDs, and features in Coolify

---

## 📌 Quick Start

Copy all variables below into Coolify → Environment Variables section.

**Three variable types:**
1. **Paddle Price IDs** (from your Paddle dashboard)
2. **USD Prices** (what you charge users)
3. **Feature Limits** (already in code, rarely need adjustment)

---

## 💳 PADDLE PRICE IDs (from your Paddle account)

**Find these in:** Paddle Dashboard → Products → Price IDs

### Parent Plans
```env
# Parent Paid Tier (1-4 children)
NEXT_PUBLIC_PADDLE_PRICE_PARENT_PRO_MONTHLY=price_xxxxx
NEXT_PUBLIC_PADDLE_PRICE_PARENT_PRO_ANNUAL=price_xxxxx

# Parent Elite Tier (unlimited children)
NEXT_PUBLIC_PADDLE_PRICE_PARENT_ELITE_MONTHLY=price_xxxxx
NEXT_PUBLIC_PADDLE_PRICE_PARENT_ELITE_ANNUAL=price_xxxxx
```

### University Student Plans
```env
# University Pro (200 AI credits/month)
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_PRO_MONTHLY=price_xxxxx
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_PRO_ANNUAL=price_xxxxx

# University Elite (1000 AI credits/month)
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_ELITE_MONTHLY=price_xxxxx
NEXT_PUBLIC_PADDLE_PRICE_UNIVERSITY_ELITE_ANNUAL=price_xxxxx
```

### Teacher Plans
```env
# Teacher Pro (5 classrooms)
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_PRO_MONTHLY=price_xxxxx
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_PRO_ANNUAL=price_xxxxx

# Teacher Elite (unlimited classrooms)
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_ELITE_MONTHLY=price_xxxxx
NEXT_PUBLIC_PADDLE_PRICE_TEACHER_ELITE_ANNUAL=price_xxxxx
```

---

## 💰 USD PRICE AMOUNTS (You Control These)

**These are what users pay (in USD).** 
**PKR conversion happens automatically (USD × Exchange Rate)**

### Parent Plans
```env
# Free tier: 1 child (always free, no price needed)
NEXT_PUBLIC_PARENT_PLAN_PAID_PRICE_USD=1.99
NEXT_PUBLIC_PARENT_PLAN_ELITE_PRICE_USD=3.49
```

### University Student Plans
```env
# Free tier: 20 credits/month (always free)
NEXT_PUBLIC_UNIVERSITY_PLAN_PAID_PRICE_USD=4.99
NEXT_PUBLIC_UNIVERSITY_PLAN_ELITE_PRICE_USD=9.99
```

### Teacher Plans
```env
# Free tier: 1 classroom (always free)
NEXT_PUBLIC_TEACHER_PLAN_PAID_PRICE_USD=2.99
NEXT_PUBLIC_TEACHER_PLAN_ELITE_PRICE_USD=6.99
```

### Institution Plans (School/College)
```env
NEXT_PUBLIC_SCHOOL_BASE_PRICE_USD=10
NEXT_PUBLIC_COLLEGE_BASE_PRICE_USD=20
NEXT_PUBLIC_INSTITUTION_ANNUAL_DISCOUNT_PERCENT=15
NEXT_PUBLIC_INSTITUTION_VOLUME_DISCOUNT_PERCENT=10
NEXT_PUBLIC_INSTITUTION_VOLUME_MIN_STUDENTS=500
```

---

## 🎯 Feature Limits (Optional - rarely change)

### Parent Plans
```env
NEXT_PUBLIC_PARENT_PLAN_FREE_CHILDREN=1
NEXT_PUBLIC_PARENT_PLAN_PAID_CHILDREN=4
NEXT_PUBLIC_PARENT_PLAN_ELITE_CHILDREN=null  # unlimited
```

### University Plans
```env
NEXT_PUBLIC_UNIVERSITY_PLAN_FREE_CREDITS=20
NEXT_PUBLIC_UNIVERSITY_PLAN_PAID_CREDITS=200
NEXT_PUBLIC_UNIVERSITY_PLAN_ELITE_CREDITS=1000
```

### Teacher Plans
```env
NEXT_PUBLIC_TEACHER_PLAN_FREE_CLASSROOMS=1
NEXT_PUBLIC_TEACHER_PLAN_PAID_CLASSROOMS=5
NEXT_PUBLIC_TEACHER_PLAN_ELITE_CLASSROOMS=null  # unlimited
```

---

## 🔄 Priority & Fallback

```
1. Coolify Env Var SET
   ✅ Use that value
   
2. Coolify Env Var EMPTY
   ✅ Use admin panel value (if set)
   
3. Admin Panel EMPTY
   ✅ Use hardcoded DEFAULT_PLATFORM_SETTINGS
```

**Example:**
```
If NEXT_PUBLIC_PARENT_PLAN_PAID_PRICE_USD not in Coolify:
  ├─ Check admin panel (/admin/settings)
  ├─ If admin set $2.49 → use $2.49
  └─ If admin empty → use default $1.99
```

---

## ✏️ How to Update Prices

### Option 1: Coolify (Recommended for Deployment)
```
Coolify → Variables → Edit NEXT_PUBLIC_PARENT_PLAN_PAID_PRICE_USD=2.49 → Save → Redeploy
```

### Option 2: Admin Panel (Immediate, No Redeploy)
```
Go to /admin/settings → Parent Plans → Change "Monthly price (USD)" → Click "Save settings"
```

**Use Option 2 for quick changes, Option 1 for permanent defaults.**

---

## 📱 Paddle Integration Points

**Where Paddle price IDs are used:**

1. **/parent/pricing** → Upgrade to Paid/Elite
2. **/university-hub/pricing** → Upgrade to Paid/Elite
3. **/teacher/pricing** → Upgrade to Paid/Elite
4. **/parent/settings** → Change subscription
5. **/university/settings** → Change subscription
6. **/teacher/settings** → Change subscription

Each page links to `/subscription?tier=pro` or `/subscription?tier=elite`, which uses the Paddle price ID from env vars.

---

## ✅ Verification Checklist

Before deploying to Coolify:

- [ ] All Paddle price IDs filled in (get from Paddle dashboard)
- [ ] USD prices set (you choose these amounts)
- [ ] Exchange rate updated if needed (currently 1 USD = 280 PKR)
- [ ] Admin panel also updated (for consistency)
- [ ] Test signup flow for each role
- [ ] Test pricing pages show correct prices
- [ ] Test checkout uses correct Paddle price ID

---

## 🆘 Troubleshooting

### Pricing shows $0 or incorrect amount
- [ ] Check Coolify env var is set correctly
- [ ] Check admin panel has value
- [ ] Check DEFAULT_PLATFORM_SETTINGS in code

### Checkout goes to wrong Paddle product
- [ ] Verify NEXT_PUBLIC_PADDLE_PRICE_*_* IDs match your Paddle account
- [ ] Check Paddle product exists with that price ID
- [ ] Verify tier (PRO vs ELITE) matches price ID purpose

### Some roles don't see pricing
- [ ] Verify their role in database
- [ ] Check /admin/settings has values for that role
- [ ] Check pricing page route is accessible for that role

---

## 📣 House Ads — ilmai.store Conversion Tracking

House ads (the self-served banners that replaced Google AdSense) track clicks through to
ilmai.store via a server-to-server callback. One secret, shared between both apps:

```env
# Bearer secret ilmai.store's server sends on POST /api/ads/conversion. Generate a long random
# value and set this EXACT same value in ilmai.store's own environment — it verifies the
# `Authorization: Bearer <value>` header the same way CRON_SECRET is checked on /api/cron/* here.
AD_TRACKING_SECRET=
```

---

## 📞 Support

For questions about:
- **Paddle integration**: Check Paddle docs
- **Price updates**: Use admin panel (/admin/settings) for immediate changes
- **Environment variables**: See this file

---

## 🗂️ Related Files

- Platform Settings: `src/lib/platform-settings/shared.ts`
- Admin Controls: `src/components/features/admin/settings/PlatformSettingsForm/index.tsx`
- Parent Pricing Page: `src/app/(dashboard)/parent/pricing/page.tsx`
- University Pricing Page: `src/app/(dashboard)/university-hub/pricing/page.tsx`
- Teacher Pricing Page: `src/app/(dashboard)/teacher/pricing/page.tsx`
- Coolify Config: This file (COOLIFY_ENV_VARS.md)
