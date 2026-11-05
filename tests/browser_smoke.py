"""Headless Chrome WebGL startup and first-interaction regression test."""
import json
import os
import pathlib
import socketserver
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "test-artifacts"
ARTIFACTS.mkdir(exist_ok=True)

class SilentHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, fmt, *args): pass

with socketserver.TCPServer(("127.0.0.1", 0), SilentHandler) as httpd:
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--enable-webgl")
    options.add_argument("--use-gl=angle")
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--enable-unsafe-swiftshader")
    options.add_argument("--window-size=1440,900")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    browser = webdriver.Chrome(options=options)
    browser.set_page_load_timeout(65)
    try:
        browser.get(f"http://127.0.0.1:{port}/")
        started = False
        errors = []
        state = None
        for attempt in range(55):
            time.sleep(1)
            state = browser.execute_script(
                "return window.WILDLANDS ? window.WILDLANDS.getState() : null")
            disabled = browser.execute_script(
                "return document.querySelector('#start').disabled")
            if state is not None and not disabled:
                started = True
                break
        if not started:
            raise AssertionError("WebGL bootstrap did not complete; WILDLANDS absent or Start disabled")
        assert state["staticVertices"] > 100000, state
        assert state["foliageVertices"] > 20000, state
        assert state["waterVertices"] > 10000, state
        gl_status = browser.execute_script("""const canvas=document.querySelector('#world');
          const gl=canvas.getContext('webgl2');
          return {width:canvas.width,height:canvas.height,
            supported:!!gl,error:gl?gl.getError():-1,
            renderer:gl?gl.getParameter(gl.RENDERER):'none'};""")
        assert gl_status["supported"] and gl_status["error"] == 0, gl_status
        browser.find_element(By.ID, "start").click()
        time.sleep(3)
        state = browser.execute_script("return window.WILDLANDS.getState()")
        assert state["started"] and state["phase"] == "ready", state
        browser.save_screenshot(str(ARTIFACTS / "visual-overhaul-1440x900.png"))
        # Casting must still be reachable by actual pointer interaction.
        world = browser.find_element(By.ID, "world")
        ActionChains(browser).move_to_element(world).click_and_hold().pause(.75).release().perform()
        time.sleep(1.5)
        phase = browser.execute_script("return window.WILDLANDS.getState().phase")
        assert phase in ("casting", "waiting", "bite"), f"Fishing interaction broken: {phase}"
        browser.save_screenshot(str(ARTIFACTS / "cast-state.png"))
        errors = [entry["message"] for entry in browser.get_log("browser")
                  if entry["level"] == "SEVERE" and "favicon.ico" not in entry["message"]]
        assert not errors, "Browser console errors:\n" + "\n".join(errors[:15])
        report = {"gl": gl_status,"started": started,"first_frame": state,
                  "cast_phase": phase,"console_errors": errors}
        (ARTIFACTS / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
        print(json.dumps(report, indent=2, ensure_ascii=False))
    finally:
        browser.quit()
        httpd.shutdown()
