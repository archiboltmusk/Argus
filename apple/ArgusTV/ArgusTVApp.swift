import SwiftUI
import AVKit

struct ArgusMediaItem: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let subtitle: String?
    let kind: String?
    let streamUrl: String?
}

@MainActor
final class ArgusTVStore: ObservableObject {
    @Published var host: String {
        didSet { UserDefaults.standard.set(host, forKey: "argus.tv.host") }
    }
    @Published var items: [ArgusMediaItem] = []
    @Published var statusText = "Ready"
    @Published var activePlayer: AVPlayer?

    init() {
        self.host = UserDefaults.standard.string(forKey: "argus.tv.host") ?? "http://192.168.1.10:3456"
    }

    func refresh() async {
        guard let url = URL(string: "\(host)/api/remote/library") else {
            statusText = "Invalid host URL"
            return
        }
        statusText = "Syncing..."
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            items = try JSONDecoder().decode([ArgusMediaItem].self, from: data)
            statusText = items.isEmpty ? "Connected · Empty Library" : "\(items.count) titles"
        } catch {
            statusText = "Offline"
        }
    }

    func sendCommand(_ cmd: String) async {
        guard let url = URL(string: "\(host)/api/remote/command?cmd=\(cmd)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        _ = try? await URLSession.shared.data(for: req)
    }

    func play(_ item: ArgusMediaItem) {
        guard let raw = item.streamUrl, let url = URL(string: raw) else { return }
        activePlayer = AVPlayer(url: url)
        activePlayer?.play()
    }
}

struct HarborTVShelf: View {
    let title: String
    let items: [ArgusMediaItem]
    let onPlay: (ArgusMediaItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white.opacity(0.92))
            if items.isEmpty {
                Text("No items synced yet — open Argus on Mac to stream.")
                    .font(.callout)
                    .foregroundStyle(.white.opacity(0.55))
                    .padding(.vertical, 24)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 24) {
                        ForEach(items) { item in
                            Button { onPlay(item) } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(item.title)
                                        .font(.headline)
                                        .lineLimit(2)
                                    if let sub = item.subtitle {
                                        Text(sub)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .frame(width: 320, height: 180, alignment: .bottomLeading)
                                .padding(20)
                                .background(
                                    RoundedRectangle(cornerRadius: 18)
                                        .fill(Color.white.opacity(0.08))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 18)
                                                .strokeBorder(Color.white.opacity(0.14), lineWidth: 1)
                                        )
                                )
                            }
                            .buttonStyle(.card)
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }
}

@main
struct ArgusTVApp: App {
    @StateObject private var store = ArgusTVStore()
    private let harborBg = Color(red: 0.07, green: 0.075, blue: 0.09)
    private let harborAccent = Color(red: 0.92, green: 0.69, blue: 0.42)

    var body: some Scene {
        WindowGroup {
            TabView {
                ScrollView {
                    VStack(alignment: .leading, spacing: 36) {
                        HStack {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("ARGUS")
                                    .font(.largeTitle.bold())
                                    .foregroundStyle(.white)
                                Text(store.statusText)
                                    .font(.callout)
                                    .foregroundStyle(.white.opacity(0.65))
                            }
                            Spacer()
                            Button("Sync Mac") { Task { await store.refresh() } }
                                .buttonStyle(.borderedProminent)
                                .tint(harborAccent)
                        }

                        HarborTVShelf(title: "Continue Watching", items: store.items, onPlay: store.play)
                        HarborTVShelf(
                            title: "Movies",
                            items: store.items.filter { ($0.kind ?? "movie") == "movie" },
                            onPlay: store.play
                        )
                        HarborTVShelf(
                            title: "Shows",
                            items: store.items.filter { $0.kind == "series" },
                            onPlay: store.play
                        )
                    }
                    .padding(48)
                }
                .background(harborBg.ignoresSafeArea())
                .tabItem { Label("Home", systemImage: "house.fill") }

                VStack(spacing: 28) {
                    Text("Mac Remote & Host")
                        .font(.title.bold())
                    TextField("Mac Argus URL (e.g. http://192.168.1.10:3456)", text: $store.host)
                        .padding(14)
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
                    HStack(spacing: 24) {
                        Button("Previous") { Task { await store.sendCommand("previous") } }
                        Button("Play / Pause") { Task { await store.sendCommand("playpause") } }
                            .buttonStyle(.borderedProminent)
                            .tint(harborAccent)
                        Button("Next") { Task { await store.sendCommand("next") } }
                    }
                }
                .padding(60)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(harborBg.ignoresSafeArea())
                .tabItem { Label("Remote", systemImage: "appletvremote.gen4.fill") }
            }
            .fullScreenCover(isPresented: Binding(
                get: { store.activePlayer != nil },
                set: { if !$0 { store.activePlayer?.pause(); store.activePlayer = nil } }
            )) {
                if let player = store.activePlayer {
                    VideoPlayer(player: player).ignoresSafeArea()
                }
            }
            .task { await store.refresh() }
        }
    }
}
