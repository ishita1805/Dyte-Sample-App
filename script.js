import { defineCustomElements } from '@dytesdk/ui-kit/loader';
import { sendNotification } from '@dytesdk/ui-kit';
import DyteClient from '@dytesdk/web-core';
defineCustomElements();

// Define variables
const handRaise = document.getElementById('dyte-controlbar-button');
const searchParams = new URL(window.location.href).searchParams;
let m;
const authToken = searchParams.get('authToken');
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
      li.onclick = () => {
        // Check if user has the correct permissions
        if (!m.self.permissions.canAllowParticipantAudio) return;
        m.participants.broadcastMessage('allowed-to-speak', payload);
        sendNotification({
          id: new Date().getTime().toString(),
          message: `${payload.name} was allowed to speak`,
          duration: 3000,
        }, 'message')
      }
      document.getElementById('hand-raise-list').appendChild(li);
    } else {
      if (type === 'allowed-to-speak' && payload.id === m.self.id) {
        // Toggle button for selected participant
        handRaise.classList.toggle('hand-raise-button');
      }
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
  m.participants.broadcastMessage(handRaise.classList.contains('hand-raise-button') ? 'hand-raised' : 'hand-unraised', { 
    id: m.self.id,
    name: m.self.name,
  })
  // Send Notification
  sendNotification({
    id: new Date().getTime().toString(),
    message: `Hand Raised by ${m.self.name}`,
    duration: 3000,
  }, 'message')
}
