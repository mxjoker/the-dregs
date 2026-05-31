import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MatchMomentModal } from '@/components/discover/MatchMomentModal';
import type { MatchMomentData } from '@/lib/matches';

const BASE_DATA: MatchMomentData = {
  matchId: 'match-1',
  otherProfileId: 'profile-other',
  otherName: 'Alex',
  otherPhotoUrl: null,
  viewerName: 'You',
  sharedFlags: [],
};

describe('MatchMomentModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the match heading with the other person name', () => {
    const { getByText } = render(
      <MatchMomentModal
        visible
        data={BASE_DATA}
        onDismiss={jest.fn()}
        onSendLine={jest.fn()}
      />,
    );
    expect(getByText('You matched with Alex')).toBeTruthy();
  });

  it('renders the "disaster solidarity" badge', () => {
    const { getByText } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(getByText('disaster solidarity')).toBeTruthy();
  });

  it('renders all 12 base opening lines when no shared flags', () => {
    const { getByText } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(getByText("so what's your damage")).toBeTruthy();
    expect(getByText("let's ruin this slowly")).toBeTruthy();
  });

  it('renders 2 extra lines when shared flags exist', () => {
    const { getByText } = render(
      <MatchMomentModal
        visible
        data={{ ...BASE_DATA, sharedFlags: [{ id: 'f1', label: 'no curtains' }] }}
        onDismiss={jest.fn()}
        onSendLine={jest.fn()}
      />,
    );
    expect(getByText(/i liked your flag about no curtains/)).toBeTruthy();
    expect(getByText(/we have 1 red flag in common/)).toBeTruthy();
  });

  it('does not render shared flag chips when sharedFlags is empty', () => {
    const { queryByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(queryByTestId('shared-flags-row')).toBeNull();
  });

  it('renders shared flag chips when sharedFlags has entries', () => {
    const { getByTestId, getByText } = render(
      <MatchMomentModal
        visible
        data={{ ...BASE_DATA, sharedFlags: [{ id: 'f1', label: 'no curtains' }] }}
        onDismiss={jest.fn()}
        onSendLine={jest.fn()}
      />,
    );
    expect(getByTestId('shared-flags-row')).toBeTruthy();
    expect(getByText('no curtains')).toBeTruthy();
  });

  it('send button is disabled until a line is selected', () => {
    const { getByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(getByTestId('send-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('send button enables after selecting a line', () => {
    const { getByText, getByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    fireEvent.press(getByText("so what's your damage"));
    expect(getByTestId('send-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('calls onSendLine with the selected line when send button is pressed', () => {
    const onSendLine = jest.fn();
    const { getByText, getByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={onSendLine} />,
    );
    fireEvent.press(getByText("so what's your damage"));
    fireEvent.press(getByTestId('send-button'));
    jest.runOnlyPendingTimers();
    expect(onSendLine).toHaveBeenCalledWith("so what's your damage");
  });

  it('calls onDismiss when "keep swiping" is pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={onDismiss} onSendLine={jest.fn()} />,
    );
    fireEvent.press(getByText('keep swiping'));
    jest.runOnlyPendingTimers();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders nothing when data is null', () => {
    const { queryByText } = render(
      <MatchMomentModal visible={false} data={null} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(queryByText('disaster solidarity')).toBeNull();
  });
});
