import Phaser from 'phaser'
import { BackgroundMode } from '@repo/types/BackgroundMode'

export default class Background extends Phaser.Scene {
  private cloud!: Phaser.Physics.Arcade.Group
  private cloudKey!: string

  constructor() {
    super('background')
  }

  create(data: { backgroundMode: BackgroundMode }) {
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    let backdropKey: string
    if (data.backgroundMode === BackgroundMode.DAY) {
      backdropKey = 'backdrop_day'
      this.cloudKey = 'cloud_day'
      this.cameras.main.setBackgroundColor('#c6eefc')
    } else {
      backdropKey = 'backdrop_night'
      this.cloudKey = 'cloud_night'
      this.cameras.main.setBackgroundColor('#2c4464')
    }

    const backdrop = this.add.image(w / 2, h / 2, backdropKey)
    const scale = Math.max(w / backdrop.width, h / backdrop.height)
    backdrop.setScale(scale).setScrollFactor(0)

    const sunMoon = this.add.image(w / 2, h / 2, 'sun_moon')
    const scale2 = Math.max(w / sunMoon.width, h / sunMoon.height)
    sunMoon.setScale(scale2).setScrollFactor(0)

    const frames = this.textures.get(this.cloudKey).getFrameNames()
    this.cloud = this.physics.add.group()
    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.RND.between(-w * 0.5, w * 1.5)
      const y = Phaser.Math.RND.between(h * 0.2, h * 0.8)
      const velocity = Phaser.Math.RND.between(15, 30)
      this.cloud.get(x, y, this.cloudKey, frames[i % 6]).setScale(3).setVelocity(velocity, 0)
    }
  }

  update() {
    this.physics.world.wrap(this.cloud, 500)
  }
}
