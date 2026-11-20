import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import NotificationBridge from '../components/NotificationBridge';
import InAppNotificationAlert from '../components/InAppNotificationAlert';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationBridge />
      <InAppNotificationAlert>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#f2efe9' },
            animation: 'slide_from_right',
          }}
        />
      </InAppNotificationAlert>
    </AuthProvider>
  );
}
