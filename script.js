const API_URL = "/api/meetings/today";
const FALLBACK_URL = "./mock-meetings.json";
const REFRESH_INTERVAL = 30000;

const roomNameEl = document.getElementById("roomName");
const brandingVideoEl = document.querySelector(".branding-panel__video");
const syncIndicatorEl = document.getElementById("syncIndicator");
const currentMeetingCardEl = document.getElementById("currentMeetingCard");
const currentMeetingTitleEl = document.getElementById("currentMeetingTitle");
const currentMeetingOrganizerEl = document.getElementById("currentMeetingOrganizer");
const currentMeetingTimeEl = document.getElementById("currentMeetingTime");
const currentMeetingStatusEl = document.getElementById("currentMeetingStatus");
const upcomingListEl = document.getElementById("upcomingList");
const upcomingCountEl = document.getElementById("upcomingCount");
const lastUpdatedEl = document.getElementById("lastUpdated");
const upcomingTemplate = document.getElementById("upcomingMeetingTemplate");

let refreshTimer = null;

function startBrandingVideo() {
  if (!brandingVideoEl) {
    return;
  }

  brandingVideoEl.muted = true;
  brandingVideoEl.defaultMuted = true;
  brandingVideoEl.playsInline = true;

  const playAttempt = brandingVideoEl.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch((error) => {
      console.warn("Background video autoplay was blocked.", error);
    });
  }
}

function formatMeetingTime(startTime, endTime) {
  if (!startTime && !endTime) {
    return "Time not provided";
  }

  if (!endTime) {
    return startTime;
  }

  return `${startTime} - ${endTime}`;
}

function buildOrganizerLabel(organizer) {
  return organizer ? `Organizer: ${organizer}` : "Organizer not provided";
}

function setUpdateState(isUpdating, message) {
  document.body.classList.toggle("is-updating", isUpdating);
  syncIndicatorEl.textContent = message;
}

function updateRoomName(meetings) {
  const roomMeeting = meetings.find((meeting) => meeting.room_name);
  if (roomMeeting?.room_name) {
    roomNameEl.textContent = roomMeeting.room_name;
  }
}

function renderCurrentMeeting(meetings) {
  const ongoingMeeting = meetings.find((meeting) => meeting.status === "ongoing");

  if (!ongoingMeeting) {
    currentMeetingTitleEl.textContent = "Available";
    currentMeetingOrganizerEl.textContent = "No ongoing meeting";
    currentMeetingTimeEl.textContent = "Open for booking";
    currentMeetingStatusEl.textContent = "Available";
    currentMeetingStatusEl.className = "meeting-status meeting-status--available";
    currentMeetingCardEl.classList.remove("meeting-card--active");
    return;
  }

  currentMeetingTitleEl.textContent = ongoingMeeting.meeting_title || "Untitled meeting";
  currentMeetingOrganizerEl.textContent = buildOrganizerLabel(ongoingMeeting.organizer);
  currentMeetingTimeEl.textContent = formatMeetingTime(
    ongoingMeeting.start_time,
    ongoingMeeting.end_time
  );
  currentMeetingStatusEl.textContent = "Ongoing";
  currentMeetingStatusEl.className = "meeting-status meeting-status--ongoing";
  currentMeetingCardEl.classList.add("meeting-card--active");
}

function createEmptyUpcomingState() {
  const emptyState = document.createElement("div");
  emptyState.className = "upcoming-item upcoming-item--empty";
  emptyState.textContent = "No upcoming meetings scheduled.";
  return emptyState;
}

function renderUpcomingMeetings(meetings) {
  const upcomingMeetings = meetings
    .filter((meeting) => meeting.status === "upcoming")
    .slice(0, 3);

  upcomingListEl.replaceChildren();
  upcomingCountEl.textContent = `${upcomingMeetings.length} scheduled`;

  if (upcomingMeetings.length === 0) {
    upcomingListEl.appendChild(createEmptyUpcomingState());
    return;
  }

  const fragment = document.createDocumentFragment();

  upcomingMeetings.forEach((meeting, index) => {
    const upcomingNode = upcomingTemplate.content.firstElementChild.cloneNode(true);
    upcomingNode.style.animationDelay = `${index * 120}ms`;
    upcomingNode.querySelector(".upcoming-item__start").textContent = meeting.start_time || "--";
    upcomingNode.querySelector(".upcoming-item__end").textContent = meeting.end_time || "";
    upcomingNode.querySelector(".upcoming-item__title").textContent =
      meeting.meeting_title || "Untitled meeting";
    upcomingNode.querySelector(".upcoming-item__organizer").textContent =
      buildOrganizerLabel(meeting.organizer);
    fragment.appendChild(upcomingNode);
  });

  upcomingListEl.appendChild(fragment);
}

function renderMeetings(meetings) {
  updateRoomName(meetings);
  renderCurrentMeeting(meetings);
  renderUpcomingMeetings(meetings);
  lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

async function fetchMeetings() {
  setUpdateState(true, "Syncing...");

  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Primary API unavailable, falling back to mock data.", error);
    const fallbackResponse = await fetch(FALLBACK_URL, { cache: "no-store" });
    if (!fallbackResponse.ok) {
      throw new Error(`Fallback request failed with status ${fallbackResponse.status}`);
    }
    return fallbackResponse.json();
  } finally {
    setUpdateState(false, "Live");
  }
}

async function refreshMeetings() {
  try {
    const meetings = await fetchMeetings();
    renderMeetings(Array.isArray(meetings) ? meetings : []);
  } catch (error) {
    console.error("Unable to load meetings.", error);
    renderMeetings([]);
    syncIndicatorEl.textContent = "Offline";
    lastUpdatedEl.textContent = "Last updated: Unable to fetch data";
  }
}

function startAutoRefresh() {
  startBrandingVideo();
  refreshMeetings();
  refreshTimer = window.setInterval(refreshMeetings, REFRESH_INTERVAL);
}

window.addEventListener("load", startBrandingVideo);

window.addEventListener("beforeunload", () => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
});

startAutoRefresh();
