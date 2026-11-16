import { View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { formatMoney } from '../../delivery/services';
import type { Breakdown } from '../../pricing/breakdown';

// Every line of what the customer pays, then the total.
export function AmountBreakdown({ breakdown }: { breakdown: Breakdown }) {
  return (
    <View className="gap-3 rounded-[20px] bg-card p-5">
      <Text className="text-xs font-medium tracking-wider text-muted-foreground">
        WHAT YOU PAY
      </Text>
      {breakdown.lines.map((line) => (
        <View key={line.key} className="flex-row justify-between gap-3">
          <Text className="text-sm text-muted-foreground">{line.label}</Text>
          <Text className="text-sm text-foreground">
            {formatMoney(line.amount)}
          </Text>
        </View>
      ))}
      <View className="mt-1 flex-row justify-between gap-3 border-t border-border pt-3">
        <Text className="text-base font-bold text-foreground">Total</Text>
        <Text className="text-base font-bold text-foreground">
          {formatMoney(breakdown.total)}
        </Text>
      </View>
    </View>
  );
}