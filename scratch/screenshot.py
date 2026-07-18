from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1440, "height": 900})
        
        print("Navigating to login page...")
        page.goto('http://localhost:5173/login')
        time.sleep(2)
        
        print("Logging in...")
        page.fill('input[type="email"]', 'admin@lms.com')
        page.fill('input[type="password"]', 'Temp@123')
        page.click('button[type="submit"]')
        
        print("Waiting for dashboard to load...")
        time.sleep(4)
        
        print("Taking screenshot of dashboard...")
        page.screenshot(path='C:\\Users\\Varad\\Documents\\GitHub\\E-learning\\scratch\\dashboard_screenshot.png', full_page=True)
        
        print("Screenshot saved to scratch/dashboard_screenshot.png")
        browser.close()

if __name__ == '__main__':
    run()
