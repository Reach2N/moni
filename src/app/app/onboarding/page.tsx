import { Onboarding } from '@/components/app/onboarding.tsx'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'រៀបចំហាង' }

/**
 * PLAN.md Phase 3. The gate in `src/app/app/layout.tsx` has already decided this
 * visitor is a member; this page only has to know which shop is theirs.
 */
export default async function OnboardingPage() {
  // Same reason as the dashboard: keep database configuration out of the
  // build-time module graph so a clean clone still builds the public site.
  const [{ requireMember }, { getBusinessById, hasCatalogue }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/business.ts'),
  ])
  const member = await requireMember()
  const [business, catalogued] = await Promise.all([
    getBusinessById(member.businessId),
    hasCatalogue(member.businessId),
  ])

  return (
    <Onboarding
      shopName={business.name}
      initialInstructions={business.ai_instructions}
      hasCatalogue={catalogued}
    />
  )
}
