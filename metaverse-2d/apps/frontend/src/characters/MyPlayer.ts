import Phaser from 'phaser'
import PlayerSelector from './PlayerSelector'
import { PlayerBehavior } from '@repo/types/PlayerBehavior'
import { sittingShiftData } from './Player'
import Player from './Player'
import Network from '../services/Network'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import { phaserEvents, Event } from '../events/EventCenter'
import store from '../stores'
import { pushPlayerJoinedMessage } from '../stores/ChatStore'
import { ItemType } from '@repo/types/Items'
import type { NavKeys } from '@repo/types/KeyboardState'
import { openURL } from '../utils/helpers'

export interface JoystickMovement {
  isMoving: boolean
  direction: { up: boolean; down: boolean; left: boolean; right: boolean }
}

export default class MyPlayer extends Player {
  private playContainerBody: Phaser.Physics.Arcade.Body
  private chairOnSit?: Chair
  public joystickMovement?: JoystickMovement

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, id, frame)
    this.playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body
  }

  setPlayerName(name: string) {
    this.playerName.setText(name)
    phaserEvents.emit(Event.MY_PLAYER_NAME_CHANGE, name)
    store.dispatch(pushPlayerJoinedMessage(name))
  }

  setPlayerTexture(texture: string) {
    this.playerTexture = texture
    this.anims.play(`${this.playerTexture}_idle_down`, true)
    phaserEvents.emit(Event.MY_PLAYER_TEXTURE_CHANGE, this.x, this.y, this.anims.currentAnim?.key)
  }

  handleJoystickMovement(movement: JoystickMovement) {
    this.joystickMovement = movement
  }

  update(
    playerSelector: PlayerSelector,
    cursors: NavKeys,
    keyE: Phaser.Input.Keyboard.Key,
    keyR: Phaser.Input.Keyboard.Key,
    network: Network
  ) {
    if (!cursors) return

    const item = playerSelector.selectedItem

    if (Phaser.Input.Keyboard.JustDown(keyR)) {
      switch (item?.itemType) {
        case ItemType.COMPUTER:
          ;(item as Computer).openDialog(this.playerId, network)
          break
        case ItemType.WHITEBOARD:
          ;(item as Whiteboard).openDialog(network)
          break
        case ItemType.VENDINGMACHINE:
          openURL('https://www.buymeacoffee.com/skyoffice')
          break
      }
    }

    switch (this.playerBehavior) {
      case PlayerBehavior.IDLE: {
        if (Phaser.Input.Keyboard.JustDown(keyE) && item?.itemType === ItemType.CHAIR) {
          const chairItem = item as Chair
          this.scene.time.addEvent({
            delay: 10,
            callback: () => {
              this.setVelocity(0, 0)
              if (chairItem.itemDirection) {
                const [sx, sy, sd] = sittingShiftData[chairItem.itemDirection]
                this.setPosition(chairItem.x + sx, chairItem.y + sy).setDepth(chairItem.depth + sd)
                this.playContainerBody.setVelocity(0, 0)
                this.playerContainer.setPosition(chairItem.x + sx, chairItem.y + sy - 30)
              }
              this.play(`${this.playerTexture}_sit_${chairItem.itemDirection}`, true)
              playerSelector.selectedItem = undefined
              if (chairItem.itemDirection === 'up') {
                playerSelector.setPosition(this.x, this.y - this.height)
              } else {
                playerSelector.setPosition(0, 0)
              }
              network.updatePlayer(this.x, this.y, this.anims.currentAnim?.key ?? '')
            },
            loop: false,
          })
          chairItem.clearDialogBox()
          chairItem.setDialogBox('Press E to leave')
          this.chairOnSit = chairItem
          this.playerBehavior = PlayerBehavior.SITTING
          return
        }

        const speed = 200
        let vx = 0
        let vy = 0
        const jm = this.joystickMovement
        const jLeft = jm?.isMoving && jm.direction.left
        const jRight = jm?.isMoving && jm.direction.right
        const jUp = jm?.isMoving && jm.direction.up
        const jDown = jm?.isMoving && jm.direction.down

        if (cursors.left?.isDown || cursors.A?.isDown || jLeft) vx -= speed
        if (cursors.right?.isDown || cursors.D?.isDown || jRight) vx += speed
        if (cursors.up?.isDown || cursors.W?.isDown || jUp) {
          vy -= speed
          this.setDepth(this.y)
        }
        if (cursors.down?.isDown || cursors.S?.isDown || jDown) {
          vy += speed
          this.setDepth(this.y)
        }

        this.setVelocity(vx, vy)
        if ((vx !== 0 || vy !== 0) && this.body) this.body.velocity.setLength(speed)
        this.playContainerBody.setVelocity(vx, vy)
        if (vx !== 0 || vy !== 0) this.playContainerBody.velocity.setLength(speed)

        if (vx !== 0 || vy !== 0) network.updatePlayer(this.x, this.y, this.anims.currentAnim?.key ?? '')
        if (vx > 0) {
          this.play(`${this.playerTexture}_run_right`, true)
        } else if (vx < 0) {
          this.play(`${this.playerTexture}_run_left`, true)
        } else if (vy > 0) {
          this.play(`${this.playerTexture}_run_down`, true)
        } else if (vy < 0) {
          this.play(`${this.playerTexture}_run_up`, true)
        } else {
          const currentKey = this.anims.currentAnim?.key ?? ''
          const parts = currentKey.split('_')
          if (parts[1] !== 'idle') {
            parts[1] = 'idle'
            const idleKey = parts.join('_')
            this.play(idleKey, true)
            network.updatePlayer(this.x, this.y, this.anims.currentAnim?.key ?? '')
          }
        }
        break
      }

      case PlayerBehavior.SITTING:
        if (Phaser.Input.Keyboard.JustDown(keyE)) {
          const parts = (this.anims.currentAnim?.key ?? '').split('_')
          parts[1] = 'idle'
          this.play(parts.join('_'), true)
          this.playerBehavior = PlayerBehavior.IDLE
          this.chairOnSit?.clearDialogBox()
          playerSelector.setPosition(this.x, this.y)
          playerSelector.update(this, cursors)
          network.updatePlayer(this.x, this.y, this.anims.currentAnim?.key ?? '')
        }
        break
    }
  }
}

declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      myPlayer(x: number, y: number, texture: string, id: string, frame?: string | number): MyPlayer
    }
  }
}

Phaser.GameObjects.GameObjectFactory.register(
  'myPlayer',
  function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    const sprite = new MyPlayer(this.scene, x, y, texture, id, frame)
    this.displayList.add(sprite)
    this.updateList.add(sprite)
    this.scene.physics.world.enableBody(sprite, Phaser.Physics.Arcade.DYNAMIC_BODY)
    const collisionScale = [0.5, 0.2]
    ;(sprite.body as Phaser.Physics.Arcade.Body)
      .setSize(sprite.width * collisionScale[0], sprite.height * collisionScale[1])
      .setOffset(
        sprite.width * (1 - collisionScale[0]) * 0.5,
        sprite.height * (1 - collisionScale[1])
      )
    return sprite
  }
)
