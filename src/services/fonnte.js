import axios from "axios";

/**
 * Fonnte WhatsApp API Service
 * 
 * To use this service, replace the placeholder API_KEY with your actual Fonnte token.
 */

const API_KEY = "vSuYq1vE5C7D5MgrmiGX"; // Placeholder
const BASE_URL = "https://api.fonnte.com/send";

export const sendWhatsApp = async (target, message) => {
  if (API_KEY === "vSuYq1vE5C7D5MgrmiGX" || !API_KEY) {
    console.warn("Fonnte API Key is missing or default. SMS NOT SENT.");
    console.log("Mocking WhatsApp to:", target);
    console.log("Message:", message);
    return { status: false, msg: "API Key still placeholder" };
  }

  try {
    const response = await axios.post(
      BASE_URL,
      {
        target: target,
        message: message,
        countryCode: "62", // Default Indonesia
      },
      {
        headers: {
          Authorization: API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Fonnte API Error:", error.response?.data || error.message);
    throw error;
  }
};
