import Phaser from 'phaser'
import MyPlayer from './MyPlayer'
import { PlayerBehavior } from '@repo/types/PlayerBehavior'
import Item from '../items/Item'
import type { NavKeys } from '@repo/types/KeyboardState'

export default class PlayerSelector extends Phaser.GameObjects.Zone {
  selectedItem?: Item

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y, width, height)
    scene.physics.add.existing(this)
  }

  update(player: MyPlayer, cursors: NavKeys) {
    if (!cursors) return
    if (player.playerBehavior === PlayerBehavior.SITTING) return

    const { x, y } = player
    const jm = player.joystickMovement
    const jLeft = jm?.isMoving && jm.direction.left
    const jRight = jm?.isMoving && jm.direction.right
    const jUp = jm?.isMoving && jm.direction.up
    const jDown = jm?.isMoving && jm.direction.down

    if (cursors.left?.isDown || cursors.A?.isDown || jLeft) {
      this.setPosition(x - 32, y)
    } else if (cursors.right?.isDown || cursors.D?.isDown || jRight) {
      this.setPosition(x + 32, y)
    } else if (cursors.up?.isDown || cursors.W?.isDown || jUp) {
      this.setPosition(x, y - 32)
    } else if (cursors.down?.isDown || cursors.S?.isDown || jDown) {
      this.setPosition(x, y + 32)
    }

    if (this.selectedItem) {
      if (!this.scene.physics.overlap(this, this.selectedItem)) {
        this.selectedItem.clearDialogBox()
        this.selectedItem = undefined
      }
    }
  }
}
