import Phaser from 'phaser'
import { ItemType } from '@repo/types/Items'

export default class Item extends Phaser.Physics.Arcade.Sprite {
  private dialogBox!: Phaser.GameObjects.Container
  private statusBox!: Phaser.GameObjects.Container
  itemType!: ItemType

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
    this.dialogBox = this.scene.add.container().setDepth(10000)
    this.statusBox = this.scene.add.container().setDepth(10000)
  }

  setDialogBox(text: string) {
    const innerText = this.scene.add
      .text(0, 0, text)
      .setFontFamily('Arial')
      .setFontSize(12)
      .setColor('#000000')
    const bw = innerText.width + 4
    const bh = innerText.height + 2
    const bx = this.x - bw * 0.5
    const by = this.y + this.height * 0.5
    this.dialogBox.add(
      this.scene.add
        .graphics()
        .fillStyle(0xffffff, 1)
        .fillRoundedRect(bx, by, bw, bh, 3)
        .lineStyle(1.5, 0x000000, 1)
        .strokeRoundedRect(bx, by, bw, bh, 3)
    )
    this.dialogBox.add(innerText.setPosition(bx + 2, by))
  }

  clearDialogBox() {
    this.dialogBox.removeAll(true)
  }

  setStatusBox(text: string) {
    const innerText = this.scene.add
      .text(0, 0, text)
      .setFontFamily('Arial')
      .setFontSize(12)
      .setColor('#000000')
    const bw = innerText.width + 4
    const bh = innerText.height + 2
    const bx = this.x - bw * 0.5
    const by = this.y - this.height * 0.25
    this.statusBox.add(
      this.scene.add
        .graphics()
        .fillStyle(0xffffff, 1)
        .fillRoundedRect(bx, by, bw, bh, 3)
        .lineStyle(1.5, 0x000000, 1)
        .strokeRoundedRect(bx, by, bw, bh, 3)
    )
    this.statusBox.add(innerText.setPosition(bx + 2, by))
  }

  clearStatusBox() {
    this.statusBox.removeAll(true)
  }

  onOverlapDialog() {
    // override in subclasses
  }
}
