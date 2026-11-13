import SwiftUI

@MainActor
final class ArgusWatchRemoteStore: ObservableObject {
    @Published var host: String {
        didSet { UserDefaults.standard.set(host, forKey: "argus.watch.host") }
    }
    @Published var title = "Argus"
    @Published var playing = false
    @Published var volume: Double = 70

    init() {
        self.host = UserDefaults.standard.string(forKey: "argus.watch.host") ?? "http://192.168.1.10:3456"
    }

    func send(_ command: String) async {
        guard let url = URL(string: "\(host)/api/remote/command?cmd=\(command)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        _ = try? await URLSession.shared.data(for: req)
        if command == "playpause" { playing.toggle() }
    }

    func setVolume(_ value: Double) async {
        let clamped = Int(max(0, min(100, value.rounded())))
        guard let url = URL(string: "\(host)/api/remote/volume?value=\(clamped)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        _ = try? await URLSession.shared.data(for: req)
    }
}

@main
struct ArgusWatchApp: App {
    @StateObject private var store = ArgusWatchRemoteStore()
    private let harborAccent = Color(red: 0.92, green: 0.69, blue: 0.42)

    var body: some Scene {
        WindowGroup {
            TabView {
                VStack(spacing: 10) {
                    Text(store.title)
                        .font(.headline)
                        .lineLimit(1)

                    HStack(spacing: 12) {
                        Button { Task { await store.send("seek-back") } } label: {
                            Image(systemName: "gobackward.15")
                        }
                        Button { Task { await store.send("playpause") } } label: {
                            Image(systemName: store.playing ? "pause.fill" : "play.fill")
                        }
                        .tint(harborAccent)
                        Button { Task { await store.send("seek-fwd") } } label: {
                            Image(systemName: "goforward.15")
                        }
                    }

                    HStack(spacing: 16) {
                        Button { Task { await store.send("previous") } } label: {
                            Image(systemName: "backward.fill")
                        }
                        Button { Task { await store.send("next") } } label: {
                            Image(systemName: "forward.fill")
                        }
                    }

                    ProgressView(value: store.volume, total: 100)
                        .tint(harborAccent)
                    Text("Volume \(Int(store.volume))%")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .focusable()
                .digitalCrownRotation($store.volume, from: 0, through: 100, by: 2, sensitivity: .medium)
                .onChange(of: store.volume) { next in
                    Task { await store.setVolume(next) }
                }

                VStack(spacing: 10) {
                    Text("Quick Actions")
                        .font(.headline)
                    Button("Mute / Unmute") { Task { await store.setVolume(store.volume > 0 ? 0 : 70) } }
                        .tint(harborAccent)
                    Button("Stop Playback") { Task { await store.send("stop") } }
                }
                .padding()
            }
            .tabViewStyle(.page)
        }
    }
}
