"use client";

// Intentionally a no-op. We now only open the
// "What should we call you?" prompt after the user
// clicks the email verification link and returns via
// the auth callback, which sets `?completeProfile=1`.
// See: components/NamePromptOnLogin.tsx
export default function OnboardingEntryGate() {
  return null;
}
