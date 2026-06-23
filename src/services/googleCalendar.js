import { gapi } from 'gapi-script';

const CLIENT_ID = '321553671318-j4t58fjg3omprfcnkpkh74hmkg2haukr.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBkt4fERtHYOH6DppVG6BSnk5eUCK2otFU';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

/**
 * Initialize Google API Client
 */
export const initGoogleClient = () => {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      }).then(() => {
        resolve();
      }).catch(err => {
        console.error("GAPI Init Error:", err);
        reject(err);
      });
    });
  });
};

/**
 * Handle Login / Authorization
 */
export const handleGoogleLogin = () => {
  return gapi.auth2.getAuthInstance().signIn();
};

/**
 * Handle Logout
 */
export const handleGoogleLogout = () => {
  return gapi.auth2.getAuthInstance().signOut();
};

/**
 * Check if user is signed in
 */
export const getIsSignedIn = () => {
  if (!gapi.auth2) return false;
  return gapi.auth2.getAuthInstance().isSignedIn.get();
};

/**
 * Sync Order to Google Calendar
 */
export const syncOrderToCalendar = async (order) => {
  if (!getIsSignedIn()) {
    await handleGoogleLogin();
  }

  const event = {
    'summary': `Rental: ${order.namaMobil} - ${order.email}`,
    'location': order.lokasiPenyerahan === 'Rumah' || order.lokasiPenyerahan === 'Titik Temu' 
                ? (order.titikTemuAddress || order.email) 
                : 'Garasi Cakra Lima Tujuh',
    'description': `Rental Mobil ${order.namaMobil} oleh ${order.email}.\nStatus: ${order.status}\nHubungi: ${order.noTelepon || 'N/A'}\nCatatan: ${order.catatan || '-'}`,
    'start': {
      'dateTime': new Date(order.tanggalMulai).toISOString(),
      'timeZone': 'Asia/Jakarta'
    },
    'end': {
      'dateTime': new Date(order.tanggalSelesai).toISOString(),
      'timeZone': 'Asia/Jakarta'
    },
    'reminders': {
      'useDefault': false,
      'overrides': [
        {'method': 'email', 'minutes': 24 * 60},
        {'method': 'popup', 'minutes': 60},
      ]
    }
  };

  try {
    const request = gapi.client.calendar.events.insert({
      'calendarId': 'primary',
      'resource': event
    });

    const response = await request.execute();
    return response;
  } catch (error) {
    console.error("Google Calendar Sync Error:", error);
    throw error;
  }
};
