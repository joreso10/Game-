# Star Miner 3D

A browser-based 3D mining-survival game inspired by space trucking and asteroid economy sims.

## What was expanded

- **Mission board** with three contract archetypes:
  - Delivery contracts (specific ore quotas)
  - Bounty contracts (drone kills)
  - Salvage contracts (time survived in dangerous outer sectors)
- **Dynamic station market prices** for iron/gold/ice/plasma
- **Multi-station loop** with three stations and dock/undock economy play
- **Station life systems**:
  - Sell cargo and auto-turn-in contracts
  - Full refuel/repair service
  - Cargo/mining upgrades
  - Crew rest to delay incoming threat waves
- **Sector hazards/biomes** that increase fuel/hull pressure in outer space
- **Persistent save/load** via `localStorage`
- **Run summary + restart** flow on ship destruction

## Run locally

```bash
python3 -m http.server 4173
```

Open:

- <http://localhost:4173>

## Controls

- `WASD`: strafe/forward/back
- `Space`: thrust up
- `Shift`: thrust down
- `Mouse`: look around (after click lock)
- `Left click`: mining laser / weapon shot
- `E`: dock or undock
- `F`: quick repair
- `R`: restart run after destruction

### While docked

- `1`: sell all ore + evaluate active contracts
- `2`: full refuel and repair
- `3`: upgrade cargo bay (+25) + mining power
- `4`: crew rest (delays next threat wave)
- `5`, `6`, `7`: accept mission board entries
