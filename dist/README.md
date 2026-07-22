# Self-Contained Releases

These folders contain prebuilt releases that do not require Node.js, npm, Git, or the source tree.

## Windows x64

Use `windows-x64/Check-Point-Trusted-Access-Review-Windows-x64.exe`, or distribute the matching ZIP. See the platform README for instructions and checksums.

## macOS Apple Silicon

Distribute `macos-apple-silicon/Check-Point-Trusted-Access-Review-macOS-Apple-Silicon.zip`. Users should extract the ZIP and open `Check Point Trusted Access Review.app`. See the platform README for Gatekeeper instructions and checksums.

## GitHub Guidance

Attach the platform ZIP files to a GitHub Release instead of asking users to clone the repository. The source tree and `node_modules` are not required to run either release.

The extracted macOS app, raw arm64 binary, duplicate app, old Windows ZIP, and standalone Windows executable are retained locally for testing and troubleshooting. The two current platform ZIPs are the clearest public download artifacts.
