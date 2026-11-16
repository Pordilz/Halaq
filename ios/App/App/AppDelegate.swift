import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var privacyOverlay: UIView?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        // The WebView keeps Supabase session tokens in its localStorage under
        // Library/WebKit. Mark that directory so backups exclude it, matching
        // the Android data-extraction rules (no session data leaves the device).
        if let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first {
            let webKit = library.appendingPathComponent("WebKit", isDirectory: true)
            if FileManager.default.fileExists(atPath: webKit.path) {
                var values = URLResourceValues()
                values.isExcludedFromBackup = true
                var target = webKit
                try? target.setResourceValues(values)
            }
        }

        // Screen-capture shielding: cover the screen while recording/AirPlay
        // is active (the Android equivalent is FLAG_SECURE). The overlay is
        // removed as soon as capture ends, so normal use is unaffected.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(screenCaptureChanged),
            name: UIScreen.capturedDidChangeNotification,
            object: nil
        )

        // NON-BLOCKING jailbreak signal: warn only. This heuristic can be
        // evaded and is not a security boundary — never crash or exit here.
        if isJailbroken() {
            print("Halaq: device appears jailbroken (heuristic); warning web layer only.")
            notifyWebLayer()
        }
        return true
    }

    deinit {
        NotificationCenter.default.removeObserver(self, name: UIScreen.capturedDidChangeNotification, object: nil)
    }

    @objc private func screenCaptureChanged() {
        guard let window = window else { return }
        if UIScreen.main.isCaptured {
            guard privacyOverlay == nil else { return }
            let overlay = UIView(frame: window.bounds)
            // Opaque black hides text and balances rather than a translucency
            // that would still leak on-screen shapes into a recording.
            overlay.backgroundColor = UIColor.black.withAlphaComponent(0.95)
            overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            window.addSubview(overlay)
            privacyOverlay = overlay
            print("Halaq: screen capture active - privacy overlay shown")
        } else {
            privacyOverlay?.removeFromSuperview()
            privacyOverlay = nil
        }
    }

    private func isJailbroken() -> Bool {
        // 1. Well-known jailbreak files/binaries.
        let paths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
        ]
        for path in paths where FileManager.default.fileExists(atPath: path) { return true }

        // 2. Jailbreak-only URL scheme (best effort: canOpenURL needs the
        //    scheme in LSApplicationQueriesSchemes, so this may be a no-op).
        if let cydia = URL(string: "cydia://package/com.example.package"),
           UIApplication.shared.canOpenURL(cydia) { return true }

        // 3. Sandbox write probe: a jailed app cannot write outside its
        //    container. Clean up the probe file either way.
        let probe = "/private/halaq_jailbreak_probe_\(UUID().uuidString)"
        do {
            try "ok".write(toFile: probe, atomically: true, encoding: .utf8)
            try? FileManager.default.removeItem(atPath: probe)
            return true
        } catch {
            return false
        }
    }

    /** Post the same integrity event the Android shell posts; failures ignored. */
    private func notifyWebLayer() {
        let js = "window.dispatchEvent(new CustomEvent('halaq:device-integrity',{detail:{compromised:true}}));"
        DispatchQueue.main.async {
            guard let controller = self.window?.rootViewController as? CAPBridgeViewController,
                  let webView = controller.webView else { return }
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Verified: ApplicationDelegateProxy posts `.capacitorOpenUniversalLink`
        // with userActivity.webpageURL, which Capacitor's App plugin re-emits as
        // `appUrlOpen`. src/main.jsx consumes that event and maps the verified
        // https://halaq.app/... URL onto the same allowlisted hash route as the
        // custom-scheme links, so no manual forwarding is needed here.
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
