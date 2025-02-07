window.onscroll = function() {
    var navbar = document.getElementById("nav");
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
};

//script for events.html: 

// Check if the user is logged in when the page loads (only for the Event Management Console)
async function checkAuth() {
    const response = await fetch("/api/check-auth");
    const data = await response.json();

    if (data.authenticated) {
        // Show the event management console
        document.getElementById("eventbg").style.display = "block";
        // Show the logout link
        document.getElementById("logout-link").style.display = "block";
        // Hide the login link
        document.getElementById("login-link").style.display = "none";
    }
}

// Call the checkAuth function when the page loads
window.onload = checkAuth;

// Event form submission handler
document.getElementById("event-form").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    // Get the raw date-time values from the form inputs
    const startTimeRaw = document.getElementById("startTime").value;
    const endTimeRaw = document.getElementById("endTime").value;

    // Append ":00" to include seconds in the ISO 8601 format
    const startTime = `${startTimeRaw}:00`;
    const endTime = `${endTimeRaw}:00`;

    // Create an event object with the data from the form
    const event = {
        title: document.getElementById("title").value, // Get the event title
        description: document.getElementById("description").value, // Get the event description
        startTime: startTime, // Use the formatted start time
        endTime: endTime, // Use the formatted end time
    };

    // Send a POST request to the server to create the event
    const response = await fetch("/api/events", {
        method: "POST", // Specify the HTTP method
        headers: { "Content-Type": "application/json" }, // Set the content type to JSON
        body: JSON.stringify(event), // Convert the event object to a JSON string
    });

    // Check if the request was successful
    if (response.ok) {
        alert("Event created successfully!"); // Notify the user of success
        location.reload(); // Reload the page to reflect the new event
    } else {
        alert("Failed to create event"); // Notify the user of failure
    }
});

// Helper function for fuzzy typo matching
function fuzzyMatch(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    let queryIndex = 0;
    for (let i = 0; i < textLower.length; i++) {
        if (textLower[i] === queryLower[queryIndex]) {
            queryIndex++;
            if (queryIndex === queryLower.length) return true;
        }
    }
    return false;
}

// Live search for delete event
document.getElementById("search-delete").addEventListener("input", async (e) => {
    const searchQuery = e.target.value.toLowerCase(); // Make search case-insensitive
    const resultsDiv = document.getElementById("search-results-delete");

    console.log("Search query:", searchQuery); // Debugging line

    if (searchQuery.length < 2) {
        resultsDiv.innerHTML = "";
        return;
    }

    try {
        const response = await fetch("/api/events/search");
        const events = await response.json();

        // Split the search query into keywords
        const keywords = searchQuery.split(" ");

        // Filter events based on fuzzy matching and keywords
        const filteredEvents = events.filter(event =>
            keywords.some(keyword => fuzzyMatch(event.summary, keyword))
        );

        console.log("Filtered search results:", filteredEvents); // Debugging line

        // Display filtered events with dates
        resultsDiv.innerHTML = filteredEvents.map(event => `
            <div class="search-result" data-id="${event.id}">
                ${event.summary} (${new Date(event.start.dateTime).toLocaleDateString()})
            </div>
        `).join("");

        // Add click event to search results
        document.querySelectorAll("#search-results-delete .search-result").forEach(result => {
            result.addEventListener("click", () => {
                const eventId = result.getAttribute("data-id"); // Get the event ID
                const eventTitle = result.textContent.split(" (")[0]; // Get the event title
                document.getElementById("search-delete").value = eventTitle; // Populate the search field
                document.getElementById("delete-event-id").value = eventId; // Store the event ID in a hidden field
                resultsDiv.innerHTML = ""; // Clear the search results
            });
        });
    } catch (error) {
        console.error("Error fetching search results:", error); // Debugging line
    }
});

// Delete event form submission handler
document.getElementById("delete-event-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventId = document.getElementById("delete-event-id").value; // Get the event ID from the hidden field

    if (!eventId) {
        alert("Please select an event from the search results.");
        return;
    }

    const response = await fetch(`/api/events/delete?id=${encodeURIComponent(eventId)}`, {
        method: "DELETE",
    });

    if (response.ok) {
        alert("Event deleted successfully!");
        location.reload()
    } else {
        alert("Failed to delete event");
    }
});

// Live search for update event
document.getElementById("search-update").addEventListener("input", async (e) => {
    const searchQuery = e.target.value.toLowerCase(); // Make search case-insensitive
    const resultsDiv = document.getElementById("search-results-update");

    console.log("Search query:", searchQuery); // Debugging line

    if (searchQuery.length < 2) {
        resultsDiv.innerHTML = "";
        return;
    }

    try {
        const response = await fetch("/api/events/search");
        const events = await response.json();

        // Split the search query into keywords
        const keywords = searchQuery.split(" ");

        // Filter events based on fuzzy matching and keywords
        const filteredEvents = events.filter(event =>
            keywords.some(keyword => fuzzyMatch(event.summary, keyword))
        );

        console.log("Filtered search results:", filteredEvents); // Debugging line

        // Display filtered events with dates
        resultsDiv.innerHTML = filteredEvents.map(event => `
            <div class="search-result" data-id="${event.id}">
                ${event.summary} (${new Date(event.start.dateTime).toLocaleDateString()})
            </div>
        `).join("");

        // Add click event to search results
        document.querySelectorAll("#search-results-update .search-result").forEach(result => {
            result.addEventListener("click", () => {
                const eventId = result.getAttribute("data-id"); // Get the event ID
                const eventTitle = result.textContent.split(" (")[0]; // Get the event title
                document.getElementById("search-update").value = eventTitle; // Populate the search field
                document.getElementById("update-event-id").value = eventId; // Store the event ID in a hidden field
                resultsDiv.innerHTML = ""; // Clear the search results
            });
        });
    } catch (error) {
        console.error("Error fetching search results:", error); // Debugging line
    }
});

