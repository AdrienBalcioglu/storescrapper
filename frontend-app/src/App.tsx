import { AppStoreStatus } from "./components/AppStoreStatus";
import "./App.css";

function App() {
  const iosBundleId =
    import.meta.env.VITE_IOS_BUNDLE_ID ?? "com.company.app";
  const androidPackageName =
    import.meta.env.VITE_ANDROID_PACKAGE_NAME ?? "com.company.app";

  return (
    <main className="app-shell">
      <AppStoreStatus
        iosBundleId={iosBundleId}
        androidPackageName={androidPackageName}
      />
    </main>
  );
}

export default App;
