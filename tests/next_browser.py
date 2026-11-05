"""Real Chromium/WebGL smoke for the next-generation cinematic fishing preview.
Captures the title, lake, bite, fight and equipment states. No mocked engine."""
import json
import pathlib
import socketserver
import threading
import time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "test-artifacts" / "next"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args): pass

with socketserver.TCPServer(("127.0.0.1", 0), Handler) as httpd:
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    opt = Options()
    opt.add_argument("--headless=new")
    opt.add_argument("--no-sandbox")
    opt.add_argument("--disable-dev-shm-usage")
    opt.add_argument("--enable-webgl")
    opt.add_argument("--use-gl=angle")
    opt.add_argument("--use-angle=swiftshader")
    opt.add_argument("--enable-unsafe-swiftshader")
    opt.add_argument("--window-size=1440,900")
    opt.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    driver = webdriver.Chrome(options=opt)
    driver.set_page_load_timeout(80)
    try:
        driver.get(f"http://127.0.0.1:{port}/next/")
        for seconds in range(85):
            time.sleep(1)
            valid = driver.execute_script(
                "return !!window.__wildlandsNext && (!document.querySelector('#loading') || document.querySelector('#loading').classList.contains('out'))")
            if valid: break
        else:
            status = driver.execute_script(
                "return {text: document.body.innerText.slice(0,600),ready: document.readyState, hasGame:!!window.__wildlandsNext}")
            raise AssertionError(f"Could not initialize Three.js lake in 85s: {status}")
        driver.save_screenshot(str(ARTIFACTS / "01-title.png"))
        world=driver.execute_script("return window.__wildlandsNext.getState()")
        assert world["treeCount"] > 100, world
        assert world["renderer"] == "webgl", world
        driver.find_element(By.ID, "play").click()
        time.sleep(2)
        ready=driver.execute_script("return window.__wildlandsNext.getState()")
        assert ready["started"] and ready["phase"] == "ready", ready
        driver.save_screenshot(str(ARTIFACTS / "02-lake-and-rod.png"))
        cast = driver.find_element(By.ID, "cast")
        ActionChains(driver).move_to_element(cast).click_and_hold().pause(.8).release().perform()
        for _ in range(12):
            time.sleep(.4)
            phase=driver.execute_script("return window.__wildlandsNext.getState().phase")
            if phase=="waiting":break
        assert phase=="waiting", f"Expected floating bobber, got {phase}"
        assert driver.execute_script("return window.__wildlandsNext.getState().bobberVisible")
        driver.save_screenshot(str(ARTIFACTS / "03-float.png"))
        driver.execute_script("window.__wildlandsNext.test.forceBite()")
        time.sleep(.4)
        assert driver.execute_script("return window.__wildlandsNext.getState().phase")=="bite"
        driver.save_screenshot(str(ARTIFACTS / "04-bite.png"))
        driver.find_element(By.ID, "cast").click()
        time.sleep(.3)
        assert driver.execute_script("return window.__wildlandsNext.getState().phase")=="fighting"
        driver.save_screenshot(str(ARTIFACTS / "05-fight.png"))
        driver.execute_script("window.__wildlandsNext.test.forceCatch()")
        time.sleep(.35)
        caught=driver.execute_script("return window.__wildlandsNext.getState()")
        assert caught["phase"]=="caught" and caught["catches"] >= 1, caught
        driver.save_screenshot(str(ARTIFACTS / "06-catch.png"))
        driver.find_element(By.ID, "shop").click()
        time.sleep(.3)
        assert not driver.find_element(By.ID,"modal").get_attribute("hidden")
        driver.save_screenshot(str(ARTIFACTS / "07-equipment.png"))
        driver.find_element(By.ID, "close").click()
        errors=[entry["message"] for entry in driver.get_log("browser")
                 if entry["level"] == "SEVERE" and "favicon" not in entry["message"]]
        # Third-party optional GLB may be blocked in some test regions; the
        # procedural rod fallback is supported. Otherwise block console errors.
        core_errors=[msg for msg in errors if not ("22406/v1/model.glb" in msg or "net::ERR" in msg)]
        assert not core_errors, "Severe browser JS or WebGL errors: "+str(core_errors[:15])
        report={"scene":world,"ready":ready,"caught":caught,"errors":errors}
        (ARTIFACTS/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(json.dumps(report,ensure_ascii=False,indent=2))
    finally:
        driver.quit()
        httpd.shutdown()
