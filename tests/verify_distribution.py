"""Basic distribution validation for the WILDLANDS browser game."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
index = (root / "index.html").read_text(encoding="utf-8")
game = (root / "game.js").read_text(encoding="utf-8")
css = (root / "style.css").read_text(encoding="utf-8")
assert 'src="game.js"' in index
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
