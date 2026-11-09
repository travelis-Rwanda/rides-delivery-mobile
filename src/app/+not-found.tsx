import { router } from 'expo-router';

import {
  Button,
  EmptyState,
  Header,
  Page,
  PageScroll,
} from '../components/ui/primitives';

export default function NotFoundScreen() {
  return (
    <Page>
      <Header title="Page not found" />
      <PageScroll>
        <EmptyState
          title="A small detour"
          description="This page isn’t available. Let’s get you back to your delivery services."
        >
          <Button
            label="Back to services"
            onPress={() => router.replace('/')}
          />
        </EmptyState>
      </PageScroll>
    </Page>
  );
}