// Update event form submission handler
document.getElementById("update-event-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventId = document.getElementById("update-event-id").value; // Get the event ID from the hidden field
    const newTitle = document.getElementById("update-title").value;
    const newDescription = document.getElementById("update-description").value;
    const newStartTime = document.getElementById("update-startTime").value;
    const newEndTime = document.getElementById("update-endTime").value;

    if (!eventId) {
        alert("Please select an event from the search results.");
        return;
    }

    if (!newTitle && !newDescription && !newStartTime && !newEndTime) {
        alert("At least one field must be filled to update the event.");
        return;
    }

    const event = {
        title: newTitle,
        description: newDescription,
        startTime: newStartTime ? `${newStartTime}:00` : null,
        endTime: newEndTime ? `${newEndTime}:00` : null,
    };

    const response = await fetch(`/api/events/update?id=${encodeURIComponent(eventId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
    });

    if (response.ok) {
        alert("Event updated successfully!");
        location.reload()
    } else {
        alert("Failed to update event");
    }
});

// Fetch events from the server (accessible to everyone)
async function fetchEvents() {
    try {
        const response = await fetch("/api/events/public");
        const events = await response.json();
        console.log("Fetched events:", events); // Debugging line
        return events;
    } catch (error) {
        console.error("Error fetching events:", error); // Debugging line
        return [];
    }
}

// Display events in the quick view
function displayEvents(events) {
    console.log("Displaying events:", events); // Debugging line
    const eventsList = document.querySelector(".events-list");
    if (events.length === 0) {
        eventsList.innerHTML = `<div class="no-results">No results found.</div>`;
    } else {
        eventsList.innerHTML = events.map(event => 
            `<div class="event-item">
                <h3>${event.summary}</h3>
                <p>Date: ${new Date(event.start.dateTime).toLocaleDateString()}</p>
                <p>Time: ${new Date(event.start.dateTime).toLocaleTimeString()}</p>
            </div>`
        ).join("");
    }
}

// Insertion Sort for events
function insertionSort(events, sortBy) {
    for (let i = 1; i < events.length; i++) {
        const current = events[i]; // Set current event to the current index
        let j = i - 1; //element just before current element

        while (j >= 0 && ( // Sort by date with while loop by shifting elements greater than current value
            (sortBy === "date" && new Date(events[j].start.dateTime) > new Date(current.start.dateTime)) ||
            (sortBy === "name" && events[j].summary.localeCompare(current.summary) > 0)
        )) {
            events[j + 1] = events[j];
            j--;
        }
        events[j + 1] = current;
    }
    return events;
}

// Filter events based on search query (linear search with fuzzy matching)
function filterEvents(events, query) {
    const queryLower = query.toLowerCase(); //user input/query is case insensitive
    const filtered = events.filter(event =>
        fuzzyMatch(event.summary, queryLower) || // Fuzzy match event title
        fuzzyMatch(event.description || "", queryLower) || // Fuzzy match event description
        fuzzyMatch(new Date(event.start.dateTime).toLocaleDateString(), queryLower) // Fuzzy match event date
    );
    return filtered.length > 0 ? filtered : -1; // Return -1 if no results
}

// Initialize the quick view (accessible to everyone)
async function initQuickView() {
    console.log("Initializing Quick View..."); // Debugging line
    const events = await fetchEvents();

    // Default view: month
    let filteredEvents = events;

    // Function to update the view based on the selected option (month or week)
    const updateView = () => {
        const view = document.querySelector(".view-options button.active")?.id || "view-month";
        if (view === "view-month") {
            // Show all events for the month
            filteredEvents = events;
        } else if (view === "view-week") {
            // Show events for the current week
            const now = new Date();
            const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            filteredEvents = events.filter(event => {
                const eventDate = new Date(event.start.dateTime);
                return eventDate >= now && eventDate <= oneWeekLater;
            });
        }
        console.log("Filtered events:", filteredEvents); // Debugging line
        displayEvents(filteredEvents);
    };

    // Event listeners for view options
    document.querySelectorAll(".view-options button").forEach(button => {
        button.addEventListener("click", () => {
            // Remove active class from all buttons
            document.querySelectorAll(".view-options button").forEach(btn => btn.classList.remove("active"));
            // Add active class to the clicked button
            button.classList.add("active");
            // Update the view
            updateView();
        });
    });

    // Event listener for sorting
    document.getElementById("sort-by").addEventListener("change", (e) => {
        const sortBy = e.target.value;
        const sortedEvents = insertionSort([...filteredEvents], sortBy); // Use Insertion Sort
        displayEvents(sortedEvents);
    });

    // Event listener for search
    document.getElementById("quick-search").addEventListener("input", (e) => {
        const query = e.target.value;
        const filtered = filterEvents(filteredEvents, query);
        if (filtered === -1) {
            displayEvents([]); // Show "No results found" message
        } else {
            displayEvents(filtered);
        }
    });

    // Set default view to month and display events
    document.getElementById("view-month").classList.add("active");
    updateView();   
}

// Attach event listeners to the window's load event
window.addEventListener("load", () => {
    console.log("Page loaded, initializing Quick View and checking auth..."); // Debugging line
    initQuickView(); // Initialize the quick view for all users
    checkAuth(); // Check authentication for the event management console (only for logged-in users)
});