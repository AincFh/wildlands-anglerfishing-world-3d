"""Real Chromium/WebGL smoke for the next-generation cinematic fishing preview.
Captures the title, lake, bite, fight and equipment states. No mocked engine."""
import json
import os
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
SITE_ROOT = ROOT / "dist" if os.environ.get("NEXT_TEST_RELEASE") == "1" else ROOT
assert (SITE_ROOT / "next" / "index.html").is_file()
ARTIFACTS = ROOT / "test-artifacts" / "next"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE_ROOT), **kwargs)
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
    opt.add_argument("--window-size=1024,650")
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
        driver.set_window_size(1024,650)
        driver.save_screenshot(str(ARTIFACTS / "01-title.png"))
        # The runtime must really fetch Three.js from this same site,
        # not from an unreliable third-party JavaScript CDN.
        modules=driver.execute_script("""return performance.getEntriesByType('resource')
          .map(r=>r.name).filter(u=>/three\.module|three\.core|GLTFLoader|BufferGeometryUtils|OrbitControls/.test(u))""")
        assert any("/next/vendor/three/build/three.module.js" in x for x in modules), modules
        assert not any("cdn.jsdelivr.net" in x for x in modules), modules
        if os.environ.get("NEXT_TEST_RELEASE") == "1":
            # Prove that all first-party ESM fetches use THIS release's
            # revision, not stale modules from the previous GitHub Pages build.
            rev=driver.execute_script("""return {
                entry:document.querySelector('script[type="module"]')?.getAttribute('src'),
                modules:performance.getEntriesByType('resource').map(r=>r.name)
                    .filter(u=>u.includes('/next/src/')&&/\.(?:js|mjs)(\?|$)/.test(u))
            }""")
            assert "?v=" in rev["entry"],rev
            assert len(rev["modules"])>=12,rev
            assert all("?v=" in url for url in rev["modules"]),rev
        world=driver.execute_script("return window.__wildlandsNext.getState()")
        assert world["treeCount"] > 100, world
        assert world["shoreDetails"]["grass"] > 200 and world["shoreDetails"]["rocks"] > 50, world
        assert world["renderer"] == "webgl", world
        driver.find_element(By.ID, "play").click()
        time.sleep(2)
        ready=driver.execute_script("return window.__wildlandsNext.getState()")
        assert ready["started"] and ready["phase"] == "ready", ready
        driver.save_screenshot(str(ARTIFACTS / "02-lake-and-rod.png"))
        cast = driver.find_element(By.ID, "cast")
        ActionChains(driver).move_to_element(cast).click_and_hold().pause(.8).release().perform()
        # Software GPU frames are slow; advance the deterministic casting animation explicitly.
        driver.execute_script("if(window.__wildlandsNext.getState().phase==='flying') window.__wildlandsNext.angler.update(1.0)")
        for _ in range(12):
            time.sleep(.4)
            phase=driver.execute_script("return window.__wildlandsNext.getState().phase")
            if phase=="waiting":break
        assert phase=="waiting", f"Expected floating bobber, got {phase}"
        assert driver.execute_script("return window.__wildlandsNext.getState().bobberVisible")
        driver.save_screenshot(str(ARTIFACTS / "03-float.png"))
        driver.execute_script("window.__wildlandsNext.test.forceBite();window.__wildlandsNext.angler.update(.12)")
        time.sleep(.4)
        assert driver.execute_script("return window.__wildlandsNext.getState().phase")=="bite"
        driver.save_screenshot(str(ARTIFACTS / "04-bite.png"))
        driver.find_element(By.ID, "cast").click()
        time.sleep(.3)
        assert driver.execute_script("return window.__wildlandsNext.getState().phase")=="fighting"
        # Real-world Three.js mesh uses independent tail and fin hinges, with
        # an anatomical silhouette that differs by species. A snapshot alone
        # cannot prove animation, so advance the actual gameplay clock.
        pose0=driver.execute_script("return window.__wildlandsNext.getState()")
        driver.execute_script("window.__wildlandsNext.angler.update(.21)")
        pose1=driver.execute_script("return window.__wildlandsNext.getState()")
        assert pose1["fish3DMeshes"]>=40 and pose1["fishShape"], pose1
        assert abs(pose1["fishTailYaw"]-pose0["fishTailYaw"])>.0005, (pose0,pose1)
        assert pose1["fishRigScale"]["z"]>.6,pose1
        driver.save_screenshot(str(ARTIFACTS / "05-fight.png"))
        driver.execute_script("window.__wildlandsNext.test.forceCatch();window.__wildlandsNext.angler.update(.12)")
        time.sleep(.35)
        caught=driver.execute_script("return window.__wildlandsNext.getState()")
        assert caught["phase"]=="caught" and caught["catches"] >= 1, caught
        assert caught["trophyVisible"] and caught["fish3DMeshes"] >= 40, caught
        driver.save_screenshot(str(ARTIFACTS / "06-catch.png"))
        driver.find_element(By.ID, "shop").click()
        time.sleep(.3)
        assert not driver.find_element(By.ID,"modal").get_attribute("hidden")
        assert len(driver.find_elements(By.CSS_SELECTOR, "[data-bait-buy]"))==3
        driver.find_element(By.CSS_SELECTOR, '[data-bait-buy="2"]').click()
        bought=driver.execute_script("return window.__wildlandsNext.getState()")
        assert bought["baitStock"]["2"]==6 and bought["coins"]>=0,bought
        driver.find_element(By.CSS_SELECTOR, '[data-bait-equip="2"]').click()
        equipped=driver.execute_script("return window.__wildlandsNext.getState()")
        assert equipped["bait"]==2 and "银色亮片" in driver.find_element(By.ID,"baitHud").text,equipped
        driver.save_screenshot(str(ARTIFACTS / "07-equipment.png"))
        driver.find_element(By.ID, "close").click()
        # The cast must consume ONE lure only on water; invalid air casts do
        # not spend inventory. Keep this on the genuine gameplay path.
        driver.execute_script("window.__wildlandsNext.angler.reset()")
        cast=driver.find_element(By.ID,"cast")
        ActionChains(driver).move_to_element(cast).click_and_hold().pause(.8).release().perform()
        driver.execute_script("if(window.__wildlandsNext.getState().phase==='flying')window.__wildlandsNext.angler.update(1.0)")
        for _ in range(18):
            time.sleep(.35)
            if driver.execute_script("return window.__wildlandsNext.getState().phase")=="waiting": break
        consumed=driver.execute_script("return window.__wildlandsNext.getState()")
        assert consumed["phase"]=="waiting" and consumed["activeBait"]==2 and consumed["baitStock"]["2"]==5,consumed
        driver.execute_script("window.__wildlandsNext.angler.reset()")
        driver.set_window_size(390, 844)
        time.sleep(.8)
        mobile=driver.execute_script("""return (() => {
            const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();
              return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
            return {width:innerWidth,height:innerHeight,
              movement:getComputedStyle(document.getElementById('touchMove')).display,
              pad:rect('touchMove'),status:rect('status'),cast:rect('cast'),
              horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
          })()""")
        assert mobile["movement"] == "grid", mobile
        assert mobile["cast"]["x"] >= 0 and mobile["cast"]["right"] <= mobile["width"], mobile
        assert mobile["pad"]["bottom"] < mobile["status"]["y"], mobile
        assert not mobile["horizontalOverflow"], mobile
        driver.save_screenshot(str(ARTIFACTS / "08-mobile-controls.png"))
        pos0=driver.execute_script("return {x:window.__wildlandsNext.world.camera.position.x,z:window.__wildlandsNext.world.camera.position.z}")
        move=driver.find_element(By.CSS_SELECTOR, '#touchMove button[data-move="KeyA"]')
        ActionChains(driver).move_to_element(move).click_and_hold().pause(.75).release().perform()
        pos1=driver.execute_script("return {x:window.__wildlandsNext.world.camera.position.x,z:window.__wildlandsNext.world.camera.position.z}")
        delta=((pos1["x"]-pos0["x"])**2+(pos1["z"]-pos0["z"])**2)**.5
        assert delta>.15, f"Touch movement control failed: moved {delta:.3f} m"
        mobile["movement_delta_m"]=round(delta,2)
        errors=[entry["message"] for entry in driver.get_log("browser")
                 if entry["level"] == "SEVERE" and "favicon" not in entry["message"]]
        # Third-party optional GLB may be blocked in some test regions; the
        # procedural rod fallback is supported. Otherwise block console errors.
        core_errors=[msg for msg in errors if not ("22406/v1/model.glb" in msg or "net::ERR" in msg)]
        assert not core_errors, "Severe browser JS or WebGL errors: "+str(core_errors[:15])
        report={"scene":world,"ready":ready,"caught":caught,"mobile":mobile,"errors":errors}
        (ARTIFACTS/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(json.dumps(report,ensure_ascii=False,indent=2))
    finally:
        driver.quit()
        httpd.shutdown()
