const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const session = require("express-session");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "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",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:5000/auth/callback"
);

// Serve Main Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "HSAweb.html"));
});

// Handle Google OAuth Login
app.get("/auth/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });

  console.log("Auth URL:", authUrl);
  console.log("Generated State:", state);
  res.redirect(authUrl);
});

// Handle Google OAuth Callback
app.get("/auth/callback", async (req, res) => {
  console.log("Callback URL hit!");
  const { code, state } = req.query;
  console.log("Received state:", state);

  // Verify state to prevent CSRF attacks
  if (state !== req.session.oauthState) {
    return res.status(400).send("Invalid state parameter");
  }
  delete req.session.oauthState;

  try {
    // Exchange the authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens received:", tokens);
    req.session.tokens = tokens;
    oauth2Client.setCredentials(tokens);

    // Ensure the oauth2Client is authenticated
    if (!oauth2Client.credentials.access_token) {
      throw new Error("OAuth2 client is not authenticated");
    }

    // Get the authenticated user's info
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    console.log("User info:", userInfo.data);

    if (userInfo.data.email !== "osahsaclub@gmail.com") {
      return res.status(403).send("Unauthorized account");
    }

    // Redirect to events page after successful login
    res.redirect("/events.html");
  } catch (error) {
    console.error("OAuth callback error:", error.message);
    console.error("Error details:", error);
    res.status(500).send("OAuth callback failed. Please try again.");
  }
});

// Check if the user is authenticated
app.get("/api/check-auth", (req, res) => {
  const tokens = req.session.tokens;
  if (tokens) {
    res.status(200).json({ authenticated: true, tokens });
  } else {
    res.status(200).json({ authenticated: false });
  }
});

// API to Create Calendar Events
app.post("/api/events", async (req, res) => {
  const tokens = req.session.tokens;
  if (!tokens) return res.status(401).send("Not authenticated");
  oauth2Client.setCredentials(tokens);

  const { title, description, startTime, endTime } = req.body;

  // Define the event structure
  const event = {
    summary: title,
    description,
    start: { dateTime: startTime, timeZone: "America/Edmonton" },
    end: { dateTime: endTime, timeZone: "America/Edmonton" },
  };

  console.log("Event object:", event); // Debug

  try {
    const calendar = google.calendar("v3");

    // Create the calendar event
    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: "primary",
      requestBody: event,
    });

    console.log("Event created:", response.data); // Debug

    // Respond with the event details
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error creating event:", error.message);
    console.error("Error details:", error); // Debug
    res.status(500).send("Failed to create event. Please try again.");
  }
});

app.delete("/api/events/delete", async (req, res) => {
  const tokens = req.session.tokens;
  if (!tokens) return res.status(401).send("Not authenticated");
  oauth2Client.setCredentials(tokens);

  const { id } = req.query; // Get the event ID from the query parameters

  try {
      const calendar = google.calendar("v3");

      // Delete the event by ID
      await calendar.events.delete({
          auth: oauth2Client,
          calendarId: "primary",
          eventId: id,
      });

      res.status(200).send("Event deleted successfully");
  } catch (error) {
      console.error("Error deleting event:", error.message);
      console.error("Error details:", error);
      res.status(500).send("Failed to delete event. Please try again.");
  }
});

// API to Update Calendar Events by Title
app.put("/api/events/update", async (req, res) => {
  const tokens = req.session.tokens;
  if (!tokens) return res.status(401).send("Not authenticated");
  oauth2Client.setCredentials(tokens);

  const { id } = req.query; // Get the event ID from the query parameters
  const { title, description, startTime, endTime } = req.body;

  try {
      const calendar = google.calendar("v3");

      // Fetch the existing event to preserve unchanged fields
      const existingEvent = await calendar.events.get({
          auth: oauth2Client,
          calendarId: "primary",
          eventId: id,
      });

      // Update the event
      const updatedEvent = {
          summary: title || existingEvent.data.summary,
          description: description || existingEvent.data.description,
          start: {
              dateTime: startTime || existingEvent.data.start.dateTime,
              timeZone: "America/Edmonton",
          },
          end: {
              dateTime: endTime || existingEvent.data.end.dateTime,
              timeZone: "America/Edmonton",
          },
      };

      const response = await calendar.events.update({
          auth: oauth2Client,
          calendarId: "primary",
          eventId: id,
          requestBody: updatedEvent,
      });

      console.log("Event updated:", response.data); // Debugging line
      res.status(200).json(response.data);
  } catch (error) {
      console.error("Error updating event:", error.message);
      console.error("Error details:", error);
      res.status(500).send("Failed to update event. Please try again.");
  }
});

// API to Search Calendar Events by Title (for logged-in users)
app.get("/api/events/search", async (req, res) => {
  const tokens = req.session.tokens;
  if (!tokens) return res.status(401).send("Not authenticated");
  oauth2Client.setCredentials(tokens);

  try {
      const calendar = google.calendar("v3");

      // Fetch all events
      const response = await calendar.events.list({
          auth: oauth2Client,
          calendarId: "primary",
          timeMin: new Date().toISOString(), // Only fetch future events
          maxResults: 50, // Limit the number of results
          singleEvents: true,
          orderBy: "startTime",
      });

      const events = response.data.items;
      console.log("Events found:", events); // Debugging line
      res.status(200).json(events);
  } catch (error) {
      console.error("Error searching events:", error.message);
      console.error("Error details:", error);
      res.status(500).send("Failed to search events. Please try again.");
  }
});

// New Public Endpoint: Fetch events accessible to all users
app.get("/api/events/public", async (req, res) => {
  try {
      const calendar = google.calendar({
          version: "v3",
          auth: process.env.GOOGLE_API_KEY, // Use the API key for public calendar access
      });

      // Fetch all events from the public calendar
      const response = await calendar.events.list({
          calendarId: "osahsaclub@gmail.com", // Replace with your public calendar ID
          timeMin: new Date().toISOString(), // Only fetch future events
          maxResults: 50, // Limit the number of results
          singleEvents: true,
          orderBy: "startTime",
      });

      const events = response.data.items;
      console.log("Public events found:", events); // Debugging line
      res.status(200).json(events);
  } catch (error) {
      console.error("Error fetching public events:", error.message);
      console.error("Error details:", error);
      res.status(500).send("Failed to fetch public events. Please try again.");
  }
});

// API to Log Out
app.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Failed to log out");
    }
    res.redirect("/");
  });
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));