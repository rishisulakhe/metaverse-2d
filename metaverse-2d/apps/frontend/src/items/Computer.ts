import { ItemType } from '@repo/types/Items'
import store from '../stores'
import Item from './Item'
import Network from '../services/Network'
import { openComputerDialog } from '../stores/ComputerStore'

export default class Computer extends Item {
  id?: string
  currentUsers = new Set<string>()

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
    this.itemType = ItemType.COMPUTER
  }

  private updateStatus() {
    const n = this.currentUsers.size
    this.clearStatusBox()
    if (n === 1) this.setStatusBox('1 user')
    else if (n > 1) this.setStatusBox(`${n} users`)
  }

  onOverlapDialog() {
    if (this.currentUsers.size === 0) {
      this.setDialogBox('Press R to use computer')
    } else {
      this.setDialogBox('Press R to join')
    }
  }

  addCurrentUser(userId: string) {
    if (this.currentUsers.has(userId)) return
    this.currentUsers.add(userId)
    const cs = store.getState().computer
    if (cs.computerId === this.id) cs.shareScreenManager?.onUserJoined(userId)
    this.updateStatus()
  }

  removeCurrentUser(userId: string) {
    if (!this.currentUsers.has(userId)) return
    this.currentUsers.delete(userId)
    const cs = store.getState().computer
    if (cs.computerId === this.id) cs.shareScreenManager?.onUserLeft(userId)
    this.updateStatus()
  }

  openDialog(playerId: string, network: Network) {
    if (!this.id) return
    store.dispatch(openComputerDialog({ computerId: this.id, myUserId: playerId }))
    network.connectToComputer(this.id)
  }
}
