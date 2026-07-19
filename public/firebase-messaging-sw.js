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
