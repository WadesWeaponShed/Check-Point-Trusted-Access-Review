# macOS Apple Silicon Release

## Recommended Download

`Check-Point-Trusted-Access-Review-macOS-Apple-Silicon.zip`

Extract the ZIP and open `Check Point Trusted Access Review.app`. No installation, Node.js, npm, or Git is required.

The app is a native arm64 bundle with an ad-hoc signature. If Gatekeeper blocks the first launch, right-click the app, select **Open**, and confirm. The app binds to `127.0.0.1`, prefers port `4000`, moves upward when a port is occupied, and opens the selected URL in the default browser.

## Current Checksums

```text
ZIP         fe2e0a36e125e1552214100ff02f064ec4833643a63ce13e4acfb101348b93f6
RAW BINARY  90ad052f8fc9d4d3693289ce794333838959ec293fc0a3e5671b3d057e707e3d
```

The raw arm64 executable is a troubleshooting/build artifact. The `archive/` folder contains an exact preserved duplicate app and should not be published.
