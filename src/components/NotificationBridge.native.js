import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getProjectId = () => (
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  || Constants.easConfig?.projectId
  || Constants.expoConfig?.extra?.eas?.projectId
);

export default function NotificationBridge() {
  const router = useRouter();
  const { user, token } = useAuth();
  const expoTokenRef = useRef(null);
  const authTokenRef = useRef(null);

  useEffect(() => {
    const openNotification = (response) => {
      const url = response?.notification?.request?.content?.data?.url;
      if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
        router.push(url);
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then(openNotification)
      .catch((error) => console.warn(`Could not read the last notification response: ${error.message}`));
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    let active = true;

    const unregisterPreviousDevice = async () => {
      if (token || !expoTokenRef.current || !authTokenRef.current) return;
      try {
        await apiRequest('/notifications/push-token', {
          method: 'DELETE',
          token: authTokenRef.current,
          body: JSON.stringify({ token: expoTokenRef.current }),
        });
      } catch (error) {
        console.warn(`Could not unregister this device's push token: ${error.message}`);
      } finally {
        expoTokenRef.current = null;
        authTokenRef.current = null;
      }
    };

    const registerDevice = async () => {
      if (!user || !token || !['android', 'ios'].includes(Platform.OS)) {
        await unregisterPreviousDevice();
        return;
      }
      const projectId = getProjectId();
      if (!projectId) {
        console.warn('Push notifications need an EAS project ID. Set EXPO_PUBLIC_EAS_PROJECT_ID or link the app with EAS.');
        return;
      }

      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('booking-updates', {
            name: 'Booking updates',
            importance: AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          });
        }
        let permissions = await Notifications.getPermissionsAsync();
        if (!permissions.granted) permissions = await Notifications.requestPermissionsAsync();
        if (!permissions.granted || !active) return;

        const result = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!active) return;
        const pushToken = result.data;
        await apiRequest('/notifications/push-token', {
          method: 'POST',
          token,
          body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
        });
        expoTokenRef.current = pushToken;
        authTokenRef.current = token;
      } catch (error) {
        console.warn(`Could not register push notifications: ${error.message}`);
      }
    };

    registerDevice();
    return () => { active = false; };
  }, [user, token]);

  return null;
}
