"""Basic distribution validation for the WILDLANDS browser game."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
index = (root / "index.html").read_text(encoding="utf-8")
game = (root / "game.js").read_text(encoding="utf-8")
css = (root / "style.css").read_text(encoding="utf-8")
assert 'src="game.js"' in index
assert 'src="fight.js"' in index
assert (root / "fight.js").is_file() and (root / "fight.js").stat().st_size > 4000
assert 'href="style.css"' in index
assert "WILDLANDS_MEDIA" in index and "WILDLANDS_MEDIA" in game
for asset in sorted((root / "assets").iterdir()):
    assert asset.is_file() and asset.stat().st_size > 100, asset
required = [
    "birch.png", "cast.wav", "catch.wav", "cloud_noise.png",
    "forest_floor.jpg", "granite_cliff.jpg", "lake_caustics.jpg",
    "meadow.png", "morning_forest.wav", "pine.png", "splash.wav",
    "water_normals.png", "weathered_timber.jpg"
]
for name in required:
    assert (root / "assets" / name).is_file(), name
    assert "assets/" + name in index, name
assert "function loadTexture" in game
assert "getState()" in game
assert len(css) > 10000 and len(game) > 50000
print(f"PASS: {len(required)} assets, HTML/CSS/JS and smoke checks")

# NEXT is an actual deployable ESM project; vendor modules must be present.
next_page = (root / "next" / "index.html").read_text(encoding="utf-8")
assert "https://cdn.jsdelivr.net/npm/three" not in next_page, "NEXT must self-host Three.js"
assert "./vendor/three/build/three.module.js" in next_page
assert "./vendor/three/examples/jsm/" in next_page
vendor = root / "next" / "vendor" / "three"
assert (vendor / "build" / "three.module.js").stat().st_size > 100000
assert (vendor / "build" / "three.core.js").stat().st_size > 100000
assert (vendor / "examples" / "jsm" / "loaders" / "GLTFLoader.js").is_file()
assert (vendor / "LICENSE").is_file()
print("PASS: pinned self-hosted NEXT runtime and MIT license included")
