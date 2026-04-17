import Phaser from 'phaser'
import { createCharacterAnims } from '../anims/CharacterAnims'
import Item from '../items/Item'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import '../characters/MyPlayer'
import '../characters/OtherPlayer'
import MyPlayer from '../characters/MyPlayer'
import OtherPlayer from '../characters/OtherPlayer'
import PlayerSelector from '../characters/PlayerSelector'
import Network from '../services/Network'
import type { IPlayer } from '@repo/types/OfficeState'
import { PlayerBehavior } from '@repo/types/PlayerBehavior'
import { ItemType } from '@repo/types/Items'
import store from '../stores'
import { setFocused, setShowChat } from '../stores/ChatStore'
import type { NavKeys } from '@repo/types/KeyboardState'

export default class Game extends Phaser.Scene {
  network!: Network
  private cursors!: NavKeys
  private keyE!: Phaser.Input.Keyboard.Key
  private keyR!: Phaser.Input.Keyboard.Key
  private map!: Phaser.Tilemaps.Tilemap
  myPlayer!: MyPlayer
  private playerSelector!: PlayerSelector
  private otherPlayers!: Phaser.Physics.Arcade.Group
  private otherPlayerMap = new Map<string, OtherPlayer>()
  computerMap = new Map<string, Computer>()
  private whiteboardMap = new Map<string, Whiteboard>()

  constructor() {
    super('game')
  }

  registerKeys() {
    this.cursors = {
      ...this.input.keyboard!.createCursorKeys(),
      ...(this.input.keyboard!.addKeys('W,S,A,D') as any),
    }
    this.keyE = this.input.keyboard!.addKey('E')
    this.keyR = this.input.keyboard!.addKey('R')
    this.input.keyboard!.disableGlobalCapture()
    this.input.keyboard!.on('keydown-ENTER', () => {
      store.dispatch(setShowChat(true))
      store.dispatch(setFocused(true))
    })
    this.input.keyboard!.on('keydown-ESC', () => {
      store.dispatch(setShowChat(false))
    })
  }

  disableKeys() {
    this.input.keyboard!.enabled = false
  }

  enableKeys() {
    this.input.keyboard!.enabled = true
  }

