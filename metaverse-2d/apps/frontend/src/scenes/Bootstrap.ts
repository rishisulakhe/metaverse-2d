import Phaser from "phaser";
import Network from "../services/Network";
import { BackgroundMode } from "@repo/types/BackgroundMode";
import store from "../stores";

export default class Bootstrap extends Phaser.Scene {
  private preloadComplete = false;
  network!: Network;

  constructor() {
    super("bootstrap");
  }

  preload() {
    this.load.atlas(
      "cloud_day",
      "assets/background/cloud_day.png",
      "assets/background/cloud_day.json",
    );
    this.load.image("backdrop_day", "assets/background/backdrop_day.png");
    this.load.atlas(
      "cloud_night",
      "assets/background/cloud_night.png",
      "assets/background/cloud_night.json",
    );
    this.load.image("backdrop_night", "assets/background/backdrop_night.png");
    this.load.image("sun_moon", "assets/background/sun_moon.png");

    this.load.tilemapTiledJSON("tilemap", "assets/map/map.json");
    this.load.spritesheet("tiles_wall", "assets/map/FloorAndGround.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("chairs", "assets/items/chair.png", {
      frameWidth: 32,
      frameHeight: 64,
    });
    this.load.spritesheet("computers", "assets/items/computer.png", {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet("whiteboards", "assets/items/whiteboard.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet(
      "vendingmachines",
      "assets/items/vendingmachine.png",
      { frameWidth: 48, frameHeight: 72 },
    );
    this.load.spritesheet(
      "office",
      "assets/tileset/Modern_Office_Black_Shadow.png",
      { frameWidth: 32, frameHeight: 32 },
    );
    this.load.spritesheet("basement", "assets/tileset/Basement.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("generic", "assets/tileset/Generic.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("adam", "assets/character/adam.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("ash", "assets/character/ash.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("lucy", "assets/character/lucy.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("nancy", "assets/character/nancy.png", {
      frameWidth: 32,
      frameHeight: 48,
    });

    this.load.on("complete", () => {
      this.preloadComplete = true;
      this.launchBackground(store.getState().user.backgroundMode);
    });
  }

  init() {
    this.network = new Network();
  }

  private launchBackground(mode: BackgroundMode) {
    this.scene.launch("background", { backgroundMode: mode });
  }

  /**
   * Called by RoomSelectionDialog when the user picks a space.
   * We connect to WS and wait for the `space-joined` confirmation before
   * launching the Phaser game scene, so `spawnPosition` and `mySessionId`
   * are already populated when Game.create() runs.
   */
  launchGame(
    spaceId: string,
    token: string,
    name: string,
    anim: string,
    password?: string,
  ) {
    if (!this.preloadComplete) return;

    // Derive the texture key from the anim string (e.g. "ash_idle_down" → "ash")
    const texture = anim.split("_")[0] ?? "adam";

    this.network.connect(spaceId, token, name, anim, password);
    this.network.webRTC?.checkPreviousPermission();

    // Wait for `space-joined` before launching the game scene so that
    // spawnPosition and mySessionId are ready when Game.create() reads them.
    this.network.onceSpaceJoined(() => {
      if (!this.scene.isActive("game")) {
        this.scene.launch("game", {
          network: this.network,
          playerTexture: texture,
        });
      }
    });
  }

  changeBackgroundMode(mode: BackgroundMode) {
    this.scene.stop("background");
    this.launchBackground(mode);
  }
}
