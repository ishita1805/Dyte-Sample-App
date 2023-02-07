import { defineCustomElements } from '@dytesdk/ui-kit/loader';
import { sendNotification } from '@dytesdk/ui-kit';
import DyteClient from '@dytesdk/web-core';
defineCustomElements();

// Define variables
const handRaise = document.getElementById('dyte-controlbar-button');
const searchParams = new URL(window.location.href).searchParams;
let m;
const authToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE1NTdmOTQ5LWRkMGYtNDZkMy1iNjJlLTczNDhiMTcxNGNkYiIsImxvZ2dlZEluIjp0cnVlLCJpYXQiOjE2NzU3NTE4MzYsImV4cCI6MTY4NDM5MTgzNn0.Zr1l9nzGbhl5a4HjDX9Bjt26K1P0R6b_RasuFIvhtUEPGKipsI3SRIojMOlhrGkWKZ1t3d9qJNndeKN1uHcWYZd_TGeBZAKA-JID8woMiFG8D0jeL2hVQsU9O_pMLeHUHkFt_gO_6lq5YT9WppDGgTrvfYw2h2R15nuQQplz8GA`;
const roomName = searchParams.get('roomName') || 'eqdqcp-rrrsqm';

if (!authToken) {
  alert(
    "An authToken wasn't passed, please pass an authToken in the URL query to join a meeting."
  );
}

function passMeetingProp(meeting) {
    const els = document.getElementsByClassName('dyte');
    els[0].config = meeting.self.config;
    for (const el of els) {
      el.meeting = meeting;
    }
}

// Initialize a meeting
DyteClient.init({
  authToken,
  defaults: {
    audio: false,
    video: false,
  },
  apiBase: 'https://api.staging.dyte.in',
  roomName,
}).then((meeting) => {
  console.log(meeting.self.config);
  passMeetingProp(meeting);
  m = meeting;
  document.getElementById('my-audio').meeting = meeting;
  document.getElementById('my-notifications').meeting = meeting;
  document.getElementById('my-notifications').config = {
    notifications: ['chat', 'participant_joined', 'participant_left'],
    notification_sounds: ['chat', 'participant_joined', 'participant_left'],
    participant_joined_sound_notification_limit: 10,
    participant_chat_message_sound_notification_limit: 10,
  };
  // Manage hand raise
  m.participants.on('broadcastedMessage', ({type, payload}) => {
    if (type === 'hand-raised') {
      const li = document.createElement('li');
      li.id = payload.id;
      li.innerText = payload.name;
      document.getElementById('hand-raise-list').appendChild(li);
    } else {
      const li = document.getElementById(payload.id);
      document.getElementById('hand-raise-list').removeChild(li);
    }

    if (document.getElementById('hand-raise-list').childNodes.length > 0) {
      document.getElementById('empty-message').style.display = 'none';
    } else {
      document.getElementById('empty-message').style.display = 'flex';
    }
  })
  meeting.joinRoom();
});

// Listen for state updates
document.body.addEventListener('dyteStateUpdate', ({detail}) => {
  console.log(detail.activeSidebar);
  if (detail.activeSidebar) {
    document.getElementById('dyte-sidebar-el').style.display = 'flex';
    document.getElementById('dyte-handraise-el').style.display = 'none';
  } else {
    document.getElementById('dyte-sidebar-el').style.display = 'none';
    document.getElementById('dyte-handraise-el').style.display = 'flex';
  }
})

// Hand Raise
handRaise.addEventListener('click', handleHandRaise)
function handleHandRaise() {
  // Toggle UI
  handRaise.classList.toggle('hand-raise-button');
  // Broadcast Message
  const key = handRaise.classList.contains('hand-raise-button') ? 'hand-raised' : 'hand-unraised'
  m.participants.broadcastMessage(key, { 
    id: m.self.id,
    name: m.self.name,
  })
  // Send Notification
  if (key === 'hand-unraised') return;
  sendNotification({
    id: new Date().getTime().toString(),
    message: `Hand Raised by ${m.self.name}`,
    duration: 3000,
  }, 'message')
}

