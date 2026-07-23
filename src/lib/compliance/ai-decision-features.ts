export function aiDecisionFeaturesEnabled() {
  // Keep the feature available by default. Production can still disable it
  // immediately without a code deploy by setting the server-only flag to false.
  return process.env.ENABLE_AI_DECISION_FEATURES !== 'false';
}
