import { View } from 'react-native';

import { Text } from '../../components/ui/Text';
import type { JobStatus } from './jobs';

const tags: Record<JobStatus, { label: string; box: string; text: string }> = {
  'your-turn': {
    label: 'Your turn',
    box: 'bg-primary',
    text: 'text-primary-foreground',
  },
  waiting: {
    label: 'Waiting for customer',
    box: 'bg-secondary',
    text: 'text-muted-foreground',
  },
  agreed: {
    label: 'Fare agreed',
    box: 'bg-success-muted',
    text: 'text-foreground',
  },
  passed: {
    label: 'Passed',
    box: 'bg-secondary',
    text: 'text-muted-foreground',
  },
};

export function JobTag({ status }: { status: JobStatus }) {
  const tag = tags[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tag.box}`}>
      <Text className={`text-[10px] font-medium ${tag.text}`}>{tag.label}</Text>
    </View>
  );
}