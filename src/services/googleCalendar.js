import { gapi } from "gapi-script";

/**
 * Thin Google Calendar transport.
 *
 * Owns nothing but the gapi session and the four REST verbs the sync engine
 * needs (init/sign-in, upsert, delete, list). Every decision about *what* to
 * push lives in `utils/calendarSync.js`; the queueing, Firestore listeners and
 * local state live in `services/calendarSync.js`.
 *
 * Credentials fall back to the values configured in the Google Cloud console;
 * setting `REACT_APP_GOOGLE_*` at build time overrides them, and
 * `REACT_APP_GOOGLE_CALENDAR_ID` can point at a calendar other than the
 * signed-in admin's primary one.
 */

const CLIENT_ID =
  process.env.REACT_APP_GOOGLE_CLIENT_ID ||
  "321553671318-j4t58fjg3omprfcnkpkh74hmkg2haukr.apps.googleusercontent.com";
const API_KEY =
  process.env.REACT_APP_GOOGLE_API_KEY ||
  "AIzaSyBkt4fERtHYOH6DppVG6BSnk5eUCK2otFU";
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

export const CALENDAR_ID =
  process.env.REACT_APP_GOOGLE_CALENDAR_ID || "primary";

/** Resolved once; a failed init clears itself so a retry can re-run it. */
let initPromise = null;

export const initGoogleClient = () => {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      initPromise = null;
      reject(new Error("Google API gagal dimuat (timeout). Periksa koneksi Anda."));
    }, 20000);

    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES,
        })
        .then((v) => {
          clearTimeout(timeout);
          resolve(v);
        })
        .catch((err) => {
          clearTimeout(timeout);
          initPromise = null;
          reject(err);
        });
    });
  });
  return initPromise;
};

export const handleGoogleLogin = () => gapi.auth2.getAuthInstance().signIn();

export const handleGoogleLogout = () => gapi.auth2.getAuthInstance().signOut();

export const getIsSignedIn = () => {
  if (!gapi.auth2) return false;
  return gapi.auth2.getAuthInstance().isSignedIn.get();
};

const isNotFound = (err) => {
  const code = err?.status ?? err?.code ?? err?.result?.code ?? err?.result?.error?.code;
  return Number(code) === 404;
};

/**
 * Insert when there is no known event id, patch otherwise.
 *
 * A 404 on patch means the event was deleted straight from Google Calendar —
 * the honest response is to re-create it rather than to fail the sync round.
 */
export const upsertEvent = async (eventId, resource) => {
  if (eventId) {
    try {
      return await gapi.client.calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        resource,
      }).execute();
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
  return gapi.client.calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource,
  }).execute();
};

/** A missing event is the desired end state — treat 404 as success. */
export const deleteEvent = async (eventId) => {
  if (!eventId) return;
  try {
    await gapi.client.calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
    }).execute();
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
};

/**
 * Every event this app has ever pushed, inside `[timeMin, timeMax]`.
 *
 * Filtered server-side on the private `c57sync=1` marker so personal events
 * never enter the response. Used once per session to *adopt* events created
 * on another device or before local state existed — without it, connecting a
 * fresh browser would re-create everything as duplicates.
 */
export const listSyncEvents = async (timeMin, timeMax) => {
  const items = [];
  let pageToken;
  do {
    const page = await gapi.client.calendar.events
      .list({
        calendarId: CALENDAR_ID,
        timeMin,
        timeMax,
        maxResults: 2500,
        singleEvents: false,
        privateExtendedProperty: ["c57sync=1"],
        pageToken,
      })
      .execute();
    if (page.items) items.push(...page.items);
    pageToken = page.nextPageToken;
  } while (pageToken && items.length < 10000);
  return items;
};
