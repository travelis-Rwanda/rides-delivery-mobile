import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { Button, Field, Notice } from '../../../components/ui/primitives';
import { useTrips } from '../TripProvider';
import { MAX_REVIEW_LENGTH, rate, type Trip } from '../trip';
import { starsText } from '../view';

// After the delivery is completed, the customer rates the driver from 1 to 5
// stars and may add a short review. A rating can only be given once.
export function RatingCard({
  trip,
  driverName,
}: {
  trip: Trip;
  driverName: string;
}) {
  const { act } = useTrips();
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (trip.rating)
    return (
      <View className="mb-5 gap-2 rounded-[20px] bg-card p-5">
        <Text className="text-xs font-medium tracking-wider text-muted-foreground">
          YOUR RATING
        </Text>
        <Text
          accessibilityLabel={`You rated ${driverName} ${trip.rating.stars} out of 5`}
          className="text-2xl text-primary"
        >
          {starsText(trip.rating.stars)}
        </Text>
        {!!trip.rating.review && (
          <Text className="text-sm leading-6 text-foreground">
            “{trip.rating.review}”
          </Text>
        )}
      </View>
    );

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await act(trip.requestId, (t, now) =>
      rate(t, stars, review, now),
    );
    if (!result.ok) setError(result.error);
    setBusy(false);
  }

  return (
    <View className="mb-5 gap-3 rounded-[20px] bg-card p-5">
      <Text className="text-xs font-medium tracking-wider text-muted-foreground">
        RATE {driverName.toUpperCase()}
      </Text>
      <View accessibilityRole="radiogroup" className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`${value} ${value === 1 ? 'star' : 'stars'}`}
            accessibilityState={{ checked: stars === value }}
            onPress={() => setStars(value)}
            hitSlop={6}
          >
            <Text
              className={`text-4xl ${value <= stars ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {value <= stars ? '★' : '☆'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Field
        label="Review (optional)"
        placeholder="How was your delivery?"
        value={review}
        onChangeText={setReview}
        maxLength={MAX_REVIEW_LENGTH}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      {!!error && <Notice warning>{error}</Notice>}
      <Button
        label="Submit rating"
        icon="check"
        loading={busy}
        disabled={stars === 0}
        onPress={() => void submit()}
      />
    </View>
  );
}