  create(data: { network: Network }) {
    if (!data.network) throw new Error('network missing')
    this.network = data.network

    createCharacterAnims(this.anims)

    this.map = this.make.tilemap({ key: 'tilemap' })
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')!
    const groundLayer = this.map.createLayer('Ground', FloorAndGround)!
    groundLayer.setCollisionByProperty({ collides: true })

    this.myPlayer = this.add.myPlayer(705, 500, 'adam', this.network.mySessionId || 'local')
    this.playerSelector = new PlayerSelector(this, 0, 0, 16, 16)

    const chairs = this.physics.add.staticGroup({ classType: Chair })
    const chairLayer = this.map.getObjectLayer('Chair')
    chairLayer?.objects.forEach((obj) => {
      const item = this.addObjectFromTiled(chairs, obj, 'chairs', 'chair') as Chair
      item.itemDirection = obj.properties?.[0]?.value
    })

    const computers = this.physics.add.staticGroup({ classType: Computer })
    const computerLayer = this.map.getObjectLayer('Computer')
    computerLayer?.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(computers, obj, 'computers', 'computer') as Computer
      item.setDepth(item.y + item.height * 0.27)
      item.id = `${i}`
      this.computerMap.set(`${i}`, item)
    })

    const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
    const whiteboardLayer = this.map.getObjectLayer('Whiteboard')
    whiteboardLayer?.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(whiteboards, obj, 'whiteboards', 'whiteboard') as Whiteboard
      item.id = `${i}`
      this.whiteboardMap.set(`${i}`, item)
    })

    const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
    const vendingLayer = this.map.getObjectLayer('VendingMachine')
    vendingLayer?.objects.forEach((obj) => {
      this.addObjectFromTiled(vendingMachines, obj, 'vendingmachines', 'vendingmachine')
    })

    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround', false)
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false)
    this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true)
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false)
    this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true)
    this.addGroupFromTiled('Basement', 'basement', 'Basement', true)

    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer })

    this.cameras.main.zoom = 1.5
    this.cameras.main.startFollow(this.myPlayer, true)

    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer)
    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], vendingMachines)

    this.physics.add.overlap(
      this.playerSelector,
      [chairs, computers, whiteboards, vendingMachines],
      this.handleItemSelectorOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    this.physics.add.overlap(
      this.myPlayer,
      this.otherPlayers,
      this.handlePlayersOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    this.network.onPlayerJoined(this.handlePlayerJoined, this)
    this.network.onPlayerLeft(this.handlePlayerLeft, this)
    this.network.onMyPlayerReady(this.handleMyPlayerReady, this)
    this.network.onMyPlayerVideoConnected(this.handleMyVideoConnected, this)
    this.network.onPlayerUpdated(this.handlePlayerUpdated, this)
    this.network.onItemUserAdded(this.handleItemUserAdded, this)
    this.network.onItemUserRemoved(this.handleItemUserRemoved, this)
    this.network.onChatMessageAdded(this.handleChatMessageAdded, this)

    this.registerKeys()
  }

  private handleItemSelectorOverlap(playerSelector: unknown, selectionItem: unknown) {
    const ps = playerSelector as PlayerSelector
    const item = selectionItem as Item & { onOverlapDialog: () => void }
    const current = ps.selectedItem
    if (current) {
      if (current === item || current.depth >= item.depth) return
      if (this.myPlayer.playerBehavior !== PlayerBehavior.SITTING) current.clearDialogBox()
    }
    ps.selectedItem = item as Item
    item.onOverlapDialog()
  }

  private addObjectFromTiled(
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ) {
    const ax = object.x! + object.width! * 0.5
    const ay = object.y! - object.height! * 0.5
    return group
      .get(ax, ay, key, object.gid! - this.map.getTileset(tilesetName)!.firstgid)
      .setDepth(ay)
  }

  private addGroupFromTiled(
    layerName: string,
    key: string,
    tilesetName: string,
    collidable: boolean
  ) {
    const group = this.physics.add.staticGroup()
    const layer = this.map.getObjectLayer(layerName)
    layer?.objects.forEach((object) => {
      const ax = object.x! + object.width! * 0.5
      const ay = object.y! - object.height! * 0.5
      group
        .get(ax, ay, key, object.gid! - this.map.getTileset(tilesetName)!.firstgid)
        .setDepth(ay)
    })
    if (this.myPlayer && collidable) {
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group)
    }
  }

  private handlePlayerJoined(newPlayer: IPlayer, id: string) {
    const texture = newPlayer.anim?.split('_')[0] ?? 'adam'
    const other = this.add.otherPlayer(newPlayer.x, newPlayer.y, texture, id, newPlayer.name)
    this.otherPlayers.add(other)
    this.otherPlayerMap.set(id, other)
  }

  private handlePlayerLeft(id: string) {
    const other = this.otherPlayerMap.get(id)
    if (!other) return
    this.otherPlayers.remove(other, true, true)
    this.otherPlayerMap.delete(id)
  }

  private handleMyPlayerReady() {
    this.myPlayer.readyToConnect = true
  }

  private handleMyVideoConnected() {
    this.myPlayer.videoConnected = true
  }

  private handlePlayerUpdated(field: string, value: number | string | boolean, id: string) {
    this.otherPlayerMap.get(id)?.updateOtherPlayer(field, value)
  }

  private handlePlayersOverlap(myPlayer: unknown, otherPlayer: unknown) {
    const mp = myPlayer as MyPlayer
    const op = otherPlayer as OtherPlayer
    op.makeCall(mp, this.network?.webRTC)
  }

  private handleItemUserAdded(userId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) this.computerMap.get(itemId)?.addCurrentUser(userId)
    else if (itemType === ItemType.WHITEBOARD) this.whiteboardMap.get(itemId)?.addCurrentUser(userId)
  }

  private handleItemUserRemoved(userId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) this.computerMap.get(itemId)?.removeCurrentUser(userId)
    else if (itemType === ItemType.WHITEBOARD) this.whiteboardMap.get(itemId)?.removeCurrentUser(userId)
  }

  private handleChatMessageAdded(playerId: string, content: string) {
    this.otherPlayerMap.get(playerId)?.updateDialogBubble(content)
  }

  update() {
    if (this.myPlayer && this.network) {
      this.playerSelector.update(this.myPlayer, this.cursors)
      this.myPlayer.update(this.playerSelector, this.cursors, this.keyE, this.keyR, this.network)
    }
  }
}
