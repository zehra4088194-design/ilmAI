export function aiDecisionFeaturesEnabled() {
  return (
    process.env.ENABLE_AI_DECISION_FEATURES === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_AI_DECISION_FEATURES === 'true'
  );
}
