// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionActions from '@/components/SubscriptionActions';
import { AppUiProvider } from '@/components/ui/AppUiProvider';
import type { SubscriptionWithRelations } from '@/types/queries';

const { cancelStripeSubscription, pauseStripeSubscription, refundStripeSubscription } = vi.hoisted(() => ({
  cancelStripeSubscription: vi.fn(),
  pauseStripeSubscription: vi.fn(),
  refundStripeSubscription: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  cancelStripeSubscription,
  pauseStripeSubscription,
  refundStripeSubscription,
}));

function baseSubscription(overrides: Partial<SubscriptionWithRelations> = {}): SubscriptionWithRelations {
  return {
    id: 'sub-row-1',
    member_id: 'member-1',
    status: 'active',
    current_period_end: null,
    stripe_subscription_id: 'sub_stripe_1',
    cancellation_reason: null,
    cancelled_at: null,
    paused_at: null,
    pause_reason: null,
    members: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
    ...overrides,
  } as SubscriptionWithRelations;
}

function renderWithProvider(subscription: SubscriptionWithRelations, onUpdated = vi.fn()) {
  return render(
    <AppUiProvider>
      <SubscriptionActions subscription={subscription} onUpdated={onUpdated} />
    </AppUiProvider>
  );
}

describe('SubscriptionActions', () => {
  beforeEach(() => {
    cancelStripeSubscription.mockReset();
    pauseStripeSubscription.mockReset();
    refundStripeSubscription.mockReset();
  });

  it('renders nothing when there is no stripe subscription to manage', () => {
    renderWithProvider(baseSubscription({ stripe_subscription_id: null }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing for an already-cancelled subscription', () => {
    renderWithProvider(baseSubscription({ status: 'cancelled' }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('cancels a subscription and reports success', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    cancelStripeSubscription.mockResolvedValue(undefined);

    renderWithProvider(baseSubscription(), onUpdated);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(cancelStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: 'sub-row-1', stripeSubscriptionId: 'sub_stripe_1' })
    );
    expect(await screen.findByText('Subscription updated')).toBeInTheDocument();
    expect(onUpdated).toHaveBeenCalled();
  });

  it('shows an error message and does not call onUpdated when the action fails', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    pauseStripeSubscription.mockRejectedValue(new Error('Stripe is down'));

    renderWithProvider(baseSubscription(), onUpdated);

    await user.click(screen.getByRole('button', { name: /pause/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findAllByText('Stripe is down')).not.toHaveLength(0);
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('rejects an invalid refund amount before calling the API', async () => {
    const user = userEvent.setup();
    renderWithProvider(baseSubscription());

    await user.click(screen.getByRole('button', { name: /refund/i }));
    await user.type(screen.getByPlaceholderText('e.g. 49.99'), '-5');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findByText('Enter a valid refund amount.')).toBeInTheDocument();
    expect(refundStripeSubscription).not.toHaveBeenCalled();
  });

  it('shows Resume instead of Pause for an already-paused subscription', () => {
    renderWithProvider(baseSubscription({ status: 'paused' }));
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pause$/i })).not.toBeInTheDocument();
  });
});
