cask "argus" do
  version "3.17.23"
  sha256 "a33e1f41c2d3d30cc69aae2fcb992a7b7f461713ddd602670f6750052692502b"

  url "https://github.com/archiboltmusk/Argus/releases/download/v#{version}/Argus-aarch64.dmg"
  name "Argus"
  desc "Open-source media player and library for streams, local files, and add-ons"
  homepage "https://github.com/archiboltmusk/Argus"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on arch: :arm64
  depends_on macos: ">= :ventura"

  app "Argus.app"

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/Argus.app"],
                   sudo: false
    system_command "/usr/bin/codesign",
                   args: ["--force", "--deep", "--sign", "-", "#{appdir}/Argus.app"],
                   sudo: false
  end

  zap trash: [
    "~/Library/Application Support/app.argus.desktop",
    "~/Library/Caches/app.argus.desktop",
    "~/Library/Logs/app.argus.desktop",
    "~/Library/Preferences/app.argus.desktop.plist",
    "~/Library/WebKit/app.argus.desktop",
  ]
end
