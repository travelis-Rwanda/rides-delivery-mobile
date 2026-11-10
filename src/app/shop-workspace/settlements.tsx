import { View } from 'react-native';

import { Notice } from '../../components/ui/primitives';
import { Text } from '../../components/ui/Text';
import { formatMoney } from '../../features/delivery/services';
import { sampleSettlements } from '../../features/shop-workspace/sample';
import {
  ShopIntro,
  ShopPage,
  ShopPanel,
  ShopTag,
} from '../../features/shop-workspace/ui';

export default function ShopSettlements() {
  return (
    <ShopPage title="Settlements">
      <ShopIntro
        eyebrow="SHOP EARNINGS"
        title="Payout history"
        description="Review the sales amount, deductions, and payout recorded for each sample settlement."
      />
      <View className="mb-5 flex-row gap-3">
        {(['Pending', 'Paid'] as const).map((status) => (
          <View
            key={status}
            className="flex-1 gap-2 rounded-[20px] bg-secondary p-4"
          >
            <Text className="text-xs text-muted-foreground">
              {status === 'Pending' ? 'Pending payout' : 'Paid to shop'}
            </Text>
            <Text className="text-base font-medium text-primary">
              {formatMoney(
                sampleSettlements.reduce(
                  (total, record) =>
                    record.status === status ? total + record.payout : total,
                  0,
                ),
              )}
            </Text>
          </View>
        ))}
      </View>
      <Text
        accessibilityRole="header"
        className="mb-3 text-lg font-medium text-foreground"
      >
        Transactions
      </Text>
      <View className="gap-4">
        {sampleSettlements.map((entry) => (
          <ShopPanel key={entry.id}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-sm font-medium text-foreground">
                  {entry.id}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {entry.orderId} · {entry.date}
                </Text>
              </View>
              <ShopTag
                label={entry.status}
                tone={entry.status === 'Paid' ? 'success' : 'warning'}
              />
            </View>
            {[
              { label: 'Product sales', amount: entry.sales },
              { label: 'Deductions', amount: entry.deductions },
              { label: 'Net payout', amount: entry.payout },
            ].map(({ label, amount }) => (
              <View
                key={label}
                className={`flex-row justify-between gap-3 ${label === 'Net payout' ? 'rounded-xl bg-secondary p-3' : 'border-t border-border pt-3'}`}
              >
                <Text className="text-xs text-muted-foreground">{label}</Text>
                <Text className="text-sm font-medium text-foreground">
                  {formatMoney(amount)}
                </Text>
              </View>
            ))}
          </ShopPanel>
        ))}
        <Notice>Sample settlement records for this preview.</Notice>
      </View>
    </ShopPage>
  );
}
