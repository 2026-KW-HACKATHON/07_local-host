import { Image } from 'react-native';
import { customerColors as c } from '../theme/customerTokens';
import { px } from '../theme/tokens';

const assets = {
  search: require('../../assets/icons/search.png'),
  point: require('../../assets/icons/point.png'),
  marketing: require('../../assets/icons/marketing.png'),
  home: require('../../assets/icons/home.png'),
  person: require('../../assets/icons/person.png'),
  data: require('../../assets/icons/data.png'),
};
export type AppIconName = keyof typeof assets;

// These PNGs render the supplied SVGs (including the profile alpha mask) at 4x.
// Keep the source proportions; tint only controls active/inactive menu colors.
export function AppIcon({ name, size = 28, color = c.black }: {
  name: AppIconName; size?: number; color?: string;
}) {
  const side = px(size);
  return <Image accessible={false} source={assets[name]} resizeMode="contain"
    style={{ width: side, height: side, tintColor: color }} />;
}
