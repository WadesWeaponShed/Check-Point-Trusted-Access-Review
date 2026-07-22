# macOS Apple Silicon Release

## Recommended Download

`Check-Point-Trusted-Access-Review-macOS-Apple-Silicon.zip`

Extract the ZIP and open `Check Point Trusted Access Review.app`. No installation, Node.js, npm, or Git is required.

The app is a native arm64 bundle with an ad-hoc signature. If Gatekeeper blocks the first launch, right-click the app, select **Open**, and confirm. The app binds to `127.0.0.1`, prefers port `4000`, moves upward when a port is occupied, and opens the selected URL in the default browser.

## Current Checksums

```text
ZIP         4cbda4a550a0ce81d9a5a2c2ac11d86c5e51bcd47f084cd24bbb0d788eb4b56d
RAW BINARY  bbb273e0519e0a603730e7f9814c9490a6a7fde9a1edc95ff0a6d167deaef6e0
```

The raw arm64 executable is a troubleshooting/build artifact. The `archive/` folder contains an exact preserved duplicate app and should not be published.
