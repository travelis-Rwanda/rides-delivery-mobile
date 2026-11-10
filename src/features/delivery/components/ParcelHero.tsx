import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { ScrollPressable } from '../../../components/ui/ScrollInteraction';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { Icon } from '../../../components/ui/Icon';
import { Text } from '../../../components/ui/Text';

function ParcelScene() {
  return (
    <Svg width="100%" height={174} viewBox="0 0 150 180" aria-hidden>
      <Defs>
        <SvgGradient id="top" x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#B9DCFF" />
        </SvgGradient>
        <SvgGradient id="left" x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#DDEEFF" />
          <Stop offset="1" stopColor="#8DBEFF" />
        </SvgGradient>
        <SvgGradient id="right" x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#B5DBFF" />
        </SvgGradient>
      </Defs>
      <Circle
        cx={100}
        cy={90}
        r={67}
        stroke="white"
        strokeWidth={0.7}
        opacity={0.16}
        fill="none"
      />
      <Circle
        cx={100}
        cy={90}
        r={50}
        stroke="white"
        strokeWidth={0.7}
        opacity={0.1}
        fill="none"
      />
      <Path
        d="M18 144c21-27 100 22 107-34 4-36-38-19-24-72"
        stroke="white"
        strokeWidth={1.5}
        strokeDasharray="3 5"
        strokeLinecap="round"
        opacity={0.45}
        fill="none"
      />
      <Ellipse cx={84} cy={148} rx={47} ry={9} fill="#071E75" opacity={0.24} />
      <G transform="rotate(-10 80 100)">
        <Path d="m30 78 51-27 51 27-51 28Z" fill="url(#top)" />
        <Path d="m30 78 51 28v50l-51-28Z" fill="url(#left)" />
        <Path d="m81 106 51-28v50l-51 28Z" fill="url(#right)" />
        <Path
          d="m53 66 51 27v24l13-7V86L66 59Z"
          fill="#347DF0"
          opacity={0.55}
        />
        <Path
          d="m30 78 51 28 51-28M81 106v50"
          stroke="white"
          strokeWidth={0.7}
          opacity={0.75}
          fill="none"
        />
        <Path
          d="m41 111 17 9m-17-3 10 5"
          stroke="#477FCA"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.75}
        />
      </G>
      <Circle cx={104} cy={31} r={15} fill="white" />
      <Path
        d="m98 31 4 4 8-9"
        fill="none"
        stroke="#007AFF"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={19} cy={146} r={4} fill="white" />
      <Circle cx={19} cy={146} r={8} stroke="white" opacity={0.3} fill="none" />
      <Path
        d="M29 40h6m-3-3v6m98 106h6m-3-3v6"
        stroke="white"
        opacity={0.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ParcelHero() {
  return (
    <View className="overflow-hidden rounded-[24px]">
      <LinearGradient
        colors={['#007AFF', '#1956EF', '#2739CE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 22 }}
      >
        <View className="absolute -right-2 bottom-2 top-3 w-[43%]">
          <ParcelScene />
        </View>
        <View className="w-[60%]">
          <Text className="mb-3 text-[10px] font-medium tracking-[1.5px] text-white/80">
            PARCEL DELIVERY
          </Text>
          <Text className="text-[27px] font-medium leading-[33px] tracking-[-0.8px] text-white">
            Parcels,{`\n`}sorted.
          </Text>
          <Text className="mt-2 text-[12px] leading-[19px] text-white/90">
            Send something out or get it brought to you.
          </Text>
        </View>
        <View className="mt-5 flex-row gap-2">
          <ScrollPressable
            accessibilityRole="button"
            accessibilityLabel="Send a parcel"
            onPress={() =>
              router.navigate({
                pathname: '/delivery/[service]',
                params: { service: 'parcel', direction: 'send' },
              })
            }
            className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-white px-2 py-3"
          >
            <Icon name="arrow" size={16} color="#145FE6" />
            <Text className="shrink text-center text-[12px] font-medium text-[#145FE6]">
              Send
            </Text>
          </ScrollPressable>
          <ScrollPressable
            accessibilityRole="button"
            accessibilityLabel="Receive a parcel"
            onPress={() =>
              router.navigate({
                pathname: '/delivery/[service]',
                params: { service: 'parcel', direction: 'receive' },
              })
            }
            className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-white/40 bg-[#1747CC] px-2 py-3"
          >
            <Icon name="back" size={16} color="#FFFFFF" />
            <Text className="shrink text-center text-[12px] font-medium text-white">
              Receive
            </Text>
          </ScrollPressable>
        </View>
      </LinearGradient>
    </View>
  );
}
