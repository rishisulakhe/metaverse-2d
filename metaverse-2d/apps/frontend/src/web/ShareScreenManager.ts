import Peer from 'peerjs'
import store from '../stores'
import { sanitizeId } from '../util'
import { addVideoStream, removeVideoStream, setMyStream } from '../stores/ComputerStore'
import phaserGame from '../PhaserGame'
import type Game from '../scenes/Game'

export default class ShareScreenManager {
  private myPeer: Peer
  myStream?: MediaStream

  constructor(userId: string) {
    const sanitizedId = sanitizeId(userId) + '-ss'
    this.myPeer = new Peer(sanitizedId)
    this.myPeer.on('error', (err) => {
      console.error('ShareScreenManager peer error:', err)
    })
    this.myPeer.on('call', (call) => {
      call.answer()
      call.on('stream', (userVideoStream: MediaStream) => {
        store.dispatch(addVideoStream({ id: call.peer, call, stream: userVideoStream }))
      })
    })
  }

  onOpen() {
    if (!this.myPeer.disconnected) return
    this.myPeer.reconnect()
  }

  onClose() {
    this.stopScreenShare(false)
    this.myPeer.disconnect()
  }

  async startScreenShare() {
    const displayMediaOptions: DisplayMediaStreamOptions = {
      video: true,
      audio: true,
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => this.stopScreenShare()
      }
      this.myStream = stream
      store.dispatch(setMyStream(stream))
      const game = phaserGame.scene.keys.game as Game
      const connectedUsers = game.computerMap.get(store.getState().computer.computerId!)?.currentUsers
      if (connectedUsers) {
        for (const userId of connectedUsers) {
          this.onUserJoined(userId)
        }
      }
    } catch (err) {
      console.error('Screen share failed:', err)
    }
  }

  stopScreenShare(shouldDispatch = true) {
    this.myStream?.getTracks().forEach((t) => t.stop())
    this.myStream = undefined
    if (shouldDispatch) {
      store.dispatch(setMyStream(null))
      const game = phaserGame.scene.keys.game as Game
      const computerId = store.getState().computer.computerId
      if (computerId) game?.network?.onStopScreenShare(computerId)
    }
  }

  onUserJoined(newUserId: string) {
    if (!this.myStream || !newUserId) return
    const sanitizedId = sanitizeId(newUserId) + '-ss'
    this.myPeer.call(sanitizedId, this.myStream)
  }

  onUserLeft(userId: string) {
    if (!userId) return
    store.dispatch(removeVideoStream(sanitizeId(userId) + '-ss'))
  }
}
