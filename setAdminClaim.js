const admin = require('firebase-admin');

// Replace with the path to your service account key JSON file
const serviceAccount = require('/home/danang/Documents/cobacoba/account-key/rental-mobil-746c9-firebase-adminsdk-fbsvc-944ec18dff.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Replace with the UID of the user you want to make admin
const uid = 'P4MZJ9tRpRg2Yvl7QO8zYEAjB5V2';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Custom claim 'admin' set for user ${uid}`);
    process.exit();
  })
  .catch(error => {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  });
