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

    var body: some Scene {
        WindowGroup {
            VStack(spacing: 12) {
                Text(store.title)
                    .font(.headline)
                    .lineLimit(1)

                HStack(spacing: 14) {
                    Button { Task { await store.send("seek-back") } } label: {
                        Image(systemName: "gobackward.15")
                    }
                    Button { Task { await store.send("playpause") } } label: {
                        Image(systemName: store.playing ? "pause.fill" : "play.fill")
                    }
                    .tint(Color(red: 0.92, green: 0.69, blue: 0.42))
                    Button { Task { await store.send("seek-fwd") } } label: {
                        Image(systemName: "goforward.15")
                    }
                }

                HStack(spacing: 18) {
                    Button { Task { await store.send("previous") } } label: {
                        Image(systemName: "backward.fill")
                    }
                    Button { Task { await store.send("next") } } label: {
                        Image(systemName: "forward.fill")
                    }
                }

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
        }
    }
}
