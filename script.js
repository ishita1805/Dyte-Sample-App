import { defineCustomElements } from '@dytesdk/ui-kit/loader';
import { sendNotification, defaultIconPack } from '@dytesdk/ui-kit';
import DyteClient from '@dytesdk/web-core';
defineCustomElements();

// Define variables
const searchParams = new URL(window.location.href).searchParams;
let m;

/**
 * A room name is generated when a meeting is created.
 * Documentation: https://docs.dyte.io/api/?v=v1#/operations/create_meeting
 */
const roomName = searchParams.get('roomName') ?? 'eqdqcp-rrrsqm';

/**
 * An auth token is generated when a participant is added to the meeitng.
 * Documentation: https://docs.dyte.io/api#/operations/add_participant 
 */
const authToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE1NTdmOTQ5LWRkMGYtNDZkMy1iNjJlLTczNDhiMTcxNGNkYiIsImxvZ2dlZEluIjp0cnVlLCJpYXQiOjE2NzU3NTE4MzYsImV4cCI6MTY4NDM5MTgzNn0.Zr1l9nzGbhl5a4HjDX9Bjt26K1P0R6b_RasuFIvhtUEPGKipsI3SRIojMOlhrGkWKZ1t3d9qJNndeKN1uHcWYZd_TGeBZAKA-JID8woMiFG8D0jeL2hVQsU9O_pMLeHUHkFt_gO_6lq5YT9WppDGgTrvfYw2h2R15nuQQplz8GA`;

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

const createParticipantSidebar = () => {
  if (document.getElementById('dyte-handraise-el').childNodes.length < 4) {
    const self = document.createElement('dyte-participant');
    self.meeting = m;
    self.participant = m.self;
    document.getElementById('dyte-handraise-el').appendChild(self);
    for (let p of m.participants.joined.values()) {
      const participant = document.createElement('dyte-participant');
      participant.meeting = m;
      participant.participant = p;
      participant.onclick = () => {
        m.participants.broadcastMessage('unmute', {id: p.id});
      }
      document.getElementById('dyte-handraise-el').appendChild(participant);
    }
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

  m.participants.addListener('broadcastedMessage', ({payload, type}) => {
    console.log(type, payload);
    if(type === 'unmute' && payload.id === m.self.id) {
      sendNotification({
        id: new Date().getTime().toString(),
        message: 'Please unmute your Microphone'
      }, 'message');
    }
  });

  meeting.joinRoom();
});

// Listen for state updates
document.body.addEventListener('dyteStateUpdate', ({detail}) => {
  if (!detail.activeSidebar) {
    document.getElementById('dyte-sidebar-el').style.display = 'none';
    document.getElementById('dyte-handraise-el').style.display = 'none';
  } else {
    if (detail.sidebar === 'participants') {
      createParticipantSidebar();
      document.getElementById('dyte-sidebar-el').style.display = 'none';
      document.getElementById('dyte-handraise-el').style.display = 'flex';
    } else {
      document.getElementById('dyte-sidebar-el').style.display = 'flex';
      document.getElementById('dyte-handraise-el').style.display = 'none';
    }
  }
})

document.getElementsByTagName('dyte-leave-button')[0].addEventListener('click', () => {
  console.log('leave meeting');
  m.leaveRoom();
  const app = document.getElementById('app');
  app.classList.add('ended-screen');
  app.innerHTML = 'Meeting Ended'
})


