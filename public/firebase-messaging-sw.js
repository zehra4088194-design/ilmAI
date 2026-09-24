self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = event.notification?.data?.FCM_MSG?.data?.link || event.notification?.data?.link || '/dashboard';
  const destination = new URL(rawLink, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const appWindow = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (appWindow) {
        return appWindow.focus().then(() => appWindow.navigate(destination));
      }
      return clients.openWindow(destination);
    })
  );
});

/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const config = Object.fromEntries(
  ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
    .map((key) => [key, params.get(key)])
    .filter((entry) => entry[1])
);

if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  firebase.messaging();
}
