/** Full-page redirect for external URLs (e.g. Stripe Checkout). */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
