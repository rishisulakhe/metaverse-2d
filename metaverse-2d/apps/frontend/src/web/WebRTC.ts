import Peer, { type MediaConnection } from 'peerjs'
import type Network from '../services/Network'
import store from '../stores'
import { setVideoConnected } from '../stores/UserStore'
import { sanitizeId } from '../util'

export default class WebRTC {
  private myPeer: Peer
  private peers = new Map<string, { call: MediaConnection; video: HTMLVideoElement; wrapper: HTMLDivElement }>()
  private onCalledPeers = new Map<string, { call: MediaConnection; video: HTMLVideoElement; wrapper: HTMLDivElement }>()
  private videoGrid = document.getElementById('video-grid')
  private buttonGrid = document.getElementById('button-grid')
  private myVideo = document.createElement('video')
  private myWrapper?: HTMLDivElement
  private myStream?: MediaStream
  private network: Network

  constructor(userId: string, network: Network) {
    const sanitizedId = sanitizeId(userId)
    this.myPeer = new Peer(sanitizedId)
    this.network = network
    this.myPeer.on('error', (err) => console.error('Peer error:', err))
    this.myVideo.muted = true
    this.initialize()
  }

  initialize() {
    this.myPeer.on('call', (call) => {
      if (!this.onCalledPeers.has(call.peer)) {
        call.answer(this.myStream)
        const video = document.createElement('video')
        const wrapper = document.createElement('div')
        wrapper.appendChild(video)
        this.onCalledPeers.set(call.peer, { call, video, wrapper })
        call.on('stream', (userVideoStream) => {
          this.addVideoStream(video, wrapper, userVideoStream)
        })
      }
    })
  }

  checkPreviousPermission() {
    const permissionName = 'microphone' as PermissionName
    navigator.permissions?.query({ name: permissionName }).then((result) => {
      if (result.state === 'granted') this.getUserMedia(false)
    })
  }

  getUserMedia(alertOnError = true) {
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.myStream = stream
        const wrapper = document.createElement('div')
        wrapper.appendChild(this.myVideo)
        this.myWrapper = wrapper
        this.addVideoStream(this.myVideo, wrapper, stream)
        this.setUpButtons()
        store.dispatch(setVideoConnected(true))
        this.network.videoConnected()
      })
      .catch(() => {
        if (alertOnError) window.alert('No webcam or microphone found, or permission is blocked')
      })
  }

  connectToNewUser(userId: string) {
    if (!this.myStream) return
    const sanitizedId = sanitizeId(userId)
    if (this.peers.has(sanitizedId)) return
    const call = this.myPeer.call(sanitizedId, this.myStream)
    const video = document.createElement('video')
    const wrapper = document.createElement('div')
    wrapper.appendChild(video)
    this.peers.set(sanitizedId, { call, video, wrapper })
    call.on('stream', (userVideoStream) => {
      this.addVideoStream(video, wrapper, userVideoStream)
    })
  }

  addVideoStream(video: HTMLVideoElement, wrapper: HTMLDivElement, stream: MediaStream) {
    video.srcObject = stream
    video.playsInline = true
    video.addEventListener('loadedmetadata', () => video.play())
    if (this.videoGrid && wrapper.parentElement !== this.videoGrid) {
      this.videoGrid.append(wrapper)
    }
  }

  deleteVideoStream(userId: string) {
    const sanitizedId = sanitizeId(userId)
    const peer = this.peers.get(sanitizedId)
    if (peer) {
      peer.call.close()
      peer.wrapper.remove()
      this.peers.delete(sanitizedId)
    }
  }

  deleteOnCalledVideoStream(userId: string) {
    const sanitizedId = sanitizeId(userId)
    const peer = this.onCalledPeers.get(sanitizedId)
    if (peer) {
      peer.call.close()
      peer.wrapper.remove()
      this.onCalledPeers.delete(sanitizedId)
    }
  }

  setUpButtons() {
    const audioButton = document.createElement('button')
    audioButton.innerText = 'Mute'
    audioButton.addEventListener('click', () => {
      if (!this.myStream) return
      const track = this.myStream.getAudioTracks()[0]
      track.enabled = !track.enabled
      audioButton.innerText = track.enabled ? 'Mute' : 'Unmute'
    })
    const videoButton = document.createElement('button')
    videoButton.innerText = 'Video off'
    videoButton.addEventListener('click', () => {
      if (!this.myStream) return
      const track = this.myStream.getVideoTracks()[0]
      track.enabled = !track.enabled
      videoButton.innerText = track.enabled ? 'Video off' : 'Video on'
    })
    this.buttonGrid?.append(audioButton)
    this.buttonGrid?.append(videoButton)
  }
}
