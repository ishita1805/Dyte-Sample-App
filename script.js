import { defineCustomElements } from '@dytesdk/ui-kit/loader';
import { sendNotification } from '@dytesdk/ui-kit';
import DyteClient from '@dytesdk/web-core';
defineCustomElements();

// Define variables
const handRaise = document.getElementById('dyte-controlbar-button');
const searchParams = new URL(window.location.href).searchParams;
let m;

/**
 * A room name is generated when a meeting is created.
 * Documentation: https://docs.dyte.io/api/?v=v1#/operations/create_meeting
 */
const roomName = searchParams.get('roomName') ?? '';

/**
 * An auth token is generated when a participant is added to the meeitng.
 * Documentation: https://docs.dyte.io/api#/operations/add_participant 
 */
const authToken = searchParams.get('authToken') 

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
  roomName,
}).then((meeting) => {
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
      // Send Notification
      sendNotification({
        id: new Date().getTime().toString(),
        message: `Hand Raised by ${payload.name}`,
        duration: 3000,
      }, 'message')
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
  if (detail.activeSidebar) {
    document.getElementById('dyte-sidebar-el').style.display = 'flex';
    document.getElementById('dyte-handraise-el').style.display = 'none';
  } else {
    document.getElementById('dyte-sidebar-el').style.display = 'none';
    document.getElementById('dyte-handraise-el').style.display = 'flex';
  }
})

document.getElementsByTagName('dyte-leave-button')[0].addEventListener('click', () => {
  console.log('leave meeting');
  m.leaveRoom();
  const app = document.getElementById('app');
  app.classList.add('ended-screen');
  app.innerHTML = 'Meeting Ended'
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
}